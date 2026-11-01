# Mume

**Mume = Muse + Messenger. Manage Business Page Messenger without opening Messenger.**

> ## 🏆 Highlight Entry - Meta Global AI Developer Hackathon
> **Project:** Mume  
> **Track:** Indie Developer & Startups  
> **Themes:** Build for Your World (primary) + Push the Frontier  
> **Tagline:** Mume = Muse + Messenger. Manage Business Page Messenger without opening Messenger.  
> **Pitch:** Voice-first Page OS for sari-sari store owners and market vendors who cannot type while working. Hands-free, wake-word assistant that syncs with your Facebook Business Page, drafts context-aware replies, and strictly enforces human-in-the-loop confirmation before dispatching customer responses.  
> **Event:** 10 days, Oct 26 - Nov 4 | PH Time: Oct 27, 1:00 AM – Nov 5, 10:00 AM (GMT+8 / PHT) | Built with Meta Graph API v21.0 + Meta Model API + Open Weights

---

## 🌟 Overview

Small business owners, market vendors, and solo merchants handle daily inquiries, comments, and price checks through their Facebook Business Page. However, typing replies while cooking, packing orders, or serving customers is inconvenient and error-prone, leading to unanswered messages and missed sales.

**Mume** provides a hands-free, voice-first operating system for Facebook Business Pages. It listens locally for its wake word, syncs incoming Messenger inquiries in real time, prepares AI-drafted responses with catalog pricing, and requires explicit merchant approval before sending anything via the Meta Graph API.

---

## 🏗️ Architecture & Topology

Mume is designed as a secure multi-tier system with strict separation of concerns:

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

## 🔒 Security & Meta Platform Compliance

Mume is engineered strictly within Meta Developer Policies and Platform Terms:

1. **HMAC-SHA256 Webhook Verification**: Every incoming webhook request (`POST /webhook`) validates the `x-hub-signature-256` header against `FB_APP_SECRET`. Unauthenticated or forged payloads are rejected immediately with HTTP `401 Unauthorized` using `crypto.timingSafeEqual`.
2. **Sub-5-Second Webhook ACK**: The receiver issues `res.status(200).send('EVENT_RECEIVED')` immediately upon signature validation, delegating payload processing asynchronously via `setImmediate` to guarantee compliance with Meta's timeout thresholds.
3. **PII-Safe Logging**: Logs record only operational metadata (`page_id`, timestamp). Customer message bodies, PSIDs, names, and phone numbers are excluded from server logs.
4. **Mandatory Human-in-the-Loop Confirmation**: Outbound Messenger messages require explicit merchant approval (`approvalStatus === 'approved'`). Automated unsolicited sends are blocked.
5. **24-Hour Standard Messaging Window**: The backend checks customer timestamp freshness (`lastCustomerMessageAt`). Responses outside the standard 24-hour window are blocked.
6. **Rate-Limit Telemetry**: Graph API responses inspect `x-app-usage`, `x-page-usage`, and `x-business-use-case-usage` headers. Proactive warnings trigger at 75% capacity, and backoff warnings trigger at 90%.
7. **AES-256-GCM Token Encryption**: Page Access Tokens are encrypted at rest with AES-256-GCM and unique initialization vectors (`pages.page_access_token_encrypted`). Plaintext tokens are never stored or leaked to client applications.
8. **Sanitized Public Distribution**: All template files (`.env.example`) and codebases use sanitized placeholders. The repository is audited against secret scanning criteria.

---

## 🎨 Mobile Ergonomics & Google Antigravity Design System

Complies with the **Cross-Platform Mobile Responsiveness and Ergonomics Directive (CPMRED-001)**:

