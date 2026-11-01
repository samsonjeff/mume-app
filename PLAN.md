# Mume - Architecture, Security & Implementation Plan

**Mume = Muse + Messenger. Manage Business Page Messenger without opening Messenger.**

> ## 🏆 Highlight Entry - Meta Global AI Developer Hackathon
> **Project:** Mume  
> **Track:** Indie Developer & Startups  
> **Themes:** Build for Your World (primary) + Push the Frontier  
> **Tagline:** Mume = Muse + Messenger. Manage Business Page Messenger without opening Messenger.  
> **Pitch:** Voice-first Page OS for sari-sari store owners and market vendors who cannot type while working. Hands-free, wake-word assistant that syncs with your Facebook Business Page, drafts context-aware replies, and strictly enforces human-in-the-loop confirmation before dispatching customer responses.  
> **Event:** 10 days, Oct 26 - Nov 4 | PH Time: Oct 27, 1:00 AM – Nov 5, 10:00 AM (GMT+8 / PHT) | Built with Meta Graph API v21.0 + Meta Model API + Open Weights

---

## 1. System Architecture & Topology

Mume is structured as a coordinated multi-surface workspace designed for high reliability, strict Meta compliance, zero secret leakage, and one-handed mobile ergonomics:

```
mume/
├── frontend/               # Cross-platform mobile app (Expo SDK 58 + React Native 0.88 + Reanimated)
│   ├── app/                # Expo Router screen tree (index.tsx, link-page.tsx, _layout.tsx)
│   ├── components/         # Ergonomic components (WakeWordButton, VoiceWave, InboxBadge, AppIcon)
│   ├── constants/          # Official Google Antigravity design system tokens (theme.ts)
│   └── lib/                # Clean API client & sanitized Supabase connection
├── backend/                # Node.js + Express backend & Meta Graph API v21.0 integration
│   ├── src/
│   │   ├── app.js          # Express app factory, webhook handlers, OAuth flow, & reply dispatcher
│   │   ├── index.js        # Server bootstrapper & process signal handler
│   │   └── services/
│   │       ├── crypto.js   # AES-256-GCM cipher & HMAC-SHA256 signature verification
│   │       ├── facebook.js # Meta Graph API v21.0 client with rate-limit telemetry
│   │       └── supabase.js # Supabase Admin client with service_role isolation
│   └── test/               # Node native test suite (13/13 passing compliance tests)
├── src/                    # Figma Make React 19 + Tailwind CSS v4 web companion dashboard
├── supabase/migrations/    # Postgres schema, pgvector extensions, RLS policies & Realtime pub
└── skills/                 # Compliance & UI skills (enforcing-meta-platform-compliance)
```

```
                                  +------------------------------------+
                                  |      Facebook / Meta Platform      |
                                  |   - Graph API v21.0                |
                                  |   - Page Webhooks (HMAC-SHA256)    |
                                  |   - Messenger Send API (24h win)   |
                                  +-----------------+------------------+
                                                    |
                                       Webhook Push | Outbound Reply
                                       (Instant ACK)| (Human Approved)
                                                    v
+-------------------------------+         +---------+--------------------------+
|       Mobile Client (Expo)    |         |        Node.js / Express Backend   |
| - WakeWordButton (72dp thumb) |  REST   | - HMAC-SHA256 X-Hub-Signature-256  |
| - VoiceWave (60fps Reanimated)| <-----> | - AES-256-GCM Token Encryption     |
| - Drawer Menu & Clean Hero    |         | - Rate-Limit Telemetry (75%/90%)   |
| - Offline Mock Safe Fallback  |         | - Meta Compliance: /privacy, etc.  |
+---------------+---------------+         +-----------------+------------------+
                |                                           |
                | Supabase Realtime (RLS)                   | service_role
                +-------------------> + <-------------------+
                                      |
                           +----------v-----------+
                           |  Supabase (Postgres) |
                           | - users / pages      |
                           | - conversations      |
                           | - messages (Realtime)|
                           | - pending_actions    |
                           | - pgvector catalog   |
                           +----------------------+
```

---

## 2. Meta Platform Compliance & Security Engineering

The integration strictly satisfies Meta Developer Policies, Platform Terms, and Messenger Platform guidelines:

### 2.1 Webhook Receiver Security (`GET /webhook` & `POST /webhook`)
1. **Raw Body Capture**: Preserved in memory (`req.rawBody`) before JSON parsing for byte-exact cryptographic validation.
2. **HMAC-SHA256 Verification**: Every `POST /webhook` validates the `x-hub-signature-256` header against `FB_APP_SECRET`. Missing or mismatched signatures are rejected with HTTP `401 Unauthorized` using `crypto.timingSafeEqual` to eliminate timing attacks.
3. **Sub-5-Second Acknowledgement**: Sends `res.status(200).send('EVENT_RECEIVED')` immediately before triggering asynchronous persistence or processing.
4. **PII-Safe Logging**: Never writes message bodies, customer names, or phone numbers to logs; records only operational metadata (`page_id`, timestamp).
5. **Mandatory Compliance Handshake**: Verifies `hub.mode === 'subscribe'` and echoes `hub.challenge` on `GET /webhook` and `GET /`.

