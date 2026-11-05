const express = require('express');
const { encryptToken, decryptToken, verifyMetaSignature } = require('./services/crypto');
const { getSupabaseClient } = require('./services/supabase');
const {
  getFacebookLoginUrl,
  exchangeCodeForUserToken,
  getUserPages,
  subscribePageToApp,
  getPageConversations,
  getPageMessages,
  sendPageReply,
} = require('./services/facebook');
const { getMumeAiReply, buildSessionSummary, detectTopic, isApprovalConfirmation, asksAboutInquiries, buildPendingStatusReply, buildConfirmationSentReply, matchCatalogItem, buildCatalogContext, buildAssistantSystemPrompt, formatMoney } = require('./services/ai');
const { isMuseConfigured, getMuseChatReply, transcribeMuseAudio, stripDataUrlPrefix } = require('./services/muse');

/**
 * Escapes a string for safe interpolation into HTML responses.
 */
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

/**
 * Parses a comma-separated allowlist env var into an array of origins.
 */
function parseOriginAllowlist(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Returns true when an Origin header is permitted by ALLOWED_ORIGINS.
 * When no allowlist is configured, non-production environments allow the
 * origin for local development; production fails closed.
 */
function isOriginAllowed(origin, env) {
  if (!origin) return false;
  const allowed = parseOriginAllowlist(env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN);
  if (allowed.length > 0) return allowed.includes(origin);
  return env.NODE_ENV !== 'production';
}

/**
 * Builds the Express app.
 */
function createApp(env = process.env) {
  const app = express();
  app.set('trust proxy', true);

  // Normalize duplicate leading slashes (e.g. //api/pages -> /api/pages)
  // when a client's API_BASE_URL ends with a trailing slash.
  app.use((req, _res, next) => {
    if (req.url && req.url.startsWith('//')) {
      req.url = req.url.replace(/^\/+/, '/');
    }
    next();
  });

  // Capture rawBody for Meta webhook signature verification.
  // The limit covers base64 voice clips posted to /api/voice/transcribe;
  // the transcription service enforces its own stricter byte cap.
  app.use(
    express.json({
      limit: '8mb',
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  // Enable CORS only for explicitly allowed origins. When ALLOWED_ORIGINS
  // is unset, non-production environments echo the request origin for local
  // development; production sends no CORS headers (fail closed).
  app.use((req, res, next) => {
    const origin = req.get('origin');
    if (origin && isOriginAllowed(origin, env)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, x-api-key, x-hub-signature-256'
    );
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  const apiKey = env.API_KEY || env.MUME_API_KEY;
  let apiKeyOpenWarningLogged = false;

  // Require an API key for backend data endpoints when configured.
  // Clients send it as `x-api-key` (or `Authorization: Bearer <key>`).
  // Without a configured key, non-production stays open for local
  // development while production fails closed.
  function requireApiKey(req, res, next) {
    if (!apiKey) {
      if (env.NODE_ENV === 'production') {
        return res.status(500).json({ error: 'API_KEY not configured on server' });
      }
      if (!apiKeyOpenWarningLogged) {
        apiKeyOpenWarningLogged = true;
        console.warn('[auth] API_KEY not configured - /api/* endpoints are open (development only)');
      }
      return next();
    }
    const headerKey = req.get('x-api-key');
    const bearerKey = (req.get('authorization') || '').replace(/^bearer\s+/i, '');
    if ((headerKey && headerKey === apiKey) || (bearerKey && bearerKey === apiKey)) {
      return next();
    }
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  app.use('/api', requireApiKey);

  const supabase = getSupabaseClient(env);

  // Page record + catalog lookup. Products carry the business identity:
  // whatever the merchant sells, Muse grounds replies in these rows.
  async function getPageRecord(pageId) {
    if (!pageId || !supabase) return null;
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pageId);
      const query = isUuid
        ? supabase.from('pages').select('id,page_name').eq('id', pageId)
        : supabase.from('pages').select('id,page_name').eq('fb_page_id', pageId);
      const { data } = await query.maybeSingle();
      return data || null;
    } catch {
      return null;
    }
  }

  async function getPageCatalog(page) {
    if (!page || !supabase) return [];
    try {
      const { data } = await supabase
        .from('products')
        .select('id,name,price,unit')
        .eq('page_id', page.id)
        .order('name');
      return data || [];
    } catch {
      return [];
    }
  }

  // Merchant assistant reply: Muse Spark chat model first when
  // META_MODEL_API_KEY is configured, rule-based reply as the fallback
  // so chat keeps working offline or when the model call fails. Both
  // paths receive the page catalog, so Muse adopts the merchant's
  // actual business instead of answering from demo inventory.
  async function resolveAssistantReply(text, history, opts) {
    const o = opts || {};
    const catalog = Array.isArray(o.catalog) ? o.catalog : [];
    const system = buildAssistantSystemPrompt({
      storeName: o.storeName,
      catalogContext: buildCatalogContext(catalog),
    });
    if (isMuseConfigured(env)) {
      try {
        const messages = (Array.isArray(history) ? history : [])
          .slice(-20)
          .filter((m) => m && m.text)
          .map((m) => ({
            role: m.sender === 'mume' ? 'assistant' : 'user',
            content: String(m.text),
          }));
        messages.push({ role: 'user', content: String(text) });
        return await getMuseChatReply({ system, messages, env });
      } catch (err) {
        console.warn('[muse-chat] Falling back to rule-based reply:', err.message);
      }
    }
    return getMumeAiReply(text, { history, catalog });
  }

  // Helper for webhook verification
  const handleWebhookVerification = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const expected = (env.FB_VERIFY_TOKEN || '').trim();

    if (mode === 'subscribe' && expected && (token || '').trim() === expected) {
      console.log('[webhook-verify] Verified challenge:', challenge);
      return res.status(200).send(String(challenge ?? ''));
    }
    console.warn('[webhook-verify] Failed verification. mode:', mode, 'token:', token);
    return res.sendStatus(403);
  };

  // Health check & fallback webhook verification at root path
  app.get('/', (req, res) => {
    if (req.query['hub.mode'] === 'subscribe') {
      return handleWebhookVerification(req, res);
    }
    res.json({ name: 'mume-backend', status: 'ok', version: '0.1.0' });
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/privacy', (_req, res) => {
    res.type('html').send(`<!DOCTYPE html><html><head><title>Privacy Policy - Mume</title></head><body style="font-family:sans-serif;padding:24px;max-width:600px;margin:auto;"><h2>Privacy Policy for Mume</h2><p>Mume accesses Facebook Page messaging solely to assist authorized Page administrators in viewing customer inquiries and drafting confirmed responses. No customer information is sold or transferred to third parties.</p><p>For inquiries, contact support.</p></body></html>`);
  });

  app.get('/data-deletion', (_req, res) => {
    res.type('html').send(`<!DOCTYPE html><html><head><title>Data Deletion - Mume</title></head><body style="font-family:sans-serif;padding:24px;max-width:600px;margin:auto;"><h2>User Data Deletion Instructions</h2><p>To request deletion of your Page connection data, unlink your Page inside the Mume mobile application or email support with your Facebook Page ID.</p></body></html>`);
  });

  // Facebook webhook verification handshake on /webhook
  app.get('/webhook', handleWebhookVerification);

  // Rejects requests with a missing/invalid Meta signature. Returns true
  // when the request was rejected (caller must stop), false when verified.
  // Signature verification is mandatory: without FB_APP_SECRET the endpoint
  // fails closed instead of accepting unverified payloads.
  function rejectBadWebhookSignature(req, res) {
    const signature = req.get('x-hub-signature-256');
    if (!env.FB_APP_SECRET) {
      console.warn('[webhook] Rejected: FB_APP_SECRET not configured - failing closed');
      res.sendStatus(401);
      return true;
    }
    if (!signature || !req.rawBody || !verifyMetaSignature(req.rawBody, signature, env.FB_APP_SECRET)) {
      console.warn('[webhook] Rejected missing or invalid X-Hub-Signature-256');
      res.sendStatus(401);
      return true;
    }
    return false;
  }

  // Shared async worker: persists verified page events to Supabase.
  // It always runs after the fast 200 ACK, so Meta never waits on DB I/O.
  function queuePageWebhook(body) {
    // Asynchronously process events and persist to Supabase
    setImmediate(async () => {
      try {
        if (body?.object === 'page' && Array.isArray(body.entry)) {
          for (const entry of body.entry) {
            console.log('[webhook] Event from page_id=%s time=%s', entry.id, entry.time);
            if (!supabase) continue;

            const messaging = Array.isArray(entry.messaging) ? entry.messaging : [];
            for (const event of messaging) {
              const senderPsid = event.sender?.id;
              const recipientId = event.recipient?.id;
              const messageText = event.message?.text;
              const fbMsgId = event.message?.mid;

              if (senderPsid && messageText && recipientId) {
                // Find linked page
                const { data: page } = await supabase
                  .from('pages')
                  .select('id,page_name')
                  .eq('fb_page_id', recipientId)
                  .single();

                if (page) {
                  // Upsert conversation
                  const { data: conv } = await supabase
                    .from('conversations')
                    .upsert(
                      {
                        page_id: page.id,
                        customer_psid: senderPsid,
                        last_message_at: new Date().toISOString(),
                      },
                      { onConflict: 'page_id,customer_psid' }
                    )
                    .select('id')
                    .single();

                  if (conv) {
                    await supabase.from('messages').insert({
                      conversation_id: conv.id,
                      fb_message_id: fbMsgId,
                      sender: 'customer',
                      text: messageText,
                      is_from_customer: true,
                    });

                    // Draft the reply from the store's own catalog so Muse
                    // adopts any business; the merchant still approves first.
                    const { data: catalogProducts } = await supabase
                      .from('products')
                      .select('id,name,price,unit')
                      .eq('page_id', page.id);
                    const matchedItem = matchCatalogItem(messageText, catalogProducts || []);
                    const lower = messageText.toLowerCase();
                    const isPriceInquiry =
                      !!matchedItem ||
                      lower.includes('magkano') ||
                      lower.includes('price') ||
                      lower.includes('how much') ||
                      lower.includes('order') ||
                      lower.includes('buy') ||
                      lower.includes('bili') ||
                      lower.includes('apple') ||
                      lower.includes('mango') ||
                      lower.includes('manga') ||
                      lower.includes('banana') ||
                      lower.includes('saging') ||
                      lower.includes('available');

                    if (isPriceInquiry) {
                      let draft;
                      let suggestedPrice = null;
                      if (matchedItem) {
                        const unit = matchedItem.unit || 'piece';
                        draft = matchedItem.name + ' are ' + formatMoney(matchedItem.price) + ' per ' + unit + ". Let us know how much you'd like!";
                        const num = Number(matchedItem.price);
                        suggestedPrice = Number.isFinite(num) ? num : null;
                      } else {
                        draft = 'Thanks for messaging ' + (page.page_name || 'us') + "! We'll confirm price and availability for you shortly.";
                      }

                      await supabase.from('pending_actions').insert({
                        conversation_id: conv.id,
                        draft_reply: draft,
                        suggested_price: suggestedPrice,
                        status: 'waiting_approval',
                      });
                    }

                    // Session memory: AI thread reference for the customer's next message
                    try {
                      const topic = matchedItem ? matchedItem.name : detectTopic(messageText);
                      await supabase.from('conversation_sessions').upsert(
                        {
                          conversation_id: conv.id,
                          summary: topic
                            ? `Customer inquiry about ${topic}. Draft reply awaiting merchant approval.`
                            : 'Customer inquiry awaiting merchant approval.',
                          last_customer_topic: topic || 'general',
                          last_activity_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                        },
                        { onConflict: 'conversation_id' }
                      );
                    } catch (sessErr) {
                      console.warn('[webhook-session] Warning:', sessErr.message);
                    }
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('[webhook-worker] Error processing events:', err.message);
      }
    });
  }

  // Facebook webhook events (incoming messages, postbacks, feed comments)
  app.post('/webhook', (req, res) => {
    if (rejectBadWebhookSignature(req, res)) return;

    // Fast 200 ACK to Meta within < 5 seconds
    res.status(200).send('EVENT_RECEIVED');
    queuePageWebhook(req.body);
  });

  // Meta POSTs every event to the single callback URL in the app dashboard.
  // If that URL is the site root instead of /webhook, page events land here:
  // verify them exactly like /webhook and process them instead of ACK-and-drop.
  app.post('/', (req, res, next) => {
    if (req.body && req.body.object === 'page') {
      if (rejectBadWebhookSignature(req, res)) return;
      res.status(200).send('EVENT_RECEIVED');
      queuePageWebhook(req.body);
      return;
    }
    if (req.body && req.body.object) {
      return res.status(200).send('EVENT_RECEIVED');
    }
    next();
  });

  const getCallbackUrl = (req) => {
    const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
    const host = req.get('host') || 'localhost:3000';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const safeProto = isLocal ? proto : 'https';
    return `${safeProto}://${host}/auth/facebook/callback`;
  };

  // Validates a caller-supplied OAuth redirect_uri. Allowed targets are the
  // server's own callback origin, localhost loopbacks, and origins listed in
  // ALLOWED_REDIRECT_ORIGINS (falling back to ALLOWED_ORIGINS). Anything else
  // is rejected so authorization codes cannot leak to attacker origins.
  const isRedirectUriAllowed = (redirectUri, req) => {
    let parsed;
    try {
      parsed = new URL(String(redirectUri));
    } catch {
      return false;
    }
    const isLoopback = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (parsed.protocol !== 'https:' && !isLoopback) return false;
    if (isLoopback) return true;
    const allowlist = parseOriginAllowlist(env.ALLOWED_REDIRECT_ORIGINS || env.ALLOWED_ORIGINS);
    if (allowlist.includes(parsed.origin)) return true;
    try {
      if (parsed.origin === new URL(getCallbackUrl(req)).origin) return true;
    } catch {
      // Ignore URL construction errors and fall through to rejection.
    }
    return false;
  };

  // 1. GET /auth/facebook/url -> Returns OAuth URL for frontend
  app.get('/auth/facebook/url', (req, res) => {
    const appId = env.FB_APP_ID;
    if (!appId) {
      return res.status(500).json({ error: 'FB_APP_ID not configured on server' });
    }
    const defaultRedirect = getCallbackUrl(req);
    const redirectUri = req.query.redirect_uri || defaultRedirect;
    if (req.query.redirect_uri && !isRedirectUriAllowed(redirectUri, req)) {
      return res.status(400).json({ error: 'redirect_uri not allowed' });
    }
    const url = getFacebookLoginUrl({ appId, redirectUri });
    res.json({ url });
  });

  // 2. GET /auth/facebook/callback -> OAuth return handler
  app.get('/auth/facebook/callback', async (req, res) => {
    const { code, error, error_description: errorDescription } = req.query;
    if (error) {
      return res.status(400).json({ error, error_description: errorDescription });
    }
    if (!code) {
      return res.status(400).json({ error: 'missing_code' });
    }

    try {
      const appId = env.FB_APP_ID;
      const appSecret = env.FB_APP_SECRET;
      const redirectUri = req.query.redirect_uri || getCallbackUrl(req);
      if (req.query.redirect_uri && !isRedirectUriAllowed(redirectUri, req)) {
        return res.status(400).json({ error: 'redirect_uri not allowed' });
      }

      if (!appId || !appSecret) {
        return res.status(500).json({ error: 'FB_APP_ID or FB_APP_SECRET missing on server' });
      }

      // Exchange code for User Access Token
      const tokenData = await exchangeCodeForUserToken({
        code: String(code),
        appId,
        appSecret,
        redirectUri,
      });

      // Fetch user's managed Facebook Pages
      const pages = await getUserPages(tokenData.access_token, appSecret);
      const linkedPages = [];

      if (supabase && pages.length > 0) {
        for (const p of pages) {
          const encryptedToken = encryptToken(p.access_token, env);
          const { data, error: dbErr } = await supabase
            .from('pages')
            .upsert(
              {
                fb_page_id: p.id,
                page_name: p.name,
                page_access_token_encrypted: encryptedToken,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'fb_page_id' }
            )
            .select('id, fb_page_id, page_name')
            .single();

          if (!dbErr && data) {
            linkedPages.push(data);
            // Auto-subscribe page to webhooks
            try {
              await subscribePageToApp(p.id, p.access_token, appSecret);
            } catch (subErr) {
              console.warn('[page-subscribe] Warning:', subErr.message);
            }
          }
        }
      }

      // Return user-friendly HTML/JSON confirmation
      res.type('html').send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Mume - Page Linked</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0F172A; color: #F8FAFC; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; padding: 20px; }
              .card { background: #1E293B; border-radius: 16px; padding: 32px 24px; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155; }
              h1 { color: #10B981; font-size: 24px; margin-bottom: 12px; }
              p { color: #94A3B8; font-size: 15px; line-height: 1.5; }
              .badge { display: inline-block; background: #3B82F6; color: white; padding: 6px 14px; border-radius: 20px; font-weight: bold; margin-top: 16px; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>✓ Page Linked Successfully!</h1>
              <p>Your Facebook Business Page is now connected to Mume with encrypted token security.</p>
              ${linkedPages.map(p => `<div class="badge">${escapeHtml(p.page_name)}</div>`).join('')}
              <p style="margin-top: 24px; font-size: 13px;">You can return to the Mume app now.</p>
            </div>
          </body>
        </html>
      `);
    } catch (err) {
      console.error('[auth-callback] Error:', err.message);
      res.status(500).json({ error: 'Failed to complete Facebook Page linking', details: err.message });
    }
  });

  // 3. POST /api/pages/link-direct -> Direct page linking endpoint (for dev or manual linking)
  app.post('/api/pages/link-direct', async (req, res) => {
    const { fbPageId, pageName, pageAccessToken } = req.body || {};
    if (!fbPageId || !pageName || !pageAccessToken) {
      return res.status(400).json({ error: 'fbPageId, pageName, and pageAccessToken are required' });
    }

    try {
      if (!supabase) {
        return res.status(500).json({ error: 'Supabase client not initialized' });
      }

      const encryptedToken = encryptToken(pageAccessToken, env);
      const { data, error } = await supabase
        .from('pages')
        .upsert(
          {
            fb_page_id: fbPageId,
            page_name: pageName,
            page_access_token_encrypted: encryptedToken,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'fb_page_id' }
        )
        .select('id, fb_page_id, page_name, created_at, updated_at')
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      // Auto-subscribe page to webhooks if app secret is available
      if (env.FB_APP_SECRET) {
        try {
          await subscribePageToApp(fbPageId, pageAccessToken, env.FB_APP_SECRET);
        } catch (subErr) {
          console.warn('[link-direct] Subscribe warning:', subErr.message);
        }
      }

      res.json({ status: 'ok', page: data });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. GET /api/pages -> Lists linked pages
  app.get('/api/pages', async (_req, res) => {
    try {
      if (!supabase) {
        return res.status(500).json({ error: 'Supabase client not initialized' });
      }
      const { data, error } = await supabase
        .from('pages')
        .select('id, fb_page_id, page_name, created_at, updated_at');

      if (error) {
        return res.status(500).json({ error: error.message });
      }
      res.json({ pages: data || [] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. GET /api/pages/:pageId/inbox -> Reads conversations from Graph API
  app.get('/api/pages/:pageId/inbox', async (req, res) => {
    const { pageId } = req.params;
    try {
      if (!supabase) {
        return res.status(500).json({ error: 'Supabase client not initialized' });
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pageId);
      const query = isUuid
        ? supabase.from('pages').select('*').eq('id', pageId)
        : supabase.from('pages').select('*').eq('fb_page_id', pageId);
      const { data: page, error } = await query.single();

      if (error || !page) {
        return res.status(404).json({ error: 'Page not found' });
      }

      const plainToken = decryptToken(page.page_access_token_encrypted, env);
      const conversations = await getPageConversations(
        page.fb_page_id,
        plainToken,
        env.FB_APP_SECRET,
        Number(req.query.limit) || 10
      );

      res.json({ page: { id: page.id, name: page.page_name }, conversations });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. GET /api/pages/:pageId/conversations/:conversationId/messages -> Reads thread messages
  app.get('/api/pages/:pageId/conversations/:conversationId/messages', async (req, res) => {
    const { pageId, conversationId } = req.params;
    try {
      if (!supabase) {
        return res.status(500).json({ error: 'Supabase client not initialized' });
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pageId);
      const query = isUuid
        ? supabase.from('pages').select('*').eq('id', pageId)
        : supabase.from('pages').select('*').eq('fb_page_id', pageId);
      const { data: page, error } = await query.single();

      if (error || !page) {
        return res.status(404).json({ error: 'Page not found' });
      }

      const plainToken = decryptToken(page.page_access_token_encrypted, env);
      const messages = await getPageMessages(
        conversationId,
        plainToken,
        env.FB_APP_SECRET,
        Number(req.query.limit) || 20
      );

      res.json({ conversationId, messages });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. POST /api/pages/:pageId/messages/reply -> Send approved reply to customer
  app.post('/api/pages/:pageId/messages/reply', async (req, res) => {
    const { pageId } = req.params;
    const { psid, text, lastCustomerMessageAt, approvalStatus } = req.body || {};

    if (!psid || !text) {
      return res.status(400).json({ error: 'psid and text are required' });
    }

    // Human-in-the-loop gate: a missing approvalStatus must not auto-approve.
    if (approvalStatus !== 'approved') {
      return res.status(403).json({ error: 'COMPLIANCE_BLOCK: Outbound message requires human approval' });
    }

    try {
      if (!supabase) {
        return res.status(500).json({ error: 'Supabase client not initialized' });
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pageId);
      const query = isUuid
        ? supabase.from('pages').select('*').eq('id', pageId)
        : supabase.from('pages').select('*').eq('fb_page_id', pageId);
      const { data: page, error } = await query.single();

      if (error || !page) {
        return res.status(404).json({ error: 'Page not found' });
      }

      const plainToken = decryptToken(page.page_access_token_encrypted, env);
      const result = await sendPageReply({
        pageId: page.fb_page_id,
        pageAccessToken: plainToken,
        appSecret: env.FB_APP_SECRET,
        psid,
        text,
        lastCustomerMessageAt,
        approvalStatus,
      });

      // Persist outbound reply to Supabase messages & update conversation/pending_actions
      let convId = null;
      try {
        const { data: conv } = await supabase
          .from('conversations')
          .upsert(
            {
              page_id: page.id,
              customer_psid: psid,
              last_message_at: new Date().toISOString(),
            },
            { onConflict: 'page_id,customer_psid' }
          )
          .select('id')
          .single();

        if (conv) {
          convId = conv.id;
          await supabase.from('messages').insert({
            conversation_id: conv.id,
            fb_message_id: result?.message_id || `reply-${Date.now()}`,
            sender: 'page',
            text,
            is_from_customer: false,
          });

          await supabase
            .from('pending_actions')
            .update({
              status: 'sent',
              updated_at: new Date().toISOString(),
            })
            .eq('conversation_id', conv.id)
            .eq('status', 'waiting_approval');
        }
      } catch (dbErr) {
        console.warn('[reply-persist] Warning:', dbErr.message);
      }

      res.json({ status: 'sent', result, conversationId: convId });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // 8. GET /api/chat/messages -> Fetch AI assistant conversation & chat history from Supabase
  app.get('/api/chat/messages', async (req, res) => {
    try {
      if (!supabase) {
        return res.json({
          conversationId: 'offline-mock-convo',
          messages: [
            {
              id: 'welcome-1',
              sender: 'mume',
              text: "Hi Jefferson! I'm Mume, your store assistant. You can write any message to me here or tap mic to talk.",
              time: 'Just now',
              created_at: new Date().toISOString(),
            },
          ],
        });
      }

      let pageId = req.query.pageId;
      if (!pageId) {
        const { data: firstPage } = await supabase.from('pages').select('id').limit(1).maybeSingle();
        pageId = firstPage?.id;
      }

      if (!pageId) {
        return res.json({ conversationId: null, messages: [] });
      }

      // Find or create AI assistant conversation. Atomic upsert: concurrent
      // first-loads (double mount, refresh + poll) must not race into a
      // duplicate-key 500 the way find-then-insert does.
      let conv = null;
      try {
        const { data, error: upsertErr } = await supabase
          .from('conversations')
          .upsert(
            {
              page_id: pageId,
              customer_psid: 'mume_assistant',
              customer_name: 'Mume AI Assistant',
            },
            { onConflict: 'page_id,customer_psid' }
          )
          .select('id')
          .single();
        if (upsertErr) throw upsertErr;
        conv = data;
      } catch (upsertEx) {
        // Extreme concurrent-insert race: fall back to reading the winner.
        const msg = upsertEx?.message || '';
        if (upsertEx?.code === '23505' || /duplicate key|already exists/i.test(msg)) {
          const { data } = await supabase
            .from('conversations')
            .select('id')
            .eq('page_id', pageId)
            .eq('customer_psid', 'mume_assistant')
            .maybeSingle();
          conv = data;
        } else {
          throw upsertEx;
        }
      }
      if (!conv) throw new Error('Failed to load assistant conversation');

      // Seed initial greeting message once (best effort; a doubled seed
      // from a dead-even race is cosmetic and self-heals via TTL).
      const { count: existingCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id);
      if (!existingCount) {
        await supabase.from('messages').insert({
          conversation_id: conv.id,
          sender: 'mume',
          text: "Hi Jefferson! I'm Mume, your store assistant. You can write any message to me here or tap mic to talk.",
          is_from_customer: false,
        });
      }

      const { data: dbMessages, error: msgErr } = await supabase
        .from('messages')
        .select('id, sender, text, created_at, is_from_customer')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });

      if (msgErr) throw msgErr;

      res.json({
        conversationId: conv.id,
        messages: (dbMessages || []).map((m) => ({
          id: m.id,
          sender: m.sender === 'customer' ? 'user' : m.sender,
          text: m.text,
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          created_at: m.created_at,
        })),
      });
    } catch (err) {
      console.error('[get-chat-messages] Error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // 9. POST /api/chat/messages -> Send message to AI assistant, save both user and AI messages to Supabase
  app.post('/api/chat/messages', async (req, res) => {
    const { pageId: reqPageId, text } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }

    const trimmed = text.trim();

    // Voice/chat confirmations ("yes, send it") and live inquiry status.
    // A confirmation IS the human approval, so matching waiting replies are
    // dispatched here through the same helper as the approve endpoint.
    let confirmedReply = null;
    if (supabase) {
      try {
        let chatPageId = reqPageId;
        if (!chatPageId) {
          const { data: firstPage } = await supabase.from('pages').select('id').limit(1).maybeSingle();
          chatPageId = firstPage?.id || null;
        }
        if (chatPageId) {
          const chatIsUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chatPageId);
          const chatPageQuery = chatIsUuid
            ? supabase.from('pages').select('id').eq('id', chatPageId)
            : supabase.from('pages').select('id').eq('fb_page_id', chatPageId);
          const { data: chatPage } = await chatPageQuery.maybeSingle();
          if (chatPage) {
            const { data: chatConvs } = await supabase
              .from('conversations')
              .select('id, customer_name')
              .eq('page_id', chatPage.id)
              .neq('customer_psid', 'mume_assistant');
            const chatConvIds = (chatConvs || []).map((c) => c.id);
            const chatNameByConv = {};
            for (const c of chatConvs || []) chatNameByConv[c.id] = c.customer_name || 'Customer';
            let chatPending = [];
            if (chatConvIds.length > 0) {
              const { data: waiting } = await supabase
                .from('pending_actions')
                .select('id, conversation_id, draft_reply')
                .in('conversation_id', chatConvIds)
                .eq('status', 'waiting_approval')
                .order('created_at', { ascending: true });
              chatPending = (waiting || []).map((a) => ({ ...a, customer_name: chatNameByConv[a.conversation_id] || 'Customer' }));
            }
            if (chatPending.length > 0 && isApprovalConfirmation(trimmed)) {
              const sentTo = [];
              for (const cp of chatPending) {
                const dispatched = await dispatchPendingApproval(cp.id);
                sentTo.push({ customer_name: cp.customer_name, replyText: dispatched.replyText });
              }
              confirmedReply = buildConfirmationSentReply(sentTo);
            } else if (asksAboutInquiries(trimmed)) {
              confirmedReply = buildPendingStatusReply(chatPending);
            }
          }
        }
      } catch (confirmErr) {
        console.warn('[chat-confirm] Warning:', confirmErr.message);
      }
    }

    const replyText = confirmedReply || (await resolveAssistantReply(trimmed, []));

    if (!supabase) {
      return res.json({
        userMessage: {
          id: `user-${Date.now()}`,
          sender: 'user',
          text: trimmed,
          time: 'Just now',
          created_at: new Date().toISOString(),
        },
        aiMessage: {
          id: `ai-${Date.now()}`,
          sender: 'mume',
          text: replyText,
          time: 'Just now',
          created_at: new Date().toISOString(),
        },
      });
    }

    try {
      let pageId = reqPageId;
      if (!pageId) {
        const { data: firstPage } = await supabase.from('pages').select('id').limit(1).maybeSingle();
        pageId = firstPage?.id;
      }

      if (!pageId) {
        return res.status(404).json({ error: 'No linked Facebook page found' });
      }

      // Upsert conversation for AI Assistant
      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .upsert(
          {
            page_id: pageId,
            customer_psid: 'mume_assistant',
            customer_name: 'Mume AI Assistant',
            last_message_at: new Date().toISOString(),
          },
          { onConflict: 'page_id,customer_psid' }
        )
        .select('id')
        .single();

      if (convErr || !conv) {
        throw new Error(convErr?.message || 'Failed to locate assistant conversation');
      }

      // Load recent thread history so the reply has session reference
      let history = [];
      try {
        const { data: recent } = await supabase
          .from('messages')
          .select('sender, text')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(20);
        history = (recent || []).reverse();
      } catch (histErr) {
        console.warn('[chat-history] Warning:', histErr.message);
      }
      const chatPage = await getPageRecord(pageId);
      const chatCatalog = await getPageCatalog(chatPage);
      const contextReply =
        confirmedReply ||
        (await resolveAssistantReply(trimmed, history, {
          catalog: chatCatalog,
          storeName: chatPage ? chatPage.page_name : undefined,
        }));

      // Insert User Message into Supabase
      const { data: userMsg, error: userMsgErr } = await supabase
        .from('messages')
        .insert({
          conversation_id: conv.id,
          sender: 'user',
          text: trimmed,
          is_from_customer: false,
        })
        .select('id, sender, text, created_at')
        .single();

      if (userMsgErr) throw userMsgErr;

      // Insert AI Assistant Reply into Supabase
      const { data: aiMsg, error: aiMsgErr } = await supabase
        .from('messages')
        .insert({
          conversation_id: conv.id,
          sender: 'mume',
          text: contextReply,
          is_from_customer: false,
        })
        .select('id, sender, text, created_at')
        .single();

      if (aiMsgErr) throw aiMsgErr;

      // Persist session memory so the next reply has thread reference
      try {
        const sessionHistory = [
          ...history,
          { sender: 'user', text: trimmed },
          { sender: 'mume', text: contextReply },
        ];
        await supabase.from('conversation_sessions').upsert(
          {
            conversation_id: conv.id,
            summary: buildSessionSummary(sessionHistory, chatCatalog),
            last_customer_topic: detectTopic(trimmed) || 'general',
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'conversation_id' }
        );
      } catch (sessErr) {
        console.warn('[session-upsert] Warning:', sessErr.message);
      }

      res.json({
        conversationId: conv.id,
        userMessage: {
          id: userMsg.id,
          sender: 'user',
          text: userMsg.text,
          time: 'Just now',
          created_at: userMsg.created_at,
        },
        aiMessage: {
          id: aiMsg.id,
          sender: 'mume',
          text: aiMsg.text,
          time: 'Just now',
          created_at: aiMsg.created_at,
        },
      });
    } catch (err) {
      console.error('[post-chat-message] Error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // 9b. POST /api/voice/transcribe -> Speech-to-text for merchant voice input.
  // Body: { audio: base64 string, mimeType?: string, language?: string }.
  // Requires META_MODEL_API_KEY; never fabricates a transcript on failure.
  app.post('/api/voice/transcribe', async (req, res) => {
    const { audio } = req.body || {};
    if (!audio || typeof audio !== 'string') {
      return res.status(400).json({ error: 'audio (base64) is required' });
    }

    try {
      // Some clients send a full `data:...;base64,...` URL; decoding the
      // prefix as base64 yields 14 garbage bytes, so strip it first.
      const bytes = Buffer.from(stripDataUrlPrefix(audio), 'base64');
      if (bytes.length === 0) {
        console.warn('[voice-transcribe] Rejected: empty audio after decode (raw head:', JSON.stringify(String(audio).slice(0, 48)), ')');
        return res.status(400).json({ error: 'Invalid base64 audio' });
      }
      const text = await transcribeMuseAudio({ audio: bytes, env });
      res.json({ text });
    } catch (err) {
      const status = /not configured/i.test(err.message) ? 500 : 502;
      if (status === 502) {
        console.warn('[voice-transcribe] Upstream failure:', err.message, 'raw head:', JSON.stringify(String(audio).slice(0, 48)));
      }
      res.status(status).json({ error: err.message });
    }
  });

  // 10. GET /api/pages/:pageId/conversations -> List customer conversations from Supabase
  app.get('/api/pages/:pageId/conversations', async (req, res) => {
    const { pageId } = req.params;
    try {
      if (!supabase) {
        return res.json({ conversations: [] });
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pageId);
      const query = isUuid
        ? supabase.from('pages').select('id').eq('id', pageId)
        : supabase.from('pages').select('id').eq('fb_page_id', pageId);
      const { data: page } = await query.maybeSingle();

      if (!page) {
        return res.status(404).json({ error: 'Page not found' });
      }

      const { data: convs, error } = await supabase
        .from('conversations')
        .select(`
          id,
          customer_psid,
          customer_name,
          last_message_at,
          created_at
        `)
        .eq('page_id', page.id)
        .neq('customer_psid', 'mume_assistant')
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const convList = convs || [];
      const latestByConv = {};
      if (convList.length > 0) {
        const ids = convList.map((c) => c.id);
        const { data: msgs } = await supabase
          .from('messages')
          .select('id, conversation_id, sender, text, is_from_customer, created_at')
          .in('conversation_id', ids)
          .order('created_at', { ascending: false });

        for (const m of msgs || []) {
          if (!latestByConv[m.conversation_id]) {
            latestByConv[m.conversation_id] = m;
          }
        }
      }

      const enriched = convList.map((c) => {
        const latest = latestByConv[c.id] || null;
        return {
          ...c,
          latest_message: latest,
          last_message_text: latest?.text || null,
          unread: Boolean(latest?.is_from_customer),
        };
      });

      res.json({ conversations: enriched });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 10b. GET /api/conversations/:conversationId/messages -> List stored messages for a conversation via service_role
  app.get('/api/conversations/:conversationId/messages', async (req, res) => {
    const { conversationId } = req.params;
    try {
      if (!supabase) {
        return res.json({ conversationId, messages: [] });
      }

      const { data: msgs, error } = await supabase
        .from('messages')
        .select('id, conversation_id, fb_message_id, sender, text, is_from_customer, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      res.json({ conversationId, messages: msgs || [] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 11. GET /api/pages/:pageId/pending-actions -> List pending customer reply approval cards
  app.get('/api/pages/:pageId/pending-actions', async (req, res) => {
    const { pageId } = req.params;
    try {
      if (!supabase) return res.json({ pendingActions: [] });

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pageId);
      const query = isUuid
        ? supabase.from('pages').select('id').eq('id', pageId)
        : supabase.from('pages').select('id').eq('fb_page_id', pageId);
      const { data: page } = await query.maybeSingle();

      if (!page) return res.status(404).json({ error: 'Page not found' });

      const { data: pageConvs } = await supabase
        .from('conversations')
        .select('id, customer_psid, customer_name, last_message_at')
        .eq('page_id', page.id);

      const convMap = {};
      for (const c of pageConvs || []) {
        convMap[c.id] = c;
      }
      const convIds = Object.keys(convMap);
      if (convIds.length === 0) {
        return res.json({ pendingActions: [] });
      }

      const { data: actions, error } = await supabase
        .from('pending_actions')
        .select(`
          id,
          conversation_id,
          draft_reply,
          suggested_price,
          status,
          created_at,
          updated_at
        `)
        .in('conversation_id', convIds)
        .eq('status', 'waiting_approval')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const latestCustomerMsgByConv = {};
      if (actions && actions.length > 0) {
        const actionConvIds = [...new Set(actions.map((a) => a.conversation_id))];
        const { data: custMsgs } = await supabase
          .from('messages')
          .select('conversation_id, text, created_at')
          .in('conversation_id', actionConvIds)
          .eq('is_from_customer', true)
          .order('created_at', { ascending: false });

        for (const m of custMsgs || []) {
          if (!latestCustomerMsgByConv[m.conversation_id]) {
            latestCustomerMsgByConv[m.conversation_id] = m.text;
          }
        }
      }

      const enrichedActions = (actions || []).map((a) => {
        const conv = convMap[a.conversation_id] || {};
        return {
          ...a,
          customer_name: conv.customer_name || 'Customer',
          customer_psid: conv.customer_psid || null,
          customer_message: latestCustomerMsgByConv[a.conversation_id] || null,
        };
      });

      res.json({ pendingActions: enrichedActions });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Shared approval dispatch: marks a waiting pending_action sent, delivers
  // the reply through Meta when a page token exists, and persists the
  // outbound message. Used by the approve endpoint and by chat
  // confirmations ("yes, send it"), where the merchant message IS the
  // human approval.
  async function dispatchPendingApproval(actionId, editedReply) {
    const { data: action, error: actErr } = await supabase
      .from('pending_actions')
      .select(`
        id,
        draft_reply,
        conversation_id
      `)
      .eq('id', actionId)
      .single();
    if (actErr || !action) throw new Error('Pending action not found');
    const replyText = editedReply || action.draft_reply;
    let graphResult = null;
    try {
      const { data: conv } = await supabase.from('conversations').select('id, page_id, customer_psid, last_message_at').eq('id', action.conversation_id).maybeSingle();
      if (conv && conv.customer_psid && conv.customer_psid !== 'mume_assistant') {
        const { data: page } = await supabase.from('pages').select('fb_page_id, page_access_token_encrypted').eq('id', conv.page_id).maybeSingle();
        if (page && page.page_access_token_encrypted) {
          const plainToken = decryptToken(page.page_access_token_encrypted, env);
          graphResult = await sendPageReply({ pageId: page.fb_page_id, pageAccessToken: plainToken, appSecret: env.FB_APP_SECRET, psid: conv.customer_psid, text: replyText, lastCustomerMessageAt: conv.last_message_at, approvalStatus: 'approved' });
        }
      }
    } catch (graphErr) {
      console.warn('[approve-dispatch] Warning:', graphErr.message);
    }
    const { data: updated } = await supabase.from('pending_actions').update({ status: 'sent', draft_reply: replyText, updated_at: new Date().toISOString() }).eq('id', actionId).select().single();
    await supabase.from('messages').insert({ conversation_id: action.conversation_id, fb_message_id: (graphResult && graphResult.message_id) || `action-${Date.now()}`, sender: 'page', text: replyText, is_from_customer: false });
    return { updated, graphResult, replyText };
  }

  // 12. POST /api/pending-actions/:id/approve -> Approve pending reply and dispatch
  app.post('/api/pending-actions/:id/approve', async (req, res) => {
    const { id } = req.params;
    const { editedReply } = req.body || {};

    try {
      if (!supabase) return res.json({ status: 'approved' });
      const { updated, graphResult } = await dispatchPendingApproval(id, editedReply);
      res.json({ status: 'sent', action: updated, graphResult });
    } catch (err) {
      const status = /not found/i.test(err.message) ? 404 : 500;
      res.status(status).json({ error: err.message });
    }
  });

  return app;
}

module.exports = { createApp, escapeHtml };
