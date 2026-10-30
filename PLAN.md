# mume-app - PLAN
Mume = Muse + Messenger. Manage Business Page Messenger without opening Messenger. A voice-first AI assistant for small businesses worldwide. Talk hands-free, Mume checks your Page inbox, drafts replies, and only sends after you confirm. English-first. Powered by Muse Spark, Muse Voice, Muse Image, and SAM 3.1.

> Voice-first, hands-free assistant for Facebook Page owners.
> You talk, Mume checks your Page, drafts replies, and asks for confirmation before sending.
> Built for sari-sari stores, small brands, and creators in the Philippines who can't type while working.

## Event Context

- **Event:** 10 days, Oct 26 - Nov 4
- **Tracks:** Indie Developer & Startups
- **Themes:** Build for Your World & Push the Frontier
- **Primary Theme:** Build for Your World - practical app for real people
- **Secondary Theme:** Push the Frontier - voice-orchestrated multi-agent system (wake word + cloud reasoning + SAM + Image)

## Core Problem

Small business owners manage everything on Facebook Page. They get messages, comments, and price inquiries all day, but can't type replies while packing, cooking, or serving customers. Result: unread messages, lost sales.

## Tech

**Repo:** Monorepo - 1 repo, 2 folders. Do NOT split frontend/backend into separate repos for the hackathon.
```
mume/
  /frontend  -> Expo + React Native, Android
  /backend   -> Node + Express
  /shared    -> types, prompts, constants
```

**Frontend:** Expo + React Native, Android
- Expo Audio for mic recording
- Porcupine (Picovoice) for on-device wake word "Mume" / "Hey Mume"
- VAD (Voice Activity Detection) for auto-stop
- Web Speech API / native TTS for voice reply
- Supabase Realtime for live inbox updates

**Backend:** Node + Express
- REST + Webhooks for Facebook Graph API
- Orchestration layer for Meta Model API
- Supabase client (service role for server-side)

**DB:** Supabase (Postgres + pgvector + Realtime + Auth + Storage)
- Why Postgres: relational data (users, pages, products, messages) + vector search for products + realtime for new messages. Firebase/Mongo are worse for price tables + vector search.

**AI:** Meta Model API + Open Weights
- Muse Spark 1.3 - Main brain / orchestrator. Plans, calls tools, drafts replies. $1.25 in / $4.25 out per 1M tokens.
- Muse Voice Transcribe - Speech-to-text only. Turns voice into text, speaker separation for 20+ voices. $0.18 per hour of audio.
- Muse Image - Generates / edits product price cards. $0.01 per image.
- SAM 3.1 - Segment Anything Model 3.1. Detects, segments, tracks objects in images/videos from text prompts. Auto-cuts product photos to build catalog. $2.50 per 1k images via API, weights also open.
- Muse Wonder (optional / stretch) - Frontier reasoning for hardest tasks. $4 in / $20 out per 1M tokens.
- Muse Glimmer 30B (optional / offline) - FREE, Apache 2.0 open-weight, runs on laptop single GPU. Offline draft mode. Not for phone.
- Muse Code - Terminal coding agent used to build Mume faster. CLI free, tokens billed.

## MVP Features

1. **Link Page**
   - Facebook Login, link Business Page
   - Permissions: `pages_manage_metadata`, `pages_read_engagement`, `pages_messaging`
   - Stores encrypted Page Access Token in Supabase

2. **Auto-listen on Wake Word**
   - Always-on local listening (no cloud until wake word)
   - Triggers on "Mume" or "Hey Mume"
   - Button glows + plays *ding* on activation
   - Auto-start recording, VAD auto-stop after 8s silence / speech end
   - Does NOT send audio to cloud until wake word detected (privacy + cost)

3. **Check Inbox + Comments**
   - `GET /{page-id}/conversations` for Messenger inbox
   - `GET /{page-id}/feed` for post comments
   - `GET /{page-id}/insights` for summary
   - Summarize: "2 unread, 1 price inquiry for apple"

4. **Confirm Price Before Sending**
   - Mume never auto-sends price without approval (safety / sandbox rule)
   - Creates `pending_actions` row: draft_reply + suggested_price + status=waiting_approval
   - User says "Yes" / "No, $3" -> backend sends via Graph API
   - Knowledge base: products table with name, price, unit, embedding (pgvector) for "apple" / "mansanas" / "red apple" matching

5. **Voice Reply**
   - Mume replies to YOU with voice (TTS), not just text
   - Muse Voice Transcribe is STT only, so TTS is separate: Web Speech API for MVP, ElevenLabs / Play.ht for natural Taglish in V2
   - Customer still gets text reply on Messenger

6. **SAM + Image Price Card (Wow Feature)**
   - Upload 1 photo of stall -> SAM 3.1 auto-cuts each fruit -> creates product catalog
   - Customer asks for apple -> Muse Image generates price card image to send

## User Flow (Demo Script)

