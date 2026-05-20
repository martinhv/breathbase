# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Conventions

- **Do NOT add a `Co-Authored-By: Claude …` trailer to commits in this
  repo.** Author the commit normally — the user wants a clean history
  without AI co-author attribution.

## Commands

```bash
npm run dev       # dev server at http://localhost:5173
npm run build     # tsc -b && vite build → dist/
npm run preview   # serve the dist/ build locally
npm run lint      # tsc --noEmit (type-check only; no test suite)
```

There are no automated tests. Type-checking (`npm run lint`) is the primary correctness gate.

**Local env:** for production-like running, copy `.env.example` → `.env.local` and fill in the six `VITE_FIREBASE_*` values from your Firebase web-app config. README has the full Firebase setup walkthrough (enable Google provider, Firestore rules).

**Local mode (build-time):** if `VITE_LOCAL_MODE=true` is set, **or** the `VITE_FIREBASE_*` env vars are all empty, the app skips Firebase entirely. A synthetic "local user" is signed in automatically (no Login screen) and settings/sessions persist to `window.localStorage` under `breathbase:local-user:*` keys. Useful for `npm run dev` on a fresh clone with zero setup, or offline-only testing. See `src/lib/firebase.ts` for the `localMode` flag.

**Guest mode (runtime):** when Firebase IS configured, the Login screen leads with a "Start without an account" CTA. Clicking it sets `localStorage["breathbase:guestMode"] = "true"` and signs the same synthetic `local-user` in for this device. Storage routing is by **uid** (`isLocalUid(uid)` in `firebase.ts`), so guests and build-time-local users share the same localStorage paths. When a guest later signs in to Firebase, `migrateGuestData(toUid)` in `storage.ts` copies their local settings (only if the target account is brand-new) and all sessions (always additive) into Firestore, then clears the local copy. `useAuth()` exposes `isGuest` and `canRegister` so the UI can offer the upgrade CTA only when there's actually a Firebase backend to upgrade *to*.

**Push reminders (optional):** if `VITE_FIREBASE_VAPID_KEY` is set, daily reminders are delivered via Firebase Cloud Messaging (background-capable) instead of the client-side `setTimeout`. Client wiring in `src/lib/push.ts`, scheduled Cloud Function in `functions/src/index.ts`, FCM service worker in `public/firebase-messaging-sw.js` (rewritten at build time by `scripts/build-fcm-sw.mjs` to inline Firebase config). See README "Push reminders" for the deploy steps.

## Architecture

BreathBase is a mobile-first PWA (React 18 + TypeScript + Vite). Auth required (Google sign-in); per-user data lives in Firestore.

**Path alias:** `@/` resolves to `src/`.

### Auth + data model

`AuthProvider` (`lib/auth.tsx`) wraps the tree at the root and exposes `{ user, status, isGuest, canRegister, signInWithGoogle, continueAsGuest, signOut, … }` via `useAuth()`. `App.tsx`'s `AuthGate` renders `<Login>` when `status === "signedOut"` and the real app (under `SettingsProvider`) when signed in. **`SettingsProvider` mounts only when a user is present** — so anything under it can rely on `user` being non-null inside effects (the providers above will have unmounted the subtree on sign-out).

There are two `AuthContext` implementations behind a single provider: `FirebaseAuthProvider` (Firebase configured) and `LocalAuthProvider` (build-time local mode — always-on synthetic user, no register path). The Firebase one supports a runtime guest sub-state: no Firebase user + `guestMode` flag in localStorage ⇒ signed in as synthetic LOCAL_USER. Promoting a guest to a real account migrates their local data in the `onAuthStateChanged` effect.

Firestore layout (rules in README restrict each user to their own subtree):

```
/users/{uid}/profile/settings        ← single doc
/users/{uid}/sessions/{auto-id}      ← one doc per completed session
```

All Firestore access funnels through `lib/storage.ts`; every function takes `uid` as its first argument. `appendHistory` returns the new doc ID so the mood check-in can attach to a specific session rather than guessing at "the latest" (which would race across devices).

### Data flow

```
lib/techniques.ts  →  hooks/useBreathSession.ts  →  pages/Session.tsx
  (declarative)          (FSM + rAF loop)              (renders everything)
```

`lib/techniques.ts` is the single source of truth. Each `Technique` has a `cycle` (array of `BreathPhase`) and a `layout` (`fillDuration | fixedCycles | rounds`). `expandWithMeta()` inside `useBreathSession` flattens these into a linear `ExpandedPhase[]` that includes cycle/round annotations the UI needs. **Adding a new technique means adding one object to `TECHNIQUES` — no FSM changes.**

### Session state machine (`hooks/useBreathSession.ts`)

`idle → ready (3 s prelude) → running → paused → complete`

Timing is driven by a single `requestAnimationFrame` loop — never `setTimeout`. Frame deltas are accumulated and rolled forward across phase boundaries so timing never drifts. The `onPhaseEnter` callback fires on every phase change and is the shared synchronization point for audio, voice, and haptics — all three subscribe to it, guaranteeing no cross-system drift.

### Settings (`lib/settings.tsx` + `lib/storage.ts`)

