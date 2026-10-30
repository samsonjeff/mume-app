# mume-app
Mume = Muse + Messenger. Manage Business Page Messenger without opening Messenger. A voice-first AI assistant for small businesses worldwide. Talk hands-free, Mume checks your Page inbox, drafts replies, and only sends after you confirm. English-first. Powered by Muse Spark, Muse Voice, Muse Image, and SAM 3.1.

> ## 🏆 Highlight Entry - Meta Global AI Developer Hackathon
> **Project:** Mume
> **Track:** Indie Developer
> **Themes:** Build for Your World (primary) + Push the Frontier
> **Tagline:** Mume = Muse + Messenger. Manage Business Page Messenger without opening Messenger.
> **Pitch:** Voice-first Page OS for sari-sari store owners who can't type while working. Hands-free, wake-word assistant that checks your Facebook Page, drafts replies, and asks for confirmation before sending.
> **Event:** 10 days, Oct 26 - Nov 4 | PH Time: Oct 27, 1:00 AM – Nov 5, 10:00 AM (GMT+8 / PHT) | $1M Prize Pool | Built with Meta Model API + Muse Code + Open Weights

> Voice-first, hands-free assistant for Facebook Page owners.
> You talk, Mume checks your Page, drafts replies, and asks for confirmation before sending.
> Built for sari-sari stores, small brands, and creators in the Philippines who can't type while working.

---

## Event

- **Event:** 10 days, Oct 26 - Nov 4
- **PH Time:** Oct 27, 1:00 AM – Nov 5, 10:00 AM (GMT+8 / PHT)
- **Original Time:** Oct 26, 1:00 PM EDT – Nov 4, 9:00 PM EST
- **Tracks:** Indie Developer & Startups
- **Themes:** Build for Your World & Push the Frontier
- **Primary Theme:** Build for Your World

---

## Demo

```
User: "Hey Mume..." [wake word, button glows, ding]
User: "What's the current update on my page?"
Mume (voice): "Today no comments, but someone messaged asking for price of apple. Should I tell them $2 per 1kg?"
User: "Okay, tell that customer, apple price is $2 per 1kg"
Mume (voice): "Sent."
Mume (to customer on Messenger): "Hello, our apple price is $2 per 1kg"
```

Second demo - product photo:
```
Owner uploads stall photo -> SAM 3.1 segments apple, mango, banana -> catalog created
Customer: "Do you have mango?" -> Mume replies with Muse Image price card
```

---

## Features

### MVP

1. **Link Page**
   - Facebook Login, link Business Page
   - Permissions: `pages_manage_metadata`, `pages_read_engagement`, `pages_messaging`

2. **Auto-listen on Wake Word**
   - Always-on local listening (no cloud until wake word)
   - Triggers on "Mume" or "Hey Mume"
   - Button glows + plays *ding* on activation
   - VAD auto-stop after 8s silence / speech end
   - Audio does NOT go to cloud until wake word detected

3. **Check Inbox + Comments**
   - `GET /{page-id}/conversations` - Messenger inbox
   - `GET /{page-id}/feed` - Post comments
   - `GET /{page-id}/insights` - Page summary

4. **Confirm Price Before Sending**
   - Mume never auto-sends price without approval
   - Creates `pending_actions` row: draft_reply + suggested_price + status=waiting_approval
   - User says "Yes" / "No, $3" -> backend sends via Graph API

5. **Voice Reply**
   - Mume replies to YOU with voice (TTS), not just text
   - Muse Voice Transcribe is STT only, so TTS is separate: Web Speech API for MVP

6. **SAM + Image Price Card**
   - Upload 1 photo of stall -> SAM 3.1 auto-cuts each fruit -> creates product catalog
   - Customer asks for apple -> Muse Image generates price card image to send

### Not in MVP

