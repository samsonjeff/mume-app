const express = require('express');

/**
 * Builds the Express app. Kept separate from index.js so tests can
 * exercise routes without binding a port.
 */
function createApp(env = process.env) {
  const app = express();
  app.use(express.json());

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
    res.json({ name: 'mume-backend', status: 'ok' });
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Facebook webhook verification handshake on /webhook
  app.get('/webhook', handleWebhookVerification);

  // Facebook webhook events (new messages, comments, etc.).
  app.post('/webhook', (req, res) => {
    console.log('[webhook] event:', JSON.stringify(req.body));
    res.sendStatus(200);
  });

  app.post('/', (req, res, next) => {
    if (req.body && req.body.object) {
      console.log('[webhook] event at /:', JSON.stringify(req.body));
      return res.sendStatus(200);
    }
    next();
  });

  // Facebook Login OAuth redirect target ("Valid OAuth Redirect URI" in Meta App settings).
  // Token exchange + Page linking is implemented in Phase 1 "Facebook Login + Link Page".
  app.get('/auth/facebook/callback', (req, res) => {
    const { code, error, error_description: errorDescription } = req.query;
    if (error) {
      return res.status(400).json({ error, error_description: errorDescription });
    }
    if (!code) {
      return res.status(400).json({ error: 'missing_code' });
    }
    return res.json({ status: 'received', next: 'token exchange not implemented yet' });
  });

  return app;
}

module.exports = { createApp };

