# MUME-APP — Demo Video Script & Production Guide
**Runtime: strictly 3:30 (210 seconds) | Format: YouTube 16:9 Landscape (1920×1080) | With Animation**

> Source of truth: [PLAN.md](/D:/mume-app/PLAN.md)
> Tagline (per PLAN § Highlight Entry): **Mume = Muse + Messenger. Manage Business Page Messenger without opening Messenger.**
> Pitch: Voice-first Page OS for sari-sari store owners and market vendors who cannot type while working.
> Event: META GLOBAL AI DEVELOPER HACKATHON — 10 days, Oct 26–Nov 4 (PHT: Oct 27 1:00 AM – Nov 5 10:00 AM) | Track: Indie Developer & Startups | Themes: Build for Your World (primary) + Push the Frontier | Stack: Meta Graph API v21.0 + Meta Model API + Open Weights

---

## 1. Production Guide (do this before recording)

### 1.1 Canvas & export (16:9 landscape)
- Set project to **1920×1080, 30fps**. Export H.264, 12–16 Mbps, AAC 320kbps. Title: `mume-app`.
- If recording a phone / narrow web app (`src/App.tsx`), do **not** export vertical. Frame it inside a 16:9 scene:
  - Left 60%: screen capture of the app (pillarboxed, rounded phone frame).
  - Right 40%: animated captions, step number, and feature label.
- Background: Antigravity canvas `#F8F9FC`, cards `#FFFFFF`, ink `#121317` (per [PLAN.md](/D:/mume-app/PLAN.md) §3.3 + `frontend/constants/theme.ts`).

### 1.2 Animation pack (reusable, keeps video under 210s)
1. **Cold open (2.5s):** cross-fade `mume-black.svg` (white canvas) → `mume-white.svg` (obsidian `#121317`) → app header. This is the real startup intro from PLAN §3.2 / `src/App.tsx`. Record it once, reuse as Scene 1.
2. **Lower-thirds:** pill badge style from app — white pill, obsidian text `#121317`, e.g. `1 action to approve`, `Listening`, `Thinking`, `Typing…`.
3. **Focus glow:** Electric Blue `#3279F9` ring + pulsing dot when voice/typing/scroll is active (PLAN §3.2). Add in edit as a stroke animation around the mic / chat box.
4. **VoiceWave:** 5-bar 60fps pulse (`VoiceWave` in `src/App.tsx`, blue `#3279F9`). Screen-record the real one; do not fake it.
5. **Transitions:** 12-frame cross-dissolve only. No spins/slides — total transition budget < 8s.
6. **Captions:** burn in English captions + key Tagalog cue words (`mansanas`, `magkano po`) since demo uses them.

### 1.3 Audio & voice
- One narrator, close mic, 150–160 wpm (~440–470 words total for 3:10 of VO + 0:20 music-only intro/outro). Script below is ~455 words — read at natural pace to land 3:30.
- Record VO first, then cut screen recording to VO. Add royalty-free upbeat track at −22 dB under VO, full volume only on intro/outro.
- Voice AI demo: use real mic dictation in the app dock. Speak clearly: *"Mume, magkano ang mansanas?"*

### 1.4 Recording checklist
- [ ] Facebook test Page linked, status badge green `Live Page` visible.
- [ ] Seed data ready: customer `Maria A.` + Red apples `$2.50/kg` inquiry → `pending_actions` row `waiting_approval`; catalog 3 items (Red apples, Carabao mango $4.00/kg, Lakatan banana $1.80/kg Low stock) from `INITIAL_PRODUCTS` in `src/App.tsx`.
- [ ] Browser zoom 125–150%, hide bookmarks, Do Not Disturb on, 1920×1080 capture.
- [ ] Mic permission granted for voice scene. Second take ready in case speech-to-text mishears.
- [ ] Settings screen shows Login with Facebook (`baseline-facebook.svg`), Page sync, currency USD.

### 1.5 Take list (minimum coverage)
1. Full startup 2.5s intro. 2. Approve flow end-to-end (edit draft → Approve → `All Caught Up!`). 3. Voice query + reply. 4. Typed query + reply. 5. Inbox scroll. 6. Catalog Add/Edit. 7. Settings pan. 8. Architecture diagram hold (5s).

---

## 2. Master Timeline (210 seconds — do not overrun)

