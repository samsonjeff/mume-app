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
  - Left 60%: real screen footage (`public/raw-video.mp4`) in a rounded frame with Ken Burns push + screenshot PIP (`public/mume-logo.png`).
  - Right 40%: animated captions, step number, and feature label.
- Background: Antigravity canvas `#F8F9FC`, cards `#FFFFFF`, ink `#121317` (per [PLAN.md](/D:/mume-app/PLAN.md) §3.3 + `frontend/constants/theme.ts`). Staged Remotion assets live in `mume-video/public/`: `mume-black.svg`, `mume-white.svg`, `mume-logo.png`, `mume-logo-white.png`, `raw-video.mp4`, `vo/*.mp3` (copied from `mume-video/raw/` + `mume-video/raw/male/`).

### 1.2 Animation pack (reusable, keeps video under 210s)
1. **Cold open / logo first (`LogoSting.tsx`, Scene 1 frames 0–90):** spring-in `mume-black.svg` on white canvas → cross-fade to `mume-white.svg` on obsidian `#121317` → dissolve into the Scene 1 card. The logo is the first thing on screen; no footage plays before it. This mirrors the real startup intro from PLAN §3.2 / `src/App.tsx`, rendered in code.
2. **Lower-thirds:** pill badge style from app — white pill, obsidian text `#121317`, e.g. `1 action to approve`, `Listening`, `Thinking`, `Typing…`.
3. **Focus glow:** Electric Blue `#3279F9` ring + pulsing dot when voice/typing/scroll is active (PLAN §3.2). Add in edit as a stroke animation around the mic / chat box.
4. **VoiceWave:** live 5-bar pulse (`mume-video/src/scenes/VoiceWave.tsx`, blue `#3279F9`) rendered in code over the footage on the voice scene, plus a breathing blue focus-glow ring on approve/chat/voice beats (`MediaPanel.tsx`). Screenshot PIP (`mume-logo.png`) drifts in mid-scene; footage gets a slow Ken Burns push; captions stagger in beat-by-beat with a spring badge, progress hairline, and slide-up lower-third (`SceneCard.tsx`).
5. **Transitions:** 12-frame cross-dissolve only. No spins/slides — total transition budget < 8s.
6. **Captions:** burn in English captions + key Tagalog cue words (`mansanas`, `magkano po`) since demo uses them.

### 1.3 Audio & voice
- One narrator, close mic, 150–160 wpm (~460–480 words total for 3:10 of VO + 0:20 music-only intro/outro). Script below is ~475 words — read at natural pace to land exactly 3:30. Do not add lines; if over, trim Scene 9 first.
- Record VO first, then cut screen recording to VO. Add royalty-free upbeat track at −22 dB under VO, full volume only on intro/outro.
- Voice AI demo: per-scene voiceover is wired in code — `Composition.tsx` plays `public/vo/<scene-id>.mp3` inside each scene's `TransitionSeries.Sequence`, so the render at `mume-video/out/mume-demo.mp4` already carries narration (no separate VO dub step).

### 1.4 Recording checklist
- [ ] Facebook test Page linked, status badge green `Live Page` visible.
- [ ] Seed data ready: customer `Maria A.` + Red apples `$2.50/kg` inquiry → `pending_actions` row `waiting_approval`; catalog 3 items (Red apples, Carabao mango $4.00/kg, Lakatan banana $1.80/kg Low stock) from `INITIAL_PRODUCTS` in `src/App.tsx`.
- [ ] Browser zoom 125–150%, hide bookmarks, Do Not Disturb on, 1920×1080 capture.
- [ ] Mic permission granted for voice scene. Second take ready in case speech-to-text mishears.
- [ ] Settings screen shows Login with Facebook (`baseline-facebook.svg`), Page sync, currency USD.
- [ ] Pro modal ready: auto-pops 3s after splash on Home + reopens via header ticket icon (`subscription-upgrade` in `src/App.tsx` + `src/components/Header.tsx`). Price $9.99/mo visible; toast `Welcome to Mume Pro!` tested.

### 1.5 Take list (minimum coverage) — all rendered in code, no manual takes
1. Logo sting first (Scene 1 frames 0-90, no footage beneath) + Pro tease card. 2. Approve flow end-to-end (edit draft → Approve → `All Caught Up!`). 3. Voice query + reply. 4. Typed query + reply. 5. Inbox scroll. 6. Catalog Add/Edit. 7. Settings pan. 8. Header ticket tap → Pro modal benefits → trial tap → Pro toast. 9. Architecture diagram hold (5s). Verify: `npm test` 4/4 + `npx tsc --noEmit` clean + spot stills (frames 20/55/200/1000), then `npx remotion render src/index.ts mume-demo out/mume-demo.mp4 --overwrite`.

---

## 2. Master Timeline (210 seconds — do not overrun)

