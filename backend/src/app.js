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
const { getMumeAiReply, buildSessionSummary, detectTopic } = require('./services/ai');

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

  // Capture rawBody for Meta webhook signature verification
  app.use(
    express.json({
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

  // Facebook webhook events (incoming messages, postbacks, feed comments)
  // Signature verification is mandatory: without FB_APP_SECRET the endpoint
  // fails closed instead of accepting unverified payloads.
  app.post('/webhook', (req, res) => {
    const signature = req.get('x-hub-signature-256');
    if (!env.FB_APP_SECRET) {
      console.warn('[webhook] Rejected: FB_APP_SECRET not configured - failing closed');
      return res.sendStatus(401);
    }
    if (!signature || !req.rawBody || !verifyMetaSignature(req.rawBody, signature, env.FB_APP_SECRET)) {
      console.warn('[webhook] Rejected missing or invalid X-Hub-Signature-256');
      return res.sendStatus(401);
    }

    // Fast 200 ACK to Meta within < 5 seconds
    res.status(200).send('EVENT_RECEIVED');

    // Asynchronously process events and persist to Supabase
    setImmediate(async () => {
      try {
        const body = req.body;
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
                  .select('id')
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

                    // Detect price or stock inquiries to generate a human-in-the-loop pending approval card
                    const lower = messageText.toLowerCase();
                    const isPriceInquiry =
                      lower.includes('magkano') ||
                      lower.includes('price') ||
                      lower.includes('how much') ||
                      lower.includes('apple') ||
                      lower.includes('mango') ||
                      lower.includes('banana') ||
                      lower.includes('available');

                    if (isPriceInquiry) {
                      let draft = 'Red apples are $2.50 per kg. We have fresh stock ready for delivery!';
                      let suggestedPrice = 2.5;

                      if (lower.includes('mango') || lower.includes('manga')) {
                        draft = 'Carabao mangoes are $4.00 per kg (In stock). Would you like to reserve a basket?';
                        suggestedPrice = 4.0;
                      } else if (lower.includes('banana') || lower.includes('saging')) {
                        draft = 'Lakatan bananas are $1.80 per kg (Low stock - few bunches remaining).';
                        suggestedPrice = 1.8;
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
                      const topic = detectTopic(messageText);
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
  });

  // Fallback webhook at root if Meta sends events to root
  app.post('/', (req, res, next) => {
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
        approvalStatus: approvalStatus || 'approved',
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

      // Find or create AI assistant conversation
      let { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('page_id', pageId)
        .eq('customer_psid', 'mume_assistant')
        .maybeSingle();

      if (!conv) {
        const { data: newConv, error: createErr } = await supabase
          .from('conversations')
          .insert({
            page_id: pageId,
            customer_psid: 'mume_assistant',
            customer_name: 'Mume AI Assistant',
            last_message_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        if (createErr) throw createErr;
        conv = newConv;

        // Seed initial greeting message
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
    const replyText = getMumeAiReply(trimmed);

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
      const contextReply = getMumeAiReply(trimmed, { history });

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
            summary: buildSessionSummary(sessionHistory),
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

      res.json({ conversations: convs || [] });
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
        .eq('status', 'waiting_approval')
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json({ pendingActions: actions || [] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 12. POST /api/pending-actions/:id/approve -> Approve pending reply and dispatch
  app.post('/api/pending-actions/:id/approve', async (req, res) => {
    const { id } = req.params;
    const { editedReply } = req.body || {};

    try {
      if (!supabase) return res.json({ status: 'approved' });

      const { data: action, error: actErr } = await supabase
        .from('pending_actions')
        .select(`
          id,
          draft_reply,
          conversation_id
        `)
        .eq('id', id)
        .single();

      if (actErr || !action) {
        return res.status(404).json({ error: 'Pending action not found' });
      }

      const replyText = editedReply || action.draft_reply;

      // Update pending action to 'sent'
      const { data: updated } = await supabase
        .from('pending_actions')
        .update({
          status: 'sent',
          draft_reply: replyText,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      // Persist outbound reply in messages
      await supabase.from('messages').insert({
        conversation_id: action.conversation_id,
        fb_message_id: `action-${Date.now()}`,
        sender: 'page',
        text: replyText,
        is_from_customer: false,
      });

      res.json({ status: 'sent', action: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return app;
}

module.exports = { createApp, escapeHtml };