| # | Time | Dur | Beat (required) | On-screen |
|---|------|-----|-----------------|-----------|
| 1 | 0:00–0:20 | 20s | Opening the app | Intro animation → obsidian header + `Welcome to Mume!` hero |
| 2 | 0:20–0:50 | 30s | Approve the AI (human-in-the-loop) | `Ready for You` badge → edit draft → Approve → `All Caught Up!` |
| 3 | 0:50–1:20 | 30s | Talk with AI using voice | Bottom dock mic → `Listening` + VoiceWave → `Thinking` → reply |
| 4 | 1:20–1:45 | 25s | Talk with AI using manual chat | Type in dock → `Typing…` blue glow → reply |
| 5 | 1:45–2:10 | 25s | Messages / conversation tab | Inbox tab, Maria A. thread, Realtime insert, history scroll |
| 6 | 2:10–2:30 | 20s | Catalog | Catalog tab, CRUD Add/Edit, stock pills, USD pricing |
| 7 | 2:30–2:50 | 20s | Settings | Drawer → Settings, FB Login status, Page sync, currency |
| 8 | 2:50–3:20 | 30s | How I built it in 10 days (hackathon) | Architecture diagram + stack cards |
| 9 | 3:20–3:30 | 10s | Closing CTA | Logo, tagline, links |

---

## 3. Word-for-Word Script (VO + action + graphics)

### SCENE 1 — Opening the app (0:00–0:20)
**VO (20s):**
> "Meet Mume — Muse plus Messenger. Manage your Business Page Messenger without opening Messenger. Built for vendors who work with their hands, not keyboards. Watch — it opens in two and a half seconds."

**Action:**
- 0:00–0:03: Black screen. Animated title `mume-app` + tagline types in.
- 0:03–0:06: Real startup cross-fade (`mume-black.svg` → `mume-white.svg`, PLAN §3.2).
- 0:06–0:20: Land on Home. Slow zoom to obsidian header `#121317` with centered white Mume logo, `Welcome to Mume!` hero, green `Live` Page badge.

**Graphics:** lower-third `01 · Open — 2.5s intro`.

### SCENE 2 — Approve the AI (0:20–0:50)
**VO (30s):**
> "A customer just asked about apples. Mume drafts the reply with price and stock — but it never sends alone. I review, I can edit the full message, then I tap Approve. One tap, sent through the Messenger Send API. All caught up."

**Action:**
- Show `Ready for You · 1 action to approve` badge + pending card (Maria A., `now`, Red apples $2.50/kg).
- Tap `Edit message`, change one word in multiline editor (dock auto-hides per PLAN §3.2), tap `Done editing`.
- Tap obsidian `Approve` pill → card flips to `All Caught Up!`.

**Graphics:** callout `Human-in-the-loop gate: approvalStatus must be approved — 403 COMPLIANCE_BLOCK otherwise` + `24-hour window enforced` (PLAN §2.2, `backend/src/app.js`).

### SCENE 3 — Talk with AI using voice (0:50–1:20)
**VO (30s):**
> "Hands full? Just talk. I tap the mic in the thumb-zone dock and ask in Tagalog — Magkano ang mansanas? Mume listens, thinks, and answers with price and stock from my catalog."

**Action:**
- Tap central mic in bottom-40% floating dock (PLAN §3.1). Status pill cycles `Listening` → `Thinking` with blue `#3279F9` glow + VoiceWave bars.
- Dictated text fills dock; reply appears bottom-anchored in 220px chat container: *"Red apples are $2.50 per kilo. In stock, 45 kg ready."*

**Graphics:** lower-third `03 · Voice-first — 72dp thumb zone · 60fps VoiceWave`.

### SCENE 4 — Talk with AI using manual chat (1:20–1:45)
**VO (25s):**
> "Or just type. Same dock, same brain — inventory, orders, follow-ups. It remembers the thread, so 'and the mangoes?' still knows what I mean."

**Action:**
- Type: `What about mango price and stock?` Active `Typing…` glow; send.
- Mume replies: *Carabao mangoes $4.00/kg, 30 kg Guimaras harvest in stock.* Show follow-up context working (last-20-messages + `conversation_sessions` summary per PLAN §5 Phase 3).

**Graphics:** split caption `Voice and chat share one session memory`.

