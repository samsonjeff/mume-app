# Mume Frontend SKILLS.md - UI / Effects / Interactions

**For:** `frontend/` — Expo + React Native (Android)  
**Tagline:** Mume = Muse + Messenger. Manage Business Page Messenger without opening Messenger.  
**Purpose:** This file defines every UI skill, effect, and interaction Muse / frontend dev must implement.  

**Directive:** CPMRED-001 - Cross-Platform Mobile Responsiveness and Ergonomics Directive - MANDATORY - All components must be one-handed, responsive, and iOS-ready. See PLAN.md for full strict directive.  

---

## 0. Cross-Platform Ergonomics - Strict Rules (CPMRED-001)

**One-Handed Comfort (Critical):**
- All primary actions in bottom 40% thumb zone
- WakeWordButton: bottom-center, 72dp, 72px safe margin from bottom edge, reachable with one thumb, no grip shift
- PendingActionCard Approve/Edit: bottom-aligned, 48dp min height, 48% width each
- No critical button in top 25%
- Tap target: Min 48x48dp (Android) / 44x44pt (iOS ready), 8dp spacing
- Test: Complete Link -> Check -> Approve with one thumb only

**Device Responsiveness:**
- NO fixed px heights, use flex / % / useWindowDimensions
- `react-native-safe-area-context` for notches, gesture bar, Dynamic Island
- `react-native-reanimated` for 60 FPS, UI thread
- Support 320dp (5.5" low-end) to 600dp (tablet) to 1024dp (foldable open)
- Low-end: 2GB RAM, cold start < 2.5s, VoiceWave < 16ms frame budget

**Future iOS Adaptability (Android-first, iOS-ready):**
- No Android-only modules, use `Platform.select` + Expo modules only
- Expo Managed + EAS Build, no bare native code, enables `eas build -p ios` from Windows
- `app.json` contains `bundleIdentifier: com.mume.app` + both Android + iOS permissions (`NSMicrophoneUsageDescription`, etc.)
- SafeAreaView everywhere, Ionicons cross-platform

---

## 1. Core UI Philosophy

Voice-first, hands-free. User should never need to type during rush hour. Every state must be visible + audible.

**Golden Rule:** No silent state. If Mume is doing something, show it AND say it.

---

## 2. App States (State Machine)

```
IDLE -> WAKE_WORD_DETECTED -> LISTENING -> TRANSCRIBING -> THINKING -> SPEAKING -> IDLE
                         |
                         -> PENDING_APPROVAL -> SENT
```

| State | UI Effect | Sound | Component |
| :--- | :--- | :--- | :--- |
| **IDLE** | Button gray, slow pulse 2s | None, local mic only (Porcupine) | `WakeWordButton` |
| **WAKE_WORD_DETECTED** | Button glows + scales to 1.2x, blue ring expands | **Ding!** `ding.mp3` | `WakeWordButton` + Haptics |
| **LISTENING** | Red ring, `VoiceWave` animates with mic volume | None | `VoiceWave` |
| **TRANSCRIBING** | Wave freezes, shows "Listening..." -> "Typing..." | None | `VoiceWave` + Text |
| **THINKING** | Button spins, shows Spark thinking dots | None | `ThinkingDots` |
| **SPEAKING** | Button glows green, wave plays with TTS volume | **TTS Voice Reply** | `VoiceWave` + TTS |
| **PENDING_APPROVAL** | Card slides up, yellow border, Approve / Edit buttons | Ding x2 | `PendingActionCard` |
| **SENT** | Card turns green, confetti 0.5s | "Sent" TTS | `PendingActionCard` |

---

## 3. Key Components & Skills

### A. WakeWordButton.tsx — THE HERO
**Skill:** Always-on local wake word "Hey Mume" / "Mume" using Porcupine (no cloud).

**Effects:**
- **Idle Pulse:** `Animated.loop` scale 1.0 -> 1.05 -> 1.0, duration 2000ms, opacity 0.6
- **Wake Glow:** On `onWakeWord`:
  - Scale 1.0 -> 1.2 (spring, 300ms)
  - Outer ring: blue `#3B82F6`, expands from 60px -> 120px, fades out 600ms
  - Play `ding.mp3` via `expo-av`, volume 1.0
  - Haptics: `Haptics.impactAsync(Heavy)` for Android
  - Vibrate 50ms
- **Cooldown:** 1 sec after wake, ignore false triggers

**Props:**
```ts
isListening, isThinking, onPressManual (tap to listen if wake fails)
```

### B. VoiceWave.tsx
**Skill:** Shows live mic volume during LISTENING and TTS volume during SPEAKING.

**Effects:**
- 5 bars, height mapped to volume 0-100
- Color: Red `#EF4444` when LISTENING, Green `#10B981` when SPEAKING
- Animation: `react-native-reanimated` `withSpring` per bar, 80ms delay stagger
- When TRANSCRIBING: freeze at last volume, show shimmer

**Code hint:**
```ts
const barHeights = useSharedValue([20, 20, 20, 20, 20]);
// on volume change
barHeights.value = volumes.map(v => withSpring(20 + v * 2));
```

### C. ThinkingDots.tsx
**Skill:** Spark is thinking / calling tools.

**Effect:**
- 3 dots, bounce up/down, stagger 150ms
- Text: "Checking inbox..." -> "Found apple inquiry..." -> "Drafting reply..."
- Use Supabase Realtime to update text live

### D. PendingActionCard.tsx
**Skill:** Human-in-the-loop — Mume never sends without approval.

**Effects:**
- **Slide up:** `translateY 100 -> 0`, spring, 400ms
- **Border:** Yellow `#F59E0B` waiting, Green `#10B981` approved, Red if edited
- **Buttons:** 
  - Approve (Yes) — big, green, haptic
  - Edit — opens price input
  - Voice: Say "Yes" also approves (voice command)
- **Realtime:** Listens to Supabase `pending_actions` table via Realtime

**Layout:**
```
[Customer Avatar] "How much apple?"
[Draft] "Hello, our apple price is $2 per 1kg"
[Product Image Card from Muse Image]
[Yes, Send] [Edit Price]
```

### E. InboxBadge.tsx
**Skill:** Shows unread counts without opening Messenger.

**Effect:**
- Red badge with count, pops when new message via Realtime
- Pulse once when new: scale 1 -> 1.3 -> 1
- Tap -> opens conversation list

### F. ProductCatalogGrid.tsx (SAM + Image Wow)
**Skill:** Shows auto-segmented products from SAM 3.1.

**Effect:**
- After uploading stall photo, show skeleton grid
- As SAM returns segments, each card fades in + scale 0.8 -> 1.0, stagger 100ms
- Each card: image cutout (transparent bg from SAM), name, price, "Generate Card" button
- When Muse Image generates card: image flips to price card with 3D flip

---

## 4. Sound Skills

All sounds in `frontend/assets/sounds/`:

| Sound | When | File |
| :--- | :--- | :--- |
| Wake Ding | Hey Mume detected | `ding.mp3` - short, high, friendly |
| Listening Start | Recording started | `pop.mp3` |
| Sent | Reply sent to customer | `sent.mp3` - success chime |
| New Message | New customer message via Realtime | `new-msg.mp3` |
| Error | No internet / FB error | `error.mp3` |

Use `expo-av`:
```ts
const { sound } = await Audio.Sound.createAsync(require('./ding.mp3'));
await sound.playAsync();
```

---

## 5. Haptics Skills (Android)

```ts
import * as Haptics from 'expo-haptics';

// - Wake: Haptics.impactAsync(Heavy)
// - Approve: Haptics.notificationAsync(Success)
// - Error: Haptics.notificationAsync(Error)
```

---

## 6. Realtime Skills (Supabase)

```ts
supabase
  .channel('messages')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
    // Trigger InboxBadge pop + New Message sound + update UI
  })
  .subscribe();
```

Must handle:
- New `messages` -> update InboxBadge, play new-msg.mp3
- New `pending_actions` -> show PendingActionCard with slide-up + ding x2
- Update `pending_actions` status=approved -> turn green + confetti

---

## 7. Voice Skills

### STT (Muse Voice Transcribe)
- Show interim transcript in real-time below VoiceWave
- Font: gray, italic, "Hearing: 'magkano apple...'"

### TTS (Voice Reply)
- Mume replies to OWNER with voice, not just text
- Use `expo-speech`:
```ts
Speech.speak("Today no comments, but someone asked for apple price. Should I tell them 2 dollars?", 
{ language: 'en-PH', pitch: 1.1, rate: 1.0 })
```
- During TTS, VoiceWave animates with TTS volume
- Show transcript of what Mume is speaking

### Code-switch (Taglish)
- Detect Tagalog: if transcript contains "magkano", "po", "ate", keep it, don't translate
- TTS must speak Taglish naturally — test with "en-PH" voice

---

## 8. Design Tokens

```ts
colors: {
  primary: '#3B82F6', // Mume blue - wake glow
  listening: '#EF4444', // red
  speaking: '#10B981', // green
  pending: '#F59E0B', // yellow
  bg: '#0F172A', // dark bg for sari-sari store outdoor visibility
  card: '#1E293B',
  text: '#F8FAFC'
},
fonts: {
  heading: 'Inter Bold',
  body: 'Inter Regular',
  tagalog: 'Inter Medium' // for code-switch
}
```

Dark mode only for MVP — outdoor use, saves battery.

---

## 9. Micro-interactions Checklist

- [ ] Button glows blue on "Hey Mume"
- [ ] Ding sound on wake
- [ ] VoiceWave animates with volume
- [ ] VAD auto-stop after 8s silence (show countdown 8...7...6)
- [ ] Thinking dots with live tool name
- [ ] Pending card slide-up + double ding
- [ ] Approve button haptic + confetti
- [ ] Inbox badge pop on new message
- [ ] Product card fade-in stagger from SAM
- [ ] Price card 3D flip from Image generation
- [ ] Pull-to-refresh inbox shakes if no internet
- [ ] Error toast with retry voice command "Try again Mume"

---

## 10. What NOT to Do

- No typing required in main flow — voice first
- No auto-send without approval — violates safety
- No cloud mic until wake word — privacy + cost
- No light mode for MVP — dark is better for outdoor
- No personal Messenger automation — Pages only (Meta policy)

---

## 11. Demo Flow UI

1. IDLE: Show "Say Hey Mume..." + pulsing button
2. User: "Hey Mume" -> GLOW + DING + LISTENING wave
3. User: "What's update?" -> TRANSCRIBING -> THINKING dots "Checking inbox..."
4. Mume: SPEAKING green wave + TTS "No comments, but apple inquiry..."
5. PENDING card slides up + ding x2
6. User: "Yes" -> Card turns green + confetti + SENT sound
7. Inbox badge goes from 1 -> 0 with pop

This is the video judges will see.

---

## 12. File Structure

```
frontend/
  SKILLS.md (this file)
  app/
    index.tsx -> Dashboard + WakeWordButton + InboxBadge
    chat.tsx -> VoiceWave + ThinkingDots + PendingActionCard
  components/
    WakeWordButton.tsx
    VoiceWave.tsx
    ThinkingDots.tsx
    PendingActionCard.tsx
    InboxBadge.tsx
    ProductCatalogGrid.tsx
  assets/sounds/
    ding.mp3, pop.mp3, sent.mp3, new-msg.mp3, error.mp3
  hooks/
    useWakeWord.ts (Porcupine)
    useVoiceRecorder.ts (expo-av + VAD)
    useRealtime.ts (Supabase)
    useTTS.ts (expo-speech)
```