- WhatsApp Business (V3 - needs business verification + template approval)
- Auto-send without confirmation (unsafe)
- Running Glimmer / Spark Open on phone (they are for laptop / server)
- Personal Messenger automation (not allowed by Meta - API only allows Pages)

---

## Tech Stack

**Repo:** Monorepo - 1 repo, 2 folders
```
mume/
  /frontend  -> Expo + React Native, Android
  /backend   -> Node + Express
  /shared    -> types, prompts, constants
  PLAN.md
  README.md
```

**Frontend:** Expo + React Native, Android
- Expo Audio for mic
- Porcupine (Picovoice) for on-device wake word
- VAD for auto-stop
- TTS for voice reply
- Supabase Realtime for live updates

**Backend:** Node + Express
- REST + Webhooks for Facebook Graph API
- Orchestration layer for Meta Model API

**DB:** Supabase (Postgres + pgvector + Realtime + Auth + Storage)

**AI - Meta Models:**
- **Muse Spark 1.3** - Main brain / orchestrator. Plans, calls tools, drafts replies. $1.25 in / $4.25 out per 1M tokens.
- **Muse Voice Transcribe** - Speech-to-text only. $0.18 / hour.
- **Muse Image** - Generates / edits product price cards. $0.01 / image.
- **SAM 3.1** - Detects, segments, tracks objects from text prompts. $2.50 / 1k images via API.
- **Muse Wonder** (stretch) - Frontier reasoning. $4 in / $20 out per 1M tokens.
- **Muse Glimmer 30B** (optional offline) - FREE, Apache 2.0 open-weight, runs on laptop single GPU.
- **Muse Code** - Used to build Mume faster. CLI free, tokens billed.

---

## Architecture

```
[Phone: Expo App]
  - Porcupine Wake Word (local, on-device)
  - Mic + VAD
  - TTS Voice Reply
        |
        v (only after wake word)
[Backend: Node + Express]
  - POST /voice -> Muse Voice Transcribe API -> text
  - POST /agent -> Muse Spark API (orchestrator)
        |
        +--> Supabase (products, pending_actions, messages)
        +--> Facebook Graph API (inbox, comments, send)
        +--> SAM 3.1 API (segment photos)
        +--> Muse Image API (price card)
        |
        v
[Supabase Realtime -> Phone updates instantly]
```

### Orchestration
Spark is the conductor. It does not just chat.
1. Plan: Break "check my page" into steps
2. Delegate: Call `get_page_unread_messages()`, `get_products()`, etc.
3. Sequence: Inbox -> find inquiry -> search product -> draft -> ask confirmation -> send

### Sandboxing
- Backend runs AI / Facebook calls in isolated, restricted environment
- Limited file access, no secrets in frontend, Page tokens encrypted in DB
- Mume can draft but cannot send without user confirmation (human-in-the-loop)

---

## Database Schema (Supabase)

```sql
users (id, email, fb_user_id)
pages (id, user_id, fb_page_id, page_access_token_encrypted, page_name)
products (id, page_id, name, price, unit, image_url, embedding vector(1536))
conversations (id, page_id, customer_psid, last_message_at)
messages (id, conversation_id, sender, text, created_at, is_from_customer)
pending_actions (id, conversation_id, draft_reply, suggested_price, status) -- waiting_approval / approved / sent
```

- `products.embedding` uses pgvector for semantic search: "mansanas" matches "apple"
- `pending_actions` + Supabase Realtime = live approval flow

---

## Getting Started

### Prerequisites

- Windows + Android phone (no iOS / Mac needed)
- Node.js 20+ / VS Code
- Android Studio (for emulator) + Expo Go app on phone
- Meta Developer Account
- Supabase Account

### 1. Clone

```bash
git clone https://github.com/your-team/mume.git
cd mume
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Fill `.env`:
```env
# Meta Model API
META_MODEL_API_KEY=your_key
META_MODEL_BASE_URL=https://api.dev.meta.ai

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Facebook
FB_APP_ID=your_fb_app_id
FB_APP_SECRET=your_fb_app_secret
FB_VERIFY_TOKEN=your_webhook_verify_token