- **Bottom 40% Thumb Zone**: Primary actions (floating 72dp `WakeWordButton`, quick approval chips) reside in the natural one-handed reach zone.
- **Minimum Tap Target**: 48x48dp minimum with 8dp spacing for accurate operation on the move.
- **60 FPS Reanimated UI**: Smooth, UI-thread audio waveform animations with zero frame drop.
- **1.5-Second Startup Intro**: Fluid cross-fade startup transition between `mume-black.svg` (white canvas) and `mume-white.svg` (obsidian black canvas), flowing directly into the app header.
- **Constant-Height Mume AI Chat with Auto-Follow**: Locked container height with internal scrollbar, automatic scroll adjustment so the merchant clearly sees conversation history while typing, and transient active-typing electric blue highlight that triggers during keystrokes and automatically dismisses after pausing.
- **Product Catalog Management**: Interactive modal CRUD with custom photo upload, live image preview, and stock status indicators.
- **International Pricing & Currency**: Standardized USD ($) currency across catalog products, suggested draft responses, and simulated store inventory.
- **Official Meta Branding**: Integrated `baseline-facebook.svg` across all Page connection touchpoints.
- **Official Google Antigravity Palette**:
  - `#FFFFFF` (`--palette-grey-0`): Elevated surfaces & cards
  - `#F8F9FC` (`--palette-grey-10`): Screen canvas background
  - `#EFF2F7` (`--palette-grey-20`): Draft reply wells
  - `#E1E6EC` (`--palette-grey-100`): Hairline dividers
  - `#121317` (`--palette-grey-1200`): Obsidian ink & primary CTAs
  - `#3279F9` (`--palette-blue-600`): VoiceWave electric blue
  - `#00B95C` (Emerald), `#FBBC04` (Amber), `#FC413D` (Coral): Real-time status accents

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Android Studio / Expo Go (for mobile preview)
- Meta Developer Account (for Facebook Business Page & Graph API access)
- Supabase Account (for Postgres database & Realtime sync)

---

### 1. Repository Setup

```bash
git clone https://github.com/your-team/mume.git
cd mume
```

---

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Configure `backend/.env`:

```env
# Meta Model API
META_MODEL_API_KEY=your_meta_model_api_key
META_MODEL_BASE_URL=https://api.dev.meta.ai

# Supabase Postgres & Realtime (Server-side service_role)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Facebook App Credentials & Webhook Handshake
FB_APP_ID=your_fb_app_id
FB_APP_SECRET=your_fb_app_secret
FB_VERIFY_TOKEN=your_webhook_verify_token

# AES-256-GCM Token Encryption Key (Optional, 32-byte key or derived from FB_APP_SECRET)
TOKEN_ENCRYPTION_KEY=

PORT=3000
```

Run tests and start the server:

```bash
# Execute automated test suite (13 passing tests)
npm test

# Start Express server
npm run dev
```

For local webhook testing with Meta, expose your server using ngrok:

```bash
ngrok http 3000
```

---

### 3. Frontend Setup (Expo Mobile App)

```bash
cd ../frontend
npm install
cp .env.example .env
```

Configure `frontend/.env`:

```env
# URL of your running backend (Render URL or local ngrok / LAN IP)
EXPO_PUBLIC_API_URL=http://localhost:3000

# Supabase Project Credentials (Client-side Anon Key)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Start Expo:

```bash
npx expo start
```

Scan the QR code with Expo Go on Android or run `npm run web` for browser preview.

---

### 4. Supabase Database Migration

1. In your Supabase Dashboard, navigate to the **SQL Editor**.
2. Run the migration script located at:
   `supabase/migrations/20261031000000_create_mume_schema.sql`
3. This creates all core tables, activates the `vector` extension, sets up Row-Level Security policies, and registers the `messages` and `pending_actions` Realtime publications.

---

### 5. Facebook App & Page Configuration

1. Visit [Meta for Developers](https://developers.facebook.com/) and create a Business App.
2. Under **Add Products**, add **Facebook Login** and **Messenger**.
3. In **App Review > Permissions and Features**, request:
   - `pages_manage_metadata`
   - `pages_read_engagement`
   - `pages_messaging`
   - `pages_show_list`
4. In **Webhooks > Page**, set the Callback URL:
   - URL: `https://your-ngrok-or-domain.com/webhook`
   - Verify Token: The value defined in `FB_VERIFY_TOKEN`
   - Subscribed Fields: `messages`, `messaging_postbacks`, `feed`

---

## 🧪 Verification & Audit Commands

Run the full verification suite across the codebase:

```bash
# 1. Backend test suite (HMAC signatures, AES encryption, OAuth, Webhooks)
npm --prefix backend test

# 2. Frontend TypeScript typecheck
npx tsc --project frontend/tsconfig.json --noEmit

# 3. Root TypeScript check
npx tsc --noEmit

# 4. Vite companion web build
npm run build
```

---

## 📜 Compliance Endpoints

- **Privacy Policy**: `GET /privacy`
- **Data Deletion Instructions**: `GET /data-deletion`
- **Webhook Handshake**: `GET /webhook`
- **Webhook Receiver**: `POST /webhook`
- **Reply Dispatcher**: `POST /api/pages/:pageId/messages/reply`

---

## 📄 License

Hackathon Project. Built with Meta Muse models via Meta Model API and Meta Graph API v21.0. Distributed for open development under the MIT License.
