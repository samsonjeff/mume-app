# Meta Graph API Compliance, Error Handling & Token Encryption Reference

## 1. Rate Limit Headers & Thresholds

Meta returns JSON-encoded rate limit headers on Graph API responses:
- `x-app-usage`: `{"call_count":28,"total_time":15,"total_cputime":12}`
- `x-page-usage`: `{"call_count":45,"total_time":20,"total_cputime":18}`
- `x-business-use-case-usage`: `{"<business-object-id>":[{"type":"messenger","call_count":10,"total_cputime":5,"total_time":8,"estimated_time_to_regain_access":0}]}`

```javascript
function checkRateLimitHeaders(headers) {
  for (const name of ['x-app-usage', 'x-page-usage']) {
    const raw = headers.get?.(name) ?? headers[name];
    if (!raw) continue;
    try {
      const usage = JSON.parse(raw);
      const maxMetric = Math.max(
        Number(usage.call_count) || 0,
        Number(usage.total_time) || 0,
        Number(usage.total_cputime) || 0
      );
      if (maxMetric >= 90) {
        console.warn('[meta-rate-limit] CRITICAL %s=%d%% - pausing calls', name, maxMetric);
      } else if (maxMetric >= 75) {
        console.warn('[meta-rate-limit] HIGH %s=%d%% - throttling calls', name, maxMetric);
      }
    } catch {
      // Ignore malformed header
    }
  }
}
```

## 2. Graph API Error Codes & Required Actions

Never blindly retry permanent errors. Classify by `error.code` and `error.error_subcode`:

| Code / Subcode | Meaning | Required Action |
|---|---|---|
| `190` | Invalid / expired / revoked OAuth Access Token | **DO NOT RETRY.** Mark Page token invalid in DB and prompt Page owner to re-authenticate via Facebook Login. |
| `10` or `200`–`299` | Permission denied (`pages_messaging`, etc. missing) | **DO NOT RETRY.** Check granted permissions via `/me/permissions` and request missing scope in Login flow. |
| `551` / subcode `2018001` | User isn't available / blocked Page / cannot receive messages | **DO NOT RETRY.** Mark conversation unreachable. |
| `10` / subcode `2018278` | Outside 24-hour standard messaging window | **DO NOT RETRY.** Surface in UI that customer must message the Page again before a reply can be sent. |
| `4`, `17`, `32`, `613`, `80001` | Rate limit reached (App, User, Page, or Messenger BUC) | **BACKOFF.** Honor `estimated_time_to_regain_access` (in minutes) if present, or use exponential backoff starting at 60s with jitter. |
| HTTP `500`, `502`, `503`, `504` | Transient Meta server error | Retry up to 3 times with exponential backoff (`1s`, `2s`, `4s` + jitter). |

## 3. AES-256-GCM Page Token Encryption (`pages.page_access_token_encrypted`)

Never store `page_access_token` in plaintext. Encrypt with a 32-byte key from `TOKEN_ENCRYPTION_KEY` (or derived via SHA-256 from `FB_APP_SECRET` if `TOKEN_ENCRYPTION_KEY` is not set separately):

```javascript
const crypto = require('node:crypto');

function getEncryptionKey(env = process.env) {
  const secret = env.TOKEN_ENCRYPTION_KEY || env.FB_APP_SECRET;
  if (!secret) throw new Error('Missing TOKEN_ENCRYPTION_KEY or FB_APP_SECRET');
  return crypto.createHash('sha256').update(String(secret)).digest();
}

function encryptToken(plainToken, env = process.env) {
  const key = getEncryptionKey(env);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainToken, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${authTag.toString('base64')}.${encrypted.toString('base64')}`;
}

function decryptToken(payload, env = process.env) {
  const [ivB64, tagB64, dataB64] = String(payload).split('.');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Invalid encrypted token format');
  const key = getEncryptionKey(env);
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivB64, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = { encryptToken, decryptToken };
```

## 4. Required Page Permissions & Webhook Subscriptions

- **OAuth Scopes (MVP):**
  - `pages_show_list`
  - `pages_manage_metadata`
  - `pages_read_engagement`
  - `pages_read_user_content`
  - `pages_messaging`
- **Page Subscribed Fields (`POST /{page-id}/subscribed_apps`):**
  - `messages`
  - `messaging_postbacks`
  - `feed`