```
User installs app, links Page.

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
Customer: "Do you have mango?" -> Mume replies with Image price card
```

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

### Orchestration (What Spark Does)
Spark is the conductor. It does NOT just chat.
1. Plan: Break "check my page" into steps
2. Delegate: Call get_page_unread_messages(), get_products(), etc.
3. Sequence: Inbox -> find inquiry -> search product -> draft -> ask confirmation -> send

### Sandboxing
- Backend runs Facebook / AI calls in isolated, restricted environment
- Limited file access, no secrets in frontend, Page tokens encrypted in DB
- Mume can draft but cannot send without user confirmation (human-in-the-loop)

## Database Schema (Supabase Postgres)

```sql
users (id, email, fb_user_id)
pages (id, user_id, fb_page_id, page_access_token_encrypted, page_name)
products (id, page_id, name, price, unit, image_url, embedding vector(1536))
conversations (id, page_id, customer_psid, last_message_at)
messages (id, conversation_id, sender, text, created_at, is_from_customer)
pending_actions (id, conversation_id, draft_reply, suggested_price, status) -- waiting_approval / approved / sent
```

- `products.embedding` uses pgvector for semantic search: "mansanas" matches "apple"
- `pending_actions` + Supabase Realtime = live approval flow on phone

## Plan

### Phase 1: Setup + Login (Day 1-2)
- [ ] Scaffold monorepo: frontend + backend
- [ ] Supabase project + tables above + Auth
- [ ] Facebook App in Meta for Developers, add Page permissions
- [ ] Facebook Login + Link Page flow working
- [ ] Test Graph API: read inbox + comments

### Phase 2: Voice (Day 3-4)
- [ ] Porcupine wake word "Mume" / "Hey Mume" working on-device
- [ ] Mic recording + VAD auto-stop
- [ ] Muse Voice Transcribe working: audio -> text
- [ ] TTS voice reply working (Web Speech API MVP)
- [ ] Button animation on wake word

### Phase 3: Spark Brain (Day 5-6)
- [ ] Spark agent with tools: get_page_unread_messages(), get_page_comments(), send_message(), get_products()
- [ ] System prompt: "You are Mume, assistant for PH small businesses. Always ask confirmation before sending price."
- [ ] Knowledge base: products table + pgvector search
- [ ] Pending approval flow: draft -> user says Yes -> send
- [ ] Taglish / code-switch handling test

### Phase 4: SAM + Image Price Card (Day 7-8)
- [ ] SAM 3.1: upload stall photo -> segment products -> auto-create catalog
- [ ] Muse Image: generate price card image from product + price
- [ ] Send image + text to customer via Graph API
- [ ] Instagram Professional stretch: same API, enable DM reading (requires Page linked)

### Phase 5: Polish + Demo (Day 9-10)
- [ ] Demo script: 2 phones (owner + customer)
- [ ] Error handling: no signal, no messages, wrong price
- [ ] Pitch deck: Before/After - "Without Mume: 37 unread. With Mume: 0, while cooking."
- [ ] Record demo video, submit

## TODO

- [ ] Scaffold done (monorepo frontend + backend + Supabase)
- [ ] Facebook Page linking working
- [ ] Wake word "Hey Mume" working
- [ ] Transcribe working (Voice Transcribe -> text)
- [ ] Spark working (orchestration + tools)
- [ ] Send reply working (Graph API + pending approval)
- [ ] Voice reply working (TTS)
- [ ] SAM 3.1 auto-catalog working
- [ ] Muse Image price card working
- [ ] Demo video recorded

## Costs (Hackathon Estimate)

- Muse Voice Transcribe: $0.18 / hour - ~$1 for demo
- Muse Spark: $1.25 in / $4.25 out per 1M tokens - ~$2-5 for demo
- Muse Image: $0.01 / image
- SAM 3.1: $2.50 / 1k images
- Supabase: Free tier
- Porcupine: Free for hackathon
- Total MVP cost: < $10

## Risks & Mitigations

- **Facebook App Review takes time:** Apply for permissions Day 1, use Test Page + Test Users for dev
- **Personal Messenger not allowed:** Do NOT try to automate personal Messenger / personal account. API only allows Pages. Personal automation = banned + disqualified.
- **WhatsApp Business:** Needs business verification + template approval, will not finish in 10 days. Save for V3.
- **Wake word false triggers:** Add 1s cooldown, local-only listening, VAD timeout
- **Voice Transcribe is STT only:** Need separate TTS for voice reply

## Pitch Line

> "Voice-first Page OS for sari-sari store owners who can't type while working."
> Mume = Muse + Messenger. Manage Business Page Messenger without opening Messenger.

## What Is NOT In MVP

- WhatsApp Business (V3)
- Auto-send without confirmation (unsafe)
- Running Glimmer / Spark Open on phone (they are for laptop / server, not phone)
- Personal Messenger automation (not allowed by Meta)
