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
├── frontend/               # Cross-platform mobile app (Expo SDK 58 + React Native 0.88.1 + Reanimated)
│   ├── app/                # Expo Router screen tree (index.tsx, link-page.tsx, _layout.tsx)
│   ├── assets/             # Brand logos, icons, & product images (mume-black/white, baseline-facebook, fruits)
│   ├── components/         # Ergonomic components (WakeWordButton, VoiceWave, MumeLogo, AppIcon)
│   ├── constants/          # Official Google Antigravity design system tokens (theme.ts)
│   └── lib/                # Clean API client & sanitized Supabase connection
├── backend/                # Node.js 20+ / Express backend & Meta Graph API v21.0 integration
│   ├── src/
│   │   ├── app.js          # Express app factory, 19 routes: webhook, OAuth, pages, inbox, reply, chat, conversations, pending-actions approve
│   │   ├── index.js        # Server bootstrapper & process signal handler
│   │   └── services/
│   │       ├── crypto.js   # AES-256-GCM cipher & HMAC-SHA256 signature verification
│   │       ├── facebook.js # Meta Graph API v21.0 client with rate-limit telemetry
│   │       ├── supabase.js # Supabase Admin client with service_role isolation
│   │       └── ai.js       # Context-aware getMumeAiReply (history + session summary; still rule-based, NOT live Meta Model API yet)
│   └── test/               # Node native test suite (24 tests: crypto, webhook, OAuth, link-direct, reply, CORS, chat, AI session)
├── src/                    # Figma Make React 19 + Tailwind CSS v4 web companion dashboard (mirrors frontend tabs + PendingAction + AI chat)
├── supabase/migrations/    # 20261031_create_mume_schema (strict base) + 20261102_fix_realtime_and_rls (permissive demo RLS — harden before prod) + 20261105_add_conversation_sessions (AI session memory + realtime, locked-down RLS)
└── skills/                 # mume-frontend-ui, enforcing-meta-platform-compliance, mume-qa-qc
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

### 3.1 Thumb Zone & Ergonomic Architecture
- **Bottom 40% Action Zone**: The primary floating Gemini-style input dock sits fixed bottom-center within a safe margin from the screen bottom edge on home/inbox screens. It is cleanly hidden on the Catalog section (`activeTab === 'catalog'`) and Settings to give uninhibited full-screen space for browsing and managing products. It combines a quick-catalog button (`+`), a central voice dictation / typing field, and a high-contrast microphone button for hands-free activation.
- **Minimum Tap Target**: 48x48dp minimum for all interactive buttons, modal controls, and suggestion chips, with minimum 8dp spacing to prevent unintended presses during active store work.
- **Responsive Slide-Out Navigation Drawer**: Uses a full-height safe-area aware modal (`ScrollView` + `useSafeAreaInsets`) replacing bottom bar clutter. Houses navigation destinations, active Page connection status, and Facebook Login/Logout controls with notch/island support.
- **Logout Confirmation & Session Toggle**: Replaced generic chevrons with `log-out.svg` in the drawer footer. Tapping triggers a safety confirmation modal (`Log Out?`) that resets the session, displays clear empty states across tabs, and transforms the drawer footer into an official Meta "Login using Facebook" CTA.