`SettingsContext` / `useSettings()` exposes `{ settings, loading, update, reset }`. Settings load asynchronously from Firestore on sign-in; `loading` is true until the first fetch resolves. Writes are fire-and-forget through `saveSettings(uid, ...)` — UI state updates immediately, errors are logged. A `loadedUidRef` guards against writing to a previous user's doc if the active user changes mid-flight.

### Voice prompts (`hooks/useSpeech.ts` + `lib/voiceProfiles.ts`)

Web Speech API is **not** used (Firefox/Linux defaults to eSpeak, which is robotic). Instead, every `voicePrompt` string maps to a slug via `PROMPT_SLUGS` in `useSpeech.ts`, and clips live at `public/voice/{profileId}/{slug}.mp3`. The active profile comes from `settings.voiceProfile`; available profiles are declared in `lib/voiceProfiles.ts`.

`speak(text, durationMs)` plays the action prompt on a *main* audio channel, then schedules count clips (`count-1` … `count-15`) on a *second* audio channel at 60% volume. Counts fire at `durationMs - n*1000` ms after phase start, skipping any that would land while the action prompt is still playing. Per-clip action durations are measured once on profile change via `loadedmetadata`. Phases under 3 s skip countdown entirely.

To add a **new prompt**: add it to `PROMPT_SLUGS` and to the `PHRASES` array in `scripts/generate-voice.sh`, then run the script (requires `pip install edge-tts`) — it regenerates the slug for every voice profile.

To add a **new voice**: append to `VOICE_PROFILES` in `voiceProfiles.ts` and add a matching row to `VOICES` in `generate-voice.sh`, then run the script (optionally pass the new id as an arg to render only that one). The script supports two engines:

- `edge` (Microsoft neural via `edge-tts`, free, offline) — row format `id|edge|voice-name|rate|pitch`.
- `11l` (ElevenLabs, premium quality) — row format `id|11l|voice-id|model-id|stability|similarity_boost`. Requires `ELEVENLABS_API_KEY` env var at generation time only (clips are baked into `public/voice/{id}/`, so the running app never calls the API). Voice IDs come from `elevenlabs.io/app/voice-library` or the `/v1/voices` endpoint.

The same ffmpeg post-processing (silence trim for action clips, bandpass + whispered hiss for counts) runs regardless of engine, so output clips are interchangeable across engines.

The service worker precaches all `*.mp3`, so all voices are available offline after first load.

### Audio (`hooks/useAudioEngine.ts`)

Tone.js is lazy-initialized on the user's first gesture (browser autoplay policy). The piano arpeggios are a `Tone.Sampler` (Salamander Grand, CDN-hosted) scheduled per-phase from `playPhrase()`. The ambient pad bed is **pre-rendered**: eight `Tone.Player` instances load `public/sounds/pad-chord-{0..7}.mp3` (one mp3 per chord in the 8-chord progression), and `triggerHarmony()` crossfades between them when the harmony advances. The synthesized cello/pad/strings/noise ensemble that used to run live was retired so the audible result is identical across devices — bake the clips by opening `scripts/render-pad-clips.html` in a browser and running `scripts/encode-pad-clips.sh`. Chimes are a sine `Synth` fired on `onPhaseEnter`; default frequencies per phase kind are in `DEFAULT_CHIME_HZ` in `techniques.ts` and can be overridden per-phase via `chimeFreqHz`.

### Routing (`App.tsx`)

Three layers, outer to inner:

1. **`AuthGate`** — shows `<Login>` when signed out, otherwise mounts `SettingsProvider`.
2. **`SignedInApp`** — redirects to `/onboarding` until `settings.onboarded` is true, then shows `DisclaimerModal` until `settings.disclaimerAcknowledged` is set.
3. **Routes:** `/`, `/category/:id`, `/session/:id`, `/settings`, `/onboarding`.

### Analytics (`lib/analytics.ts`)

Self-hosted Umami, gated by build-time `VITE_UMAMI_WEBSITE_ID` +
`VITE_UMAMI_SCRIPT_URL`. When unset, the module is a no-op and the Privacy
section in Settings hides itself. When set, the script is injected lazily
on the first `initAnalytics()` call from `App.tsx` (after settings load),
and SPA pageviews are fired manually from a `useLocation` effect (Umami's
auto-track is disabled). User opt-out lives in `settings.analyticsEnabled`
(default true); `navigator.doNotTrack` is also respected.

Events: `session_complete` from `Session.tsx`, `soundscape_changed` /
`voice_changed` / `reminder_toggled` from `Settings.tsx`,
`onboarding_complete` from `Onboarding.tsx`, plus `error` from a global
`window.onerror` + `unhandledrejection` listener installed when analytics
activate (capped at 20/session).

### Safety constraint

Upregulate techniques (`category: "upregulate"`) must always show `SafetyModal` before the session begins. The modal reads `safetyNotes[]` from the technique object.

### Accessibility

ARIA live regions announce phase changes. `prefers-reduced-motion` is resolved in `hooks/useReducedMotion.ts` and overridable in Settings. The orb falls back to opacity pulse when reduced motion is active.
