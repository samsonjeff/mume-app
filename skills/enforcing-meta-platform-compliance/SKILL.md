---
name: enforcing-meta-platform-compliance
description: Use when building, reviewing, debugging, or calling Facebook Graph API, Messenger Platform API, Page Webhooks, Facebook Login OAuth, or meta-developer-tools MCP in this repository.
---

# Enforcing Meta Platform Compliance

## Overview

Design, review, and execute all Meta Platform integrations (Graph API, Messenger API, Webhooks, OAuth, and `meta-developer-tools` MCP) strictly within Meta Developer Policies, Platform Terms, and Rate Limit guidelines.

**Violating the letter of these rules is violating the spirit of these rules.** Account suspension, token revocation, or webhook deactivation kills the app immediately.

## How To Use This Skill (read first)

**When to use:** any backend change in `backend/src/`, webhook/OAuth/reply work, Supabase persistence of Page data.
**When NOT to use:** pure UI/styling (use `mume-frontend-ui`), every-action QA gates (use `mume-qa-qc`).
**Actual file map (verified):**
- `backend/src/app.js` — all 19 route handlers (webhook, OAuth, pages, inbox, reply, chat, conversations, pending-actions approve)
- `backend/src/services/crypto.js` — AES-256-GCM + `verifyMetaSignature`; `facebook.js` — Graph v21.0 client + rate-limit telemetry; `supabase.js` — service_role client from env only (returns `null` when unconfigured, never a hardcoded key); `ai.js` — context-aware `getMumeAiReply` (last-20-message history + `conversation_sessions` summary; still rule-based with fictional demo names, NOT live Meta Model API yet)
- `backend/test/app.test.js` — 24 tests (crypto, webhook handshake, OAuth URL, link-direct validation, reply validation, CORS, chat GET/POST, AI session memory)
- `supabase/migrations/` — `20261031_create_mume_schema` (strict owner-scoped base) + `20261102_fix_realtime_and_rls` (superseded permissive demo — never reintroduce) + `20261104_lock_down_public_rls` (current posture: no anon access to private tables, anon SELECT-only on `products`) + `20261105_add_conversation_sessions` (AI session memory + realtime, locked-down RLS)
**Verify with:** `npm --prefix backend test` (24 tests).
**Status vocabulary (actual):** `pending_actions.status` is `waiting_approval` → `sent` (via `POST /api/pending-actions/:id/approve`); the direct reply endpoint `POST /api/pages/:pageId/messages/reply` rejects anything but `approvalStatus === 'approved'` but defaults a missing value to `'approved'` — always pass it explicitly from the approve flow, never rely on the default.

## Mandatory Pre-Flight Check (App Identity)

Before calling any Meta API or `meta-developer-tools` MCP tool:
1. Read `FB_APP_ID` from your local `.env` (never commit the real value; `.env.example` holds only a placeholder). Never paste a real app ID, app secret, or token into skill files, docs, or chat.
2. If using `meta-developer-tools` MCP, verify whether `meta_get_app_info` matches `FB_APP_ID`. Never confuse an MCP user token from another app with the target app's webhook or OAuth configuration.

## Core Compliance Recipes

### 1. Webhook Receiver (`GET /webhook` & `POST /webhook`)

Every webhook endpoint MUST follow this exact 4-part structure:
1. **Capture raw body** in `express.json({ verify })` before parsing JSON.
2. **Verify `X-Hub-Signature-256`** on every `POST` using HMAC-SHA256 with `FB_APP_SECRET` and `crypto.timingSafeEqual`. Reject missing/invalid signatures with `401`.
3. **Acknowledge within < 5 seconds** (`res.status(200).send('EVENT_RECEIVED')`) BEFORE running database writes, AI calls, or outbound HTTP requests.
4. **Log metadata only** (`object`, `entry[].id`, `entry[].time`) — never log message text, customer names, phone numbers, or tokens.