### 3.2 Dynamic Visuals & Interaction Architecture
- **2.5-Second Startup Intro**: Fluid cross-fade startup transition between `mume-black.svg` (white canvas) and `mume-white.svg` (obsidian canvas), transitioning smoothly into the top navigation header.
- **Obsidian Top Header Bar**: Polished obsidian black bar (`#121317`) featuring a centered white Mume vector logo, left menu toggle, and right transparent action button rendering a crisp pure white (`#FFFFFF`) `subscription-upgrade.svg` icon for balanced visual symmetry.
- **Bottom-Anchored Mume AI Chat (13.8rem / 220px)**: Locked container height with bottom-anchored message stream (`chatMessagesSpacer` / `margin-top: auto`) placing messages at the bottom when starting and allowing natural smooth scrolling inside as conversations grow.
- **Scrollbar-Free Clean Aesthetics**: No scrollbars are rendered (`scrollbar-width: none !important`, `showsVerticalScrollIndicator={false}`), preserving a minimalist Figma Make card surface.
- **Interactive Reading & Scrolling Electric Blue Focus Highlight**: A glowing `#3279F9` focus ring activates during active scrolling, touch interaction, hovering, or reading (with a pulsing dot and "Reading conversation" indicator) and during typing/speech, automatically settling back to idle when finished.
- **Ergonomic Vertical Rhythm**: An 18dp (1.25rem) bottom margin is enforced below the pending action / "All Caught Up!" cards to ensure breathing room above the AI conversation stream.
- **Full-Message Draft Reply Editing**: Prior to approving and dispatching customer responses via the Meta Graph API, merchants can edit the complete reply text in-place (multiline editor or direct message tap)—not just isolated price fields. Includes instant "Edit message" / "Done editing" secondary button (redundant inner pill removed for clean suggested reply presentation).
- **Unobstructed Bottom Dock Dismissal on Draft Edit**: When editing the action draft message, the floating bottom Gemini-style input dock is completely hidden (`!isEditingDraft`), providing merchants full screen clearance and eliminating keyboard collision while editing customer replies.
- **"Ready for You" Section Badge & Card Topline**: Uses the clean Figma Make black, white, and gray design palette (`#121317`, `#FFFFFF`, `#EFF2F7`, `#E1E6EC`) for the section badge pill (`1 action to approve`). Removed duplicate "Action needed to approve" inner card pill badge to let the card focus directly on customer details and top-right timestamp ("now"), transitioning cleanly into "All Caught Up!" upon dispatch.
- **Interactive Product Catalog CRUD**: Streamlined Add, Edit, and Delete modal interface featuring direct custom photo uploads with live preview (preset fruit row removed for a cleaner, unified catalog workflow), unified white pill and dark text (`#121317`) badges across all stock types ("In stock", "Low stock", "Out of stock"), and international USD ($) pricing.

