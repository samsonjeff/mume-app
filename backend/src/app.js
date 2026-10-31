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
  app.post('/webhook', (req, res) => {
    const signature = req.get('x-hub-signature-256');
    if (env.FB_APP_SECRET) {
      if (!signature || !req.rawBody || !verifyMetaSignature(req.rawBody, signature, env.FB_APP_SECRET)) {
        console.warn('[webhook] Rejected missing or invalid X-Hub-Signature-256');
        return res.sendStatus(401);
      }
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

  // 1. GET /auth/facebook/url -> Returns OAuth URL for frontend
  app.get('/auth/facebook/url', (req, res) => {
    const appId = env.FB_APP_ID;
    if (!appId) {
      return res.status(500).json({ error: 'FB_APP_ID not configured on server' });
    }
    const defaultRedirect = getCallbackUrl(req);
    const redirectUri = req.query.redirect_uri || defaultRedirect;
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
              ${linkedPages.map(p => `<div class="badge">${p.page_name}</div>`).join('')}
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

      res.json({ status: 'sent', result });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return app;
}

module.exports = { createApp };