| # | Time | Dur | Beat (required) | On-screen |
|---|------|-----|-----------------|-----------|
| 1 | 0:00–0:18 | 18s | Opening the app | Intro animation → Pro auto-pop (3s) → obsidian header + `Welcome to Mume!` |
| 2 | 0:18–0:46 | 28s | Approve the AI (human-in-the-loop) | `Ready for You` badge → edit draft → Approve → `All Caught Up!` |
| 3 | 0:46–1:14 | 28s | Talk with AI using voice | Bottom dock mic → `Listening` + VoiceWave → `Thinking` → reply |
| 4 | 1:14–1:37 | 23s | Talk with AI using manual chat | Type in dock → `Typing…` blue glow → reply |
| 5 | 1:37–2:00 | 23s | Messages / conversation tab | Inbox tab, Maria A. thread, Realtime insert, history scroll |
| 6 | 2:00–2:18 | 18s | Catalog | Catalog tab, CRUD Add/Edit, stock pills, USD pricing |
| 7 | 2:18–2:35 | 17s | Settings | Drawer → Settings, FB Login status, Page sync, currency |
| 8 | 2:35–2:55 | 20s | Pro plan modal + benefits | Header ticket → `MUME PRO $9.99/mo` → 3 benefits → trial → Pro toast |
| 9 | 2:55–3:20 | 25s | How I built it in 10 days (hackathon) | Architecture diagram + stack cards |
| 10 | 3:20–3:30 | 10s | Closing CTA | Logo, tagline, links |

---

## 3. Word-for-Word Script (VO + action + graphics)

### SCENE 1 — Opening the app (0:00–0:18)
**VO (18s):**
> "Meet Mume — Muse plus Messenger. Manage your Business Page Messenger without opening Messenger. Built for vendors who work with their hands, not keyboards. Watch — it opens in two and a half seconds."

**Action:**
- 0:00–0:03: Black screen. Animated title `mume-app` + tagline types in.
- 0:03–0:06: Real startup cross-fade (`mume-black.svg` → `mume-white.svg`, PLAN §3.2).
- 0:06–0:09: Pro modal auto-pops on Home for 3s (`subscriptionModalOpen` in `src/App.tsx`) — tease it, then dismiss. Do not read benefits yet; Scene 8 covers them.
- 0:09–0:18: Land on Home. Slow zoom to obsidian header `#121317` with centered white Mume logo, `Welcome to Mume!` hero, green `Live` Page badge.

**Graphics:** lower-third `01 · Open — 2.5s intro + Pro tease`.

### SCENE 2 — Approve the AI (0:18–0:46)
**VO (28s):**
> "A customer just asked about apples. Mume drafts the reply with price and stock — but it never sends alone. I review, I can edit the full message, then I tap Approve. One tap, sent through the Messenger Send API. All caught up."

**Action:**
- Show `Ready for You · 1 action to approve` badge + pending card (Maria A., `now`, Red apples $2.50/kg).
- Tap `Edit message`, change one word in multiline editor (dock auto-hides per PLAN §3.2), tap `Done editing`.
- Tap obsidian `Approve` pill → card flips to `All Caught Up!`.

**Graphics:** callout `Human-in-the-loop gate: approvalStatus must be approved — 403 COMPLIANCE_BLOCK otherwise` + `24-hour window enforced` (PLAN §2.2, `backend/src/app.js`).

### SCENE 3 — Talk with AI using voice (0:46–1:14)
**VO (28s):**
> "Hands full? Just talk. I tap the mic in the thumb-zone dock and ask in Tagalog — Magkano ang mansanas? Mume listens, thinks, and answers with price and stock from my catalog."

**Action:**
- Tap central mic in bottom-40% floating dock (PLAN §3.1). Status pill cycles `Listening` → `Thinking` with blue `#3279F9` glow + VoiceWave bars.
- Dictated text fills dock; reply appears bottom-anchored in 220px chat container: *"Red apples are $2.50 per kilo. In stock, 45 kg ready."*

**Graphics:** lower-third `03 · Voice-first — 72dp thumb zone · 60fps VoiceWave`.

### SCENE 4 — Talk with AI using manual chat (1:14–1:37)
**VO (23s):**
> "Or just type. Same dock, same brain — inventory, orders, follow-ups. It remembers the thread, so 'and the mangoes?' still knows what I mean."

**Action:**
- Type: `What about mango price and stock?` Active `Typing…` glow; send.
- Mume replies: *Carabao mangoes $4.00/kg, 30 kg Guimaras harvest in stock.* Show follow-up context working (last-20-messages + `conversation_sessions` summary per PLAN §5 Phase 3).

**Graphics:** split caption `Voice and chat share one session memory`.

### SCENE 5 — Messages / conversation tab (1:37–2:00)
**VO (23s):**
> "Every inquiry lives here. Live inbox — new threads pop in over Supabase Realtime, no refresh. I open Maria's thread and see the full history before I approve anything."

**Action:**
- Switch to Inbox/Messages tab (drawer or tab). New conversation inserts live (`realtime_inbox` channel).
- Open Maria A. thread, scroll history (scrollbar-free, blue reading glow + `Reading conversation` dot per PLAN §3.2).

**Graphics:** callout `Supabase Realtime: messages + pending_actions INSERT → instant UI`.

