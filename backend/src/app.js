const express = require('express');

/**
 * Builds the Express app. Kept separate from index.js so tests can
 * exercise routes without binding a port.
 */
function createApp(env = process.env) {
  const app = express();
  app.use(express.json());

  // Health check - Render pings this, and it's a quick "is it alive?" in the browser.
  app.get('/', (_req, res) => {
    res.json({ name: 'mume-backend', status: 'ok' });
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Facebook webhook verification handshake.
  // Meta calls GET /webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
  // and expects the raw challenge echoed back when the token matches FB_VERIFY_TOKEN.
  app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const expected = env.FB_VERIFY_TOKEN;

    if (mode === 'subscribe' && expected && token === expected) {
      return res.status(200).type('text/plain').send(String(challenge ?? ''));
    }
    return res.sendStatus(403);
  });

  // Facebook webhook events (new messages, comments, etc.).
  // Meta requires a fast 200; real processing comes in later phases.
  app.post('/webhook', (req, res) => {
    console.log('[webhook] event:', JSON.stringify(req.body));
    res.sendStatus(200);
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

