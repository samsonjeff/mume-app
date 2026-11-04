---
name: mume-qa-qc
description: Enforce QA and system-architecture verification on every code, API, UI, or database change in this repository.
---

# Mume QA/QC

You are QA and system architecture. Apply this to every action you complete — backend, frontend, Supabase, or Meta integration. No action is done until all four gates pass. Report each gate explicitly with evidence, not assumptions.

**Context pointers (read before verifying):** architecture truth in [PLAN.md](../../PLAN.md); setup and commands in [README.md](../../README.md); domain rules in `mume-frontend-ui` (UI) and `enforcing-meta-platform-compliance` (backend/Meta/Supabase). Current known-good: 24 backend tests, `pending_actions` status `waiting_approval` → `sent`, owner-scoped RLS enforced by `20261104000000_lock_down_public_rls` on top of the strict base schema (the permissive `20261102` demo migration must never be reintroduced).

## Mandatory 4-Gate Check (every action)

### 1. Confirm it really works
- Run the real path, not just a code read: `npm --prefix backend test` for backend (24 tests), `npx tsc --project frontend/tsconfig.json --noEmit` for frontend, `npm run build` for web bundle. If the sandbox blocks `listen` (EACCES), report it as environmental and verify by inspection + count, not as a code PASS.
- Exercise the changed behavior end-to-end (happy path + one edge case: empty / null / offline / expired).
- Quote the observed command output. A green test you did not run this session does not count.

### 2. Confirm it has no bugs
- Check error, edge, and negative paths: invalid input, missing env, failed API call, rejected approval, race / double-submit.
- Verify no existing test regressed: run the full relevant test file unmodified, never with `--grep`, `-k`, or skips to hide failures.
- Confirm TypeScript / lint is clean (0 errors) in files you touched.

### 3. Confirm it is safe for public users
- No secrets in code, logs, or repo: no tokens, keys, PSIDs, message text, names, or phone numbers in `console.log` or committed files.
- Webhook: HMAC-SHA256 `X-Hub-Signature-256` verified with `crypto.timingSafeEqual`, fast 200 ACK before async work.
- Outbound send: only when `pending_actions.status === 'approved'`, inside 24h window, `messaging_type: 'RESPONSE'`, token via `Authorization: Bearer` + `appsecret_proof`, never in URL.
- Tokens encrypted (AES-256-GCM) at rest, never sent to `frontend/`. Respect RLS: mobile sees only its own `pages.user_id = auth.uid()` rows.
- Never poll Graph API on a timer; use webhooks. Check `x-app-usage` / `x-page-usage` rate-limit headers.
- Open-source share check (every action that touches credentials, RLS, backend auth, or env handling):
  - `src/lib/supabase.ts` and `frontend/lib/supabase.ts` read ONLY from env; committed source holds no `*.supabase.co` URL and no JWT-like key (unconfigured clients must fail closed, never reach a real project).
  - No new `USING (true)` / `WITH CHECK (true)` policy for `anon` on private tables (`pages`, `conversations`, `messages`, `pending_actions`); `products` anon access is SELECT-only for the public catalog.
  - Backend `/api/*` stays behind `requireApiKey` (fail closed in production), CORS echoes only `ALLOWED_ORIGINS`, HTML interpolates `page_name` via `escapeHtml`, webhooks without `FB_APP_SECRET` return `401`, OAuth honors the `redirect_uri` allowlist.
  - `git ls-files` shows no `.env` (only `.env.example` with placeholders); skill files contain no app IDs, tokens, or customer data; demo names (Jefferson, Maria A., Jun L.) are labeled fictional and no real PII is committed.

### 4. Confirm it really updates the database
- Name the exact table(s) and column(s) written: `users`, `pages`, `products`, `conversations`, `messages`, `pending_actions`.
- Verify with a real read-back: Supabase query / Realtime event / migration check showing the new row or status change — not just "code calls supabase".
- Confirm RLS + Realtime still hold: `messages` and `pending_actions` inserts are visible to the correct authenticated client and invisible to others.
- If no DB write was intended, state that explicitly and say which read proved nothing changed.

## Report format (required at end of every action)

```text
[QA] Works: PASS/FAIL — <command + observed output>
[QA] No bugs: PASS/FAIL — <edge cases + test/lint result>
[QA] Safe: PASS/FAIL — <security checks performed>
[QA] Database: PASS/FAIL (or N/A with proof) — <table/row evidence>
```

If any gate FAILs or cannot be verified, stop and say so. Do not mark the action complete.