# Wake Word
PICOVOICE_ACCESS_KEY=your_picovoice_key

PORT=3000
```

```bash
npm run dev
```

### 3. Frontend Setup (Expo)

```bash
cd ../frontend
npm install
cp .env.example .env
```

Fill `.env`:
```env
EXPO_PUBLIC_API_URL=http://YOUR_LAPTOP_IP:3000
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Run:
```bash
npx expo start
```

Scan QR with Expo Go on Android.

### 4. Facebook Setup

1. Go to developers.facebook.com -> Create App -> Type: Business
2. Add products: Facebook Login + Messenger
3. Add permissions: `pages_manage_metadata`, `pages_read_engagement`, `pages_messaging`
4. Create a Test Facebook Page: "Mume Test Store"
5. Webhook: `https://your-ngrok-url.ngrok-free.app/webhook` with Verify Token from `.env`

For local dev, use ngrok:
```bash
ngrok http 3000
```

### 5. Supabase Setup

Run SQL in Supabase SQL Editor (see Database Schema above).
Enable Realtime for `messages` and `pending_actions` tables.

---

## Usage

1. Open app on Android
2. Tap **Link Page** -> Login with Facebook -> Pick your Page
3. Say **"Hey Mume..."** -> Wait for ding + button glow
4. Say **"What's the update on my page?"**
5. Mume speaks summary + asks for confirmation if price inquiry found
6. Say **"Yes, $2 per kg"** -> Mume sends reply on Messenger + speaks "Sent"

---

## Project Structure

```
frontend/
  app/
    index.tsx          # Home / Dashboard
    link-page.tsx      # Facebook Login + Link Page
    chat.tsx           # Voice + Conversation view
  components/
    WakeWordButton.tsx # Glows on "Hey Mume"
    VoiceWave.tsx
  lib/
    api.ts             # Calls backend
    supabase.ts

backend/
  src/
    index.ts           # Express entry
    routes/
      voice.ts         # POST /voice -> Voice Transcribe
      agent.ts         # POST /agent -> Muse Spark
      facebook.ts      # Webhook + Graph API
      products.ts      # SAM + Image
    services/
      spark.ts         # Orchestrator + tools
      transcribe.ts
      facebook.ts
      supabase.ts
```

---

## Costs (Hackathon Estimate)

- Muse Voice Transcribe: $0.18 / hour - ~$1 for demo
- Muse Spark: $1.25 in / $4.25 out per 1M tokens - ~$2-5 for demo
- Muse Image: $0.01 / image
- SAM 3.1: $2.50 / 1k images
- Supabase: Free tier
- Porcupine: Free for hackathon
- **Total MVP: < $10**

---

## Roadmap

- [ ] Phase 1: Setup + Login (Day 1-2)
- [ ] Phase 2: Voice - Wake Word + Transcribe + TTS (Day 3-4)
- [ ] Phase 3: Spark Brain - Orchestration + Knowledge Base (Day 5-6)
- [ ] Phase 4: SAM + Image Price Card (Day 7-8)
- [ ] Phase 5: Polish + Demo (Day 9-10)

See [PLAN.md](./PLAN.md) for full 10-day plan.

---

## Risks

- **Facebook App Review takes time:** Apply Day 1, use Test Page + Test Users for dev
- **Personal Messenger not allowed:** API only allows Pages. Personal automation = banned + disqualified.
- **WhatsApp Business:** Needs verification + template approval, will not finish in 10 days. Save for V3.

---

## Pitch

> Mume = Muse + Messenger. Manage Business Page Messenger without opening Messenger.
> Voice-first Page OS for sari-sari store owners who can't type while working.

---

## License

Hackathon project. Built with Meta Muse models via Meta Model API.