### 2.2 Outbound Messenger Send API (`POST /api/pages/:pageId/messages/reply`)
1. **Human-in-the-Loop Gate**: Rejects any message where `approvalStatus !== 'approved'` with `COMPLIANCE_BLOCK: Outbound message requires human approval`.
2. **24-Hour Standard Messaging Window**: Calculates `Date.now() - new Date(lastCustomerMessageAt).getTime()`. If exceeded, outbound transmission is blocked with `COMPLIANCE_BLOCK: Outside 24-hour Standard Messaging Window`.
3. **Explicit Type**: Sends `messaging_type: 'RESPONSE'` in every outbound Graph API payload.
4. **Credential Isolation**: Passes Page Access Tokens strictly via `Authorization: Bearer <token>` with `appsecret_proof` (HMAC-SHA256 of token with `FB_APP_SECRET`), avoiding URL query string token leakage.
5. **Rate-Limit Telemetry**: Continuously parses `x-app-usage`, `x-page-usage`, and `x-business-use-case-usage`. Issues automatic warning logs at >= 75% capacity and critical backoff alerts at >= 90%.

### 2.3 Token Security & Public Distribution Hygiene
1. **AES-256-GCM Encryption**: All Page Access Tokens stored in `pages.page_access_token_encrypted` are encrypted using a 12-byte random IV and 16-byte authentication tag (`iv.tag.data`).
2. **Production Fail-Safe**: `crypto.js` explicitly throws an error in production environments if `TOKEN_ENCRYPTION_KEY` and `FB_APP_SECRET` are missing.
3. **Zero Secrets in Repository**:
   - `frontend/lib/supabase.ts` contains no hardcoded fallback URLs or anon keys; defaults to safe mock mode when unconfigured.
   - `frontend/.env.example` and `backend/.env.example` contain purely sanitized placeholders.
   - Comprehensive `.gitignore` excludes local `.env` files, `.expo/`, keystores, certificates, and mobile provisioning files.

---

## 3. Cross-Platform Mobile Responsiveness and Ergonomics Directive (CPMRED)

> **Directive ID:** CPMRED-001 | **Status:** STRICT & AUDITED  
> **Goal:** Guarantee optimal one-handed comfortability, device responsiveness, and future-ready iOS adaptability while shipping Android-first.

### 3.1 Thumb Zone & Ergonomic Targets
- **Bottom 40% Action Zone**: The primary floating `WakeWordButton` (72dp) is fixed bottom-center within a 72px safe margin from the screen bottom edge.
- **Minimum Tap Target**: 48x48dp for all interactive buttons and suggestion chips, with minimum 8dp spacing to prevent unintended presses.
- **Slide-Out Navigation Drawer**: Replaces clutter with a safe-area aware slide-out drawer containing navigation destinations, active Page connection status, and Facebook Login/Logout controls.

### 3.2 Official Google Antigravity Color Palette (`https://antigravity.google/`)
Adopted strictly across mobile screens and theme definitions (`frontend/constants/theme.ts`):

| CSS Token | Hex | Role | Mobile Application |
| :--- | :--- | :--- | :--- |
| `--palette-grey-0` | `#FFFFFF` | **Surface** | Elevated cards, modal dialogs, status pills |
| `--palette-grey-10` | `#F8F9FC` | **Canvas** | App screen background, safe-area root canvas |
| `--palette-grey-20` | `#EFF2F7` | **Surface High** | Draft reply containers, secondary chips |
| `--palette-grey-50` | `#E6EAF0` | **Surface Higher** | Pressed states, hairline input backgrounds |
| `--palette-grey-100` | `#E1E6EC` | **Surface Border** | Subtle dividers, card borders |
| `--palette-grey-1200` | `#121317` | **Obsidian Ink** | Primary headers, solid pill CTA buttons |
| `--palette-grey-800` | `#45474D` | **Variant Ink** | Secondary descriptions, timestamps, metadata |
| `--palette-blue-600` | `#3279F9` | **Electric Blue** | VoiceWave animated bars, active voice state |
| `--theme-accent-primary` | `#1A73E8` | **Google Blue** | Primary links, accent highlights |
| `--palette-green` | `#00B95C` | **Emerald Green** | Live Page status badge, success indicators |
| `--palette-yellow` | `#FBBC04` | **Google Amber** | Thinking state, low-stock indicators |
| `--palette-red` | `#FC413D` | **Google Coral** | Disconnect states, error alerts |