```javascript
const crypto = require('node:crypto');
const express = require('express');

// 1. Capture rawBody for HMAC verification
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

function verifyMetaSignature(rawBody, signatureHeader, appSecret) {
  if (!rawBody || !signatureHeader || !appSecret) return false;
  const [algo, sigHash] = String(signatureHeader).split('=');
  if (algo !== 'sha256' || !sigHash) return false;
  const expectedHash = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(sigHash, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// 2. Verify signature -> 3. Fast 200 ACK -> 4. Async PII-safe processing
app.post('/webhook', (req, res) => {
  const sig = req.get('x-hub-signature-256');
  if (!verifyMetaSignature(req.rawBody, sig, process.env.FB_APP_SECRET)) {
    return res.sendStatus(401);
  }
  res.status(200).send('EVENT_RECEIVED');

  setImmediate(() => {
    const entries = Array.isArray(req.body?.entry) ? req.body.entry : [];
    for (const entry of entries) {
      console.log('[webhook] page_id=%s time=%s', entry.id, entry.time);
      // Enqueue or persist to Supabase here; NEVER auto-send replies from webhook
    }
  });
});
```

### 2. Outbound Messenger Send API (`POST /{page-id}/messages`)

Every outbound message call MUST include all 5 elements:
1. **Human-in-the-loop gate:** Only send when `pending_actions.status === 'approved'` (never auto-send prices or replies directly from a webhook or AI draft).
2. **24-hour Standard Messaging Window check:** Confirm `Date.now() - new Date(conversation.last_message_at).getTime() < 24 * 60 * 60 * 1000` (customer-initiated message within 24h). Do NOT use Message Tags to bypass the 24h window for promotional or price replies.
3. **Explicit `messaging_type: 'RESPONSE'`:** Always set `messaging_type: 'RESPONSE'` in the payload.
4. **Authorization header + `appsecret_proof`:** Pass the Page Access Token in `Authorization: Bearer <token>` (never in URL query strings where it leaks into logs) and send `appsecret_proof` (HMAC-SHA256 of token with `FB_APP_SECRET`).
5. **Rate-limit header inspection:** Check `x-app-usage`, `x-page-usage`, and `x-business-use-case-usage` on every response.

```javascript
function computeAppSecretProof(accessToken, appSecret) {
  return crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
}

function checkRateLimitHeaders(headers) {
  for (const name of ['x-app-usage', 'x-page-usage']) {
    const raw = headers.get?.(name) ?? headers[name];
    if (!raw) continue;
    try {
      const u = JSON.parse(raw);
      const max = Math.max(Number(u.call_count) || 0, Number(u.total_time) || 0, Number(u.total_cputime) || 0);
      if (max >= 75) console.warn('[meta-rate-limit] %s=%d%%', name, max);
    } catch {}
  }
}

async function sendPageReply({ pageId, pageAccessToken, appSecret, psid, text, lastCustomerMessageAt, approvalStatus }) {
  if (approvalStatus !== 'approved') {
    throw new Error('COMPLIANCE_BLOCK: Outbound message requires human approval');
  }
  const ageMs = Date.now() - new Date(lastCustomerMessageAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs > 24 * 60 * 60 * 1000) {
    throw new Error('COMPLIANCE_BLOCK: Outside 24-hour Standard Messaging Window');
  }

  const proof = computeAppSecretProof(pageAccessToken, appSecret);
  const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(pageId)}/messages?appsecret_proof=${proof}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pageAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_type: 'RESPONSE',
      recipient: { id: psid },
      message: { text },
    }),
  });

  checkRateLimitHeaders(res.headers);
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw Object.assign(new Error(`Graph API error ${res.status}`), { graphError: errBody.error });
  }
  return res.json();
}
```

### 3. Rate Limits, Polling & Token Storage