### SCENE 6 — Checking the catalog (2:00–2:18)
**VO (18s):**
> "My catalog, my prices. Three fruits, dollar pricing, stock pills. I add a photo, edit a price, and the AI quotes it correctly next time."

**Action:**
- Open Catalog tab (dock hides for full-screen browse per PLAN §3.1).
- Quick CRUD: Add item with photo upload + live preview → Edit price → stock badge `In stock / Low stock / Out of stock` (white pill, `#121317` text).

**Graphics:** callout `products table + pgvector embedding (1536) — price-aware replies`.

### SCENE 7 — Settings feature (2:18–2:35)
**VO (17s):**
> "Settings keeps me in control — Facebook Login, linked Page and sync status, currency in USD, and safe logout."

**Action:**
- Open drawer → Settings. Pan: `Login using Facebook` (`baseline-facebook.svg`), Connected Page card with sync indicator, USD currency row, `Log Out?` confirmation modal (session reset + empty states per PLAN §3.1).

**Graphics:** lower-third `07 · Settings — connect, currency, session`.

### SCENE 8 — Pro plan modal + benefits (2:35–2:55)
**VO (20s):**
> "Need more? Tap the ticket icon for Mume Pro — nine-ninety-nine a month. Unlimited catalog space, unlimited voice chat, and twenty-four-seven Messenger auto-sync. Start the free trial — welcome to Pro."

**Action:**
- From any screen, tap header ticket icon (top-right, `subscription-upgrade` in `src/components/Header.tsx` → `setSubscriptionModalOpen(true)` in `src/App.tsx`).
- Hold modal full-frame 8s so all text is readable: `MUME PRO` badge → `Upgrade to Pro` → `Pro Store Membership $9.99 / month · Most Popular · 7-day free trial · Cancel anytime`.
- Slow pan down the 3 benefits (exact app copy, `pro-features-list` in `src/App.tsx` + `src/index.css`):
  1. `Additional Product Space for Catalog` — unlimited items, custom photos, high-res variants.
  2. `Unlimited Voice Chat` — dictate commands, stock inquiries, draft replies, zero audio limits.
  3. `24/7 Meta Messenger Auto-Sync` — instant inquiry detection, smart reply generation.
- Tap `Start 7-Day Free Trial` → modal closes → toast `Welcome to Mume Pro! Unlimited features unlocked.` Button flips to `Pro Plan`. Then tap `Maybe Later` path on retake to show dismiss works.

**Graphics:** lower-third `08 · Pro — $9.99/mo · trial · 3 benefits`. Zoom-callout each benefit line as VO names it. Freeze price card 2s.

### SCENE 9 — How I built it in 10 days (2:55–3:20)
**VO (25s):**
> "How did I ship this in ten days for the Meta Global AI Developer Hackathon, Indie track? Days one to three: Express backend on Graph API v21 — HMAC, AES vault, approval gate, twenty-six tests green. Days four to ten: Expo voice ergonomics, Realtime inbox, hardening — zero secrets, clean build."

**Action:**
- Hold architecture diagram (PLAN §1: Meta Platform → Express backend → Supabase Postgres; mobile client ↔ REST + Realtime).
- Cycle 4 cards, 6s each: `Graph API v21.0 + HMAC + AES-256-GCM` → `approvalStatus gate + 24h window + rate telemetry` → `Supabase: conversations/messages/pending_actions + sessions + pgvector` → `26 tests · 0 TS errors · clean build` (PLAN §6).
- Honest note on screen (small print): `Assistant brain today: rule-based getMumeAiReply with session context (backend/src/services/ai.js); live Meta Model API wiring is next.`

**Graphics:** timeline bar `Oct 26 → Nov 4 · 10 days`.

### SCENE 10 — Closing (3:20–3:30)
**VO (10s):**
> "Mume — hands-free Messenger for real stores. Try it, star it, message the Page. Salamat!"

**Action:** Obsidian end card, white logo, tagline, repo + demo links, hackathon badge. Music up, cut at exactly 3:30.

---

## 4. Edit-Time Budget Control
- Total VO target: **~475 words**. If over 3:30 in rehearsal, trim Scene 9 first (drop hardening line), never trim Approve gate, voice, or Pro benefits — judges score those.
- Hard out at 3:30: place end card at 3:20 and allow only 10s CTA. Use YouTube chapters matching the 10 timestamps above.
- Pre-shoot rehearsal: read Scenes 2–4 aloud with a stopwatch — must land 79s combined; read Scene 8 aloud — must land 20s.

## 5. Compliance & Honesty Notes (from PLAN.md — keep in video or description)
- Human approval is mandatory (`approvalStatus !== 'approved'` → 403); 24-hour Standard Messaging Window enforced; `messaging_type: RESPONSE`.
- Tokens encrypted AES-256-GCM (`iv.tag.data`); HMAC-SHA256 webhooks with fast ACK; PII-safe logs; rate-limit telemetry at 75%/90%.
- Demo RLS note: public catalog reads only; writes go through backend / owner-scoped policies.
- Credit: built by Jefferson Samson per LICENSE / README attribution terms.