---

## 4. Database Schema (Supabase Postgres + pgvector + Realtime)

The database schema (`supabase/migrations/20261031000000_create_mume_schema.sql`) enforces full Row-Level Security:

```sql
-- Core Tables
users (id, email, fb_user_id, created_at, updated_at)
pages (id, user_id, fb_page_id, page_name, page_access_token_encrypted, created_at, updated_at)
products (id, page_id, name, price, unit, image_url, embedding vector(1536), created_at, updated_at)
conversations (id, page_id, customer_psid, customer_name, last_message_at, created_at)
messages (id, conversation_id, fb_message_id, sender, text, is_from_customer, created_at)
pending_actions (id, conversation_id, product_id, draft_reply, suggested_price, status, created_at, updated_at)
```

- **Row Level Security (RLS)**: Enforced on all 6 tables. `service_role` backend maintains full access; mobile users are restricted to their authenticated resources via `pages.user_id = auth.uid()`.
- **Realtime**: Publications enabled for `messages` and `pending_actions` to push incoming inquiries and draft updates to mobile clients instantly.

---

## 5. Development Phases & Audit Status

### Phase 1: Setup, Auth & Meta Graph API [COMPLETED]
- [x] Scaffold monorepo: Expo frontend, Express backend, Figma Make companion.
- [x] Supabase Postgres schema migration with pgvector and RLS policies.
- [x] Meta Graph API v21.0 integration (OAuth callback, Webhooks, Page linking).
- [x] AES-256-GCM token encryption with authentication tag.
- [x] Automated test suite verifying crypto and API endpoints (13/13 passing).

### Phase 2: Mobile UI & Voice Ergonomics [COMPLETED]
- [x] Port verified Figma Make design tokens and Google Antigravity palette.
- [x] Implement bottom 40% thumb zone architecture and floating `WakeWordButton`.
- [x] Implement 60 FPS `VoiceWave` audio pulse visualization.
- [x] Slide-out navigation drawer with safe-area insets and scroll management.
- [x] Type-safe `AppIcon` component with resolution-independent vector rendering.
- [x] TypeScript compiler verification (`npx tsc --noEmit` passing with 0 errors).

### Phase 3: Brain Orchestration & Meta Policy Gates [COMPLETED]
- [x] Outbound reply endpoint with mandatory `approvalStatus === 'approved'` gate.
- [x] 24-hour Standard Messaging Window policy validation.
- [x] Meta rate-limit header parsing (`x-app-usage`, `x-page-usage`, `x-business-use-case-usage`).
- [x] HMAC-SHA256 timing-safe webhook authentication.
- [x] Meta compliance pages `/privacy` and `/data-deletion`.

### Phase 4: Public Distribution & Security Hardening [COMPLETED]
- [x] Audit tracked git files (`git ls-files`) to confirm zero secrets committed.
- [x] Scrub hardcoded Supabase URLs and JWT anon keys from client code and templates.
- [x] Update `.gitignore` with comprehensive rules for `.env`, mobile keystores, and credentials.
- [x] Align `PLAN.md` and `README.md` with current production architecture.

### Phase 5: Internationalization, Product CRUD & Startup Experience [COMPLETED]
- [x] Product CRUD modal interface (Add, Edit, Delete) with custom photo upload and live image preview.
- [x] International currency conversion: Standardized all pricing, inquiry drafts, and AI responses to USD ($).
- [x] Cleaned up Connected Facebook Page card to reduce vertical space while maintaining active sync indicators.
- [x] Integrated official `baseline-facebook.svg` across all Facebook login and linking touchpoints.
- [x] Polished header bar with centered white Mume vector logo and high-visibility silver-to-white gradient avatar badge.
- [x] Harmonized Mume AI Chat typography hierarchy with container dimensions.
- [x] Engineered 0.8-second startup animation with smooth cross-fade transition using `mume-black.svg` and `mume-white.svg`.

---

## 6. Verification Checklist

| Check | Target | Status | Verification Command |
| :--- | :--- | :--- | :--- |
| **Backend Tests** | 13/13 passing | PASSED | `npm --prefix backend test` |
| **Frontend Typecheck** | 0 TS errors | PASSED | `npx tsc --project frontend/tsconfig.json --noEmit` |
| **Root Typecheck** | 0 TS errors | PASSED | `npx tsc --noEmit` |
| **Vite Bundle Build** | Clean build | PASSED | `npm run build` |
| **Git Working Tree** | Clean / untracked free | PASSED | `git status` |
| **Secrets Audit** | Zero credentials | PASSED | Automated regex scan on tracked files |