| Requirement | Mandatory Rule |
|---|---|
| **Inbox & comment sync** | Use **Webhooks (`messages`, `messaging_postbacks`, `feed`)** stored in Supabase. Never poll `GET /{page-id}/conversations` or `/feed` on a timer. |
| **Graph API reads** | Always specify `?fields=...` to fetch only needed fields and limit page size (`limit=25`). |
| **Usage headers** | Parse `x-app-usage`, `x-page-usage`, `x-business-use-case-usage`. If `call_count`, `total_time`, or `total_cputime` > `75`, pause non-essential calls; if > `90`, halt and backoff. |
| **Token storage** | Encrypt `page_access_token` with AES-256-GCM before saving to `pages.page_access_token_encrypted`. Never return Page tokens or `SUPABASE_SERVICE_ROLE_KEY` to the mobile app. |
| **Scope boundary** | Operate strictly on linked Facebook Business Pages (`pages_messaging`, `pages_read_engagement`, `pages_manage_metadata`). Never automate personal profiles or personal Messenger. |

For Graph API error codes, backoff rules, and token encryption helpers, read [references/graph-api-compliance.md](./references/graph-api-compliance.md).

## Rationalization Table

| Excuse | Reality |
|---|---|
| "It's a hackathon / demo, skip `X-Hub-Signature-256` for now" | Unverified webhooks accept forged payloads and fail Meta App Review immediately. The HMAC check is 12 lines of code. |
| "I'll `await` the AI/Graph reply inside `POST /webhook` before sending 200" | Meta times out after 5-15s, retries with exponential load, and disables your webhook subscription. ACK 200 first, process async. |
| "Auto-replying from the webhook is faster for the demo" | Violates both Mume's core safety rule (human-in-the-loop price confirmation) and Meta anti-spam policy. Always go through `pending_actions`. |
| "Logging `req.body` helps debug webhook payloads" | Logs customer PII (names, phone numbers, PSIDs) in plaintext on Render. Log only `entry.id` and `entry.time`. |
| "Passing `?access_token=...` in the URL is what quickstarts show" | Query-string tokens leak into HTTP access logs and error stack traces. Use `Authorization: Bearer` + `appsecret_proof`. |
| "We can poll `/conversations` every 5 seconds instead of webhooks" | Burns the Page rate limit (`200 * engaged_users`) in minutes and triggers error `#4` / `#32` lockouts. |

## Red Flags - STOP and Fix Immediately

- `POST /webhook` handler that does not call `verifyMetaSignature` on `req.rawBody`
- `await`ing external HTTP/AI/DB work before `res.status(200).send(...)` in `POST /webhook`
- `console.log(req.body)` or `console.log(event)` on webhook payloads
- Calling `/messages` without `messaging_type: 'RESPONSE'`, 24-hour window check, and human approval check
- Putting `access_token` in URL query strings without `Authorization: Bearer` and `appsecret_proof`
- Using `setInterval` / cron to poll Graph API inbox or feed endpoints
- Storing plaintext Page Access Tokens in the database or sending them to `frontend/`

## Pre-Publish Checklist (before any public push)

Run every item; a single NO blocks `git push` to a public remote:
- `git ls-files | grep -E '\.env$'` returns nothing (only `.env.example` files with placeholders are tracked).
- No `*.supabase.co` URL and no JWT-like key in committed `src/lib/supabase.ts` / `frontend/lib/supabase.ts`; no production backend URL hardcoded in `frontend/lib/api.ts`.
- No `USING (true)` / `WITH CHECK (true)` policy for `anon` on `pages`, `conversations`, `messages`, or `pending_actions` outside the superseded `20261102` migration; current head is the `20261104` lockdown.
- Supabase anon key rotated in the dashboard after any past exposure (old keys live in git history forever); history rewrite only if you accept force-push costs.
- Skill files and docs hold no real app IDs, secrets, tokens, or customer data; demo names (Jefferson, Maria A., Jun L.) are fictional stand-ins, never real PII.