### 3.3 Official Google Antigravity Color Palette (`https://antigravity.google/`)
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
| `--palette-blue-600` | `#3279F9` | **Electric Blue** | VoiceWave animated bars, active voice & typing highlight |
| `--theme-accent-primary` | `#1A73E8` | **Google Blue** | Primary links, Facebook button accents |
| `--palette-green` | `#00B95C` | **Emerald Green** | Live Page status badge, success indicators |
| `--palette-yellow` | `#FBBC04` | **Google Amber** | Thinking state, low-stock indicators |
| `--palette-red` | `#FC413D` | **Google Coral** | Log-out button, disconnect states, error alerts |

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
conversation_sessions (id, conversation_id UNIQUE, summary, last_customer_topic, last_activity_at, created_at, updated_at) — permanent AI session memory per thread
```

- **Row Level Security (RLS)**: Enforced on all 6 tables. `service_role` backend maintains full access. Base migration restricts mobile users to `pages.user_id = auth.uid()` resources, but the live `20261102_fix_realtime_and_rls` migration currently opens permissive anon/authenticated read/insert/update policies plus `REPLICA IDENTITY FULL` and `conversations` in the Realtime publication (demo convenience — MUST harden back to owner-scoped policies before public production).
- **Realtime**: Publications enabled for `messages` and `pending_actions` to push incoming inquiries and draft updates to mobile clients instantly.

---

## 5. Development Phases & Audit Status

### Phase 1: Setup, Auth & Meta Graph API [COMPLETED]
- [x] Scaffold monorepo: Expo frontend, Express backend, Figma Make companion.
- [x] Supabase Postgres schema migration with pgvector and RLS policies.
- [x] Meta Graph API v21.0 integration (OAuth callback, Webhooks, Page linking).
- [x] AES-256-GCM token encryption with authentication tag.
- [x] Automated test suite verifying crypto and API endpoints (24 passing: crypto, webhook, OAuth, link-direct, reply, CORS, chat, AI session).

### Phase 2: Mobile UI & Voice Ergonomics [COMPLETED]
- [x] Port verified Figma Make design tokens and Google Antigravity palette.
- [x] Implement bottom 40% thumb zone architecture and floating `WakeWordButton`.
- [x] Implement 60 FPS `VoiceWave` audio pulse visualization.
- [x] Slide-out navigation drawer with safe-area insets and scroll management.
- [x] Type-safe `AppIcon` component with resolution-independent vector rendering.
- [x] TypeScript compiler verification (`npx tsc --noEmit` passing with 0 errors).

### Phase 3: Brain Orchestration & Meta Policy Gates [COMPLETED]
- [x] Outbound reply endpoint with mandatory `approvalStatus === 'approved'` gate (note: missing value currently defaults to `'approved'` — callers must pass it explicitly).
- [x] 24-hour Standard Messaging Window policy validation.
- [x] Meta rate-limit header parsing (`x-app-usage`, `x-page-usage`, `x-business-use-case-usage`).
- [x] HMAC-SHA256 timing-safe webhook authentication.
- [x] Meta compliance pages `/privacy` and `/data-deletion`.
- [x] Rule-based `getMumeAiReply` inventory stub (`backend/src/services/ai.js`) with Supabase-persisted assistant chat (`mume_assistant` conversation, `GET/POST /api/chat/messages`) — live Muse Model API wiring still PENDING.
- [x] Session-aware replies: `POST /api/chat/messages` loads the last 20 thread messages as context (follow-ups inherit the product topic); webhook upserts `conversation_sessions` per customer thread so the AI has reference when the customer messages again.
- [x] Live inbox: frontend subscribes to `conversations` INSERT/UPDATE via Supabase Realtime (`realtime_inbox` channel) so new threads appear without refresh; open threads already append `messages` INSERTs live.
- [x] Approval-flow APIs: `GET /api/pages/:pageId/conversations`, `GET /api/pages/:pageId/pending-actions`, `POST /api/pending-actions/:id/approve` (`waiting_approval` → `sent` + `messages` insert).

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
- [x] Polished header bar with centered white Mume vector logo and high-visibility silver-to-white gradient badge rendering `subscription-upgrade.svg`.
- [x] Standardized hero greeting subtitle to "Welcome to Mume!".
- [x] Locked Mume AI Chat container to a constant height (+10%, 13.8rem / 220px) with internal color gray scrollbar.
- [x] Active conversation highlighting: dynamic Electric Blue focus glow and live status pill (`Typing…` · `Listening` · `Thinking`) when actively composing or dictating.
- [x] Integrated visible color gray scrollbar for smooth review of full conversation history while composing messages.
- [x] Engineered 2.5-second startup animation with smooth cross-fade transition using `mume-black.svg` and `mume-white.svg`.
- [x] Dynamic conversation auto-follow & position adjustment while typing, keeping conversation history clearly visible above input capsule.
- [x] Transient active typing blue highlight: triggers solely during active keystrokes, smoothly turns off after typing pause, and returns immediately upon resumed typing.
- [x] Ergonomic vertical rhythm: Added breathing room margin bottom (18dp / 1.25rem) to "All Caught Up!" and pending action cards above the conversation stream.
- [x] Full-message draft reply editing: Empowered merchants to edit the entire outgoing reply before approval, replacing single-field price editing with in-place multiline text modification.
- [x] Fixed-below bottom dock & auto-scroll on draft edit: Locked input capsule firmly fixed below with extended bottom padding (280dp / 18rem) and auto-scrolled pending action card to the top when editing, preventing the dock from covering the text editing area.
- [x] "Action needed to approve" visual design: Aligned with Figma Make black, white, and gray palette for section badge (`1 action to approve`), obsidian dot, and card borders, removed redundant safety note, and enabled instant "All Caught Up!" dispatch transition.

### Phase 6: Comprehensive Security, Compliance & Distribution Audit [COMPLETED]
- [x] **Secrets & Key Quarantine**: Conducted full-repository regex scan (`git log` history & working tree) verifying zero production API keys, secrets, tokens, or credentials are hardcoded or tracked.
- [x] **Meta Platform Compliance Audit**:
  - `POST /webhook` HMAC-SHA256 signature verification with `crypto.timingSafeEqual` and sub-5s fast ACK.
  - PII-safe logging (logging only `page_id` and timestamp; excluding customer text, names, PSIDs, and phone numbers).
  - Outbound Messenger Send API gated strictly behind `approvalStatus === 'approved'` human confirmation.
  - 24-hour Standard Messaging Window validation enforced before any outbound Graph API request.
  - Page Access Tokens encrypted at rest with AES-256-GCM authenticated cipher (`iv.tag.data`).
  - Graph API rate-limit header telemetry (`x-app-usage`, `x-page-usage`, `x-business-use-case-usage`) with 75% warning and 90% throttle alerts.
- [x] **Public Distribution Hygiene**:
  - Comprehensive `.gitignore` protecting local `.env` files, build caches, mobile keystores, signing certificates, and local debug logs.
  - Sanitized `.env.example` templates in root, `backend/`, and `frontend/` with zero real secrets.
  - Open source licensing established in [LICENSE](file:///d:/mume-app/LICENSE) and [README.md](file:///d:/mume-app/README.md) with mandatory author attribution (credit to Jefferson Samson) and strict prohibition against claiming authorship.
  - Verified 24 backend tests passing (incl. 3 AI session-memory tests).
  - Verified clean TypeScript compilation and Vite production build.

### Phase 7: Real-Device Tactile Ergonomics & Private Distribution via Amazon Live App Testing (LAT) [PLANNED]
- [ ] **Real-App Native Tactile & Interaction Polish**:
  - Tactile haptic feedback integration (`expo-haptics`) across all touchpoints (WakeWord mic tap, action approval, draft edit toggles, category changes).
  - Native keyboard avoiding ergonomics with smooth spring physics auto-scroll and interactive dismiss (`keyboardShouldPersistTaps="handled"`).
  - Fluid typing states and responsive button feedback using native Android ripples (`android_ripple`) and zero-latency active pressed states.
- [ ] **Standalone Android Build Generation (.apk / .aab)**:
  - Configure `eas.json` preview / production build profiles for standalone Android output (`apk` for direct sideloading or `aab` for store testing).
  - Validate Android manifest permissions (microphone for voice dictation, internet for Meta Graph API sync) and app icon assets in `app.json`.
- [ ] **Amazon Live App Testing (LAT) Private Deployment**:
  - Set up Amazon Developer Console app container with bare minimum required metadata (App Title, Category) — strictly bypassing public review/store submission.
  - Initiate Live App Testing (LAT) slot: 100% free, private distribution with zero public search visibility.
  - Benefit: No 90-day expiration window (unlike TestFlight) and persistent true-production environment for invited testers.
  - Upload compiled `.apk` / `.aab` package and trigger automated Amazon security scan.
  - Whitelist invited merchant testers via their Amazon account emails for instant distribution through the standard Amazon Appstore client.
  - Maintain one-click "End Test" capability to instantly withdraw the testing build whenever necessary.

---

## 6. Verification Checklist

| Check | Target | Status | Verification Command |
| :--- | :--- | :--- | :--- |
| **Backend Tests** | 24 passing | PASSED | `npm --prefix backend test` |
| **Frontend Typecheck** | 0 TS errors | PASSED | `npx tsc --project frontend/tsconfig.json --noEmit` |
| **Root Typecheck** | 0 TS errors | PASSED | `npx tsc --noEmit` |
| **Vite Bundle Build** | Clean build | PASSED | `npm run build` |
| **Git Working Tree** | Clean / untracked free | PASSED | `git status` |
| **Secrets Audit** | Zero credentials | PASSED | Automated regex scan on tracked files |
| **Open Source Licensing** | Attribution & anti-plagiarism terms | PASSED | Review [LICENSE](file:///d:/mume-app/LICENSE) and [README.md](file:///d:/mume-app/README.md) |
| **RLS Hardening** | Permissive demo RLS live | PENDING | Harden `20261102` policies to owner-scoped before prod |
| **Standalone Android Build** | Valid .apk / .aab output | PENDING | `eas build --platform android --profile preview` |
| **Amazon LAT Distribution** | Private email tester access | PENDING | Amazon Developer Console LAT Dashboard |