### SCENE 5 — Messages / conversation tab (1:45–2:10)
**VO (25s):**
> "Every inquiry lives here. Live inbox — new threads pop in over Supabase Realtime, no refresh. I open Maria's thread and see the full history before I approve anything."

**Action:**
- Switch to Inbox/Messages tab (drawer or tab). New conversation inserts live (`realtime_inbox` channel).
- Open Maria A. thread, scroll history (scrollbar-free, blue reading glow + `Reading conversation` dot per PLAN §3.2).

**Graphics:** callout `Supabase Realtime: messages + pending_actions INSERT → instant UI`.

### SCENE 6 — Checking the catalog (2:10–2:30)
**VO (20s):**
> "My catalog, my prices. Three fruits, dollar pricing, stock pills. I add a photo, edit a price, and the AI quotes it correctly next time."

**Action:**
- Open Catalog tab (dock hides for full-screen browse per PLAN §3.1).
- Quick CRUD: Add item with photo upload + live preview → Edit price → stock badge `In stock / Low stock / Out of stock` (white pill, `#121317` text).

**Graphics:** callout `products table + pgvector embedding (1536) — price-aware replies`.

### SCENE 7 — Settings feature (2:30–2:50)
**VO (20s):**
> "Settings keeps me in control — Facebook Login, linked Page and sync status, currency in USD, and a safe logout with confirmation."

**Action:**
- Open drawer → Settings. Pan: `Login using Facebook` (`baseline-facebook.svg`), Connected Page card with sync indicator, USD currency row, `Log Out?` confirmation modal (session reset + empty states per PLAN §3.1).

**Graphics:** lower-third `07 · Settings — connect, currency, session`.

### SCENE 8 — How I built it in 10 days (2:50–3:20)
**VO (30s):**
> "How did I ship this in ten days for the Meta Global AI Developer Hackathon, Indie track? Day one to three: Express backend on Graph API v21 — HMAC webhooks, AES token vault, approval gate, twenty-six tests green. Days four to six: Expo voice ergonomics and the Figma web mirror you're seeing. Days seven to ten: Realtime inbox, session memory, hardening — zero secrets, locked-down RLS, clean TypeScript and Vite build."

**Action:**
- Hold architecture diagram (PLAN §1: Meta Platform → Express backend → Supabase Postgres; mobile client ↔ REST + Realtime).
- Cycle 4 cards, 6s each: `Graph API v21.0 + HMAC + AES-256-GCM` → `approvalStatus gate + 24h window + rate telemetry` → `Supabase: conversations/messages/pending_actions + sessions + pgvector` → `26 tests · 0 TS errors · clean build` (PLAN §6).
- Honest note on screen (small print): `Assistant brain today: rule-based getMumeAiReply with session context (backend/src/services/ai.js); live Meta Model API wiring is next.`

**Graphics:** timeline bar `Oct 26 → Nov 4 · 10 days`.

### SCENE 9 — Closing (3:20–3:30)
**VO (10s):**
> "Mume — hands-free Messenger for real stores. Try it, star it, message the Page. Salamat!"

**Action:** Obsidian end card, white logo, tagline, repo + demo links, hackathon badge. Music up, cut at exactly 3:30.

---

## 4. Edit-Time Budget Control
- Total VO target: **~455 words**. If over 3:30 in rehearsal, trim Scene 8 first (drop rate-telemetry line), never trim the Approve gate or voice scenes — judges score those.
- Hard out at 3:30: place end card at 3:20 and allow only 10s CTA. Use YouTube chapters matching the 9 timestamps above.
- Pre-shoot rehearsal: read Scenes 2–4 aloud with a stopwatch — must land 85s combined.

## 5. Compliance & Honesty Notes (from PLAN.md — keep in video or description)
- Human approval is mandatory (`approvalStatus !== 'approved'` → 403); 24-hour Standard Messaging Window enforced; `messaging_type: RESPONSE`.
- Tokens encrypted AES-256-GCM (`iv.tag.data`); HMAC-SHA256 webhooks with fast ACK; PII-safe logs; rate-limit telemetry at 75%/90%.
- Demo RLS note: public catalog reads only; writes go through backend / owner-scoped policies.
- Credit: built by Jefferson Samson per LICENSE / README attribution terms.
