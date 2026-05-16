# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # dev server at http://localhost:5173
npm run build     # tsc -b && vite build → dist/
npm run preview   # serve the dist/ build locally
npm run lint      # tsc --noEmit (type-check only; no test suite)
```

There are no automated tests. Type-checking (`npm run lint`) is the primary correctness gate.

**Local env:** the app will not run without Firebase credentials. Copy `.env.example` → `.env.local` and fill in the six `VITE_FIREBASE_*` values from your Firebase web-app config. README has the full Firebase setup walkthrough (enable Google provider, Firestore rules).

## Architecture

BreathBase is a mobile-first PWA (React 18 + TypeScript + Vite). Auth required (Google sign-in); per-user data lives in Firestore.

**Path alias:** `@/` resolves to `src/`.

### Auth + data model

`AuthProvider` (`lib/auth.tsx`) wraps the tree at the root and exposes `{ user, status, signInWithGoogle, signOut }` via `useAuth()`. `App.tsx`'s `AuthGate` renders `<Login>` when `status === "signedOut"` and the real app (under `SettingsProvider`) when signed in. **`SettingsProvider` mounts only when a user is present** — so anything under it can rely on `user` being non-null inside effects (the providers above will have unmounted the subtree on sign-out).

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

### Voice prompts (`hooks/useSpeech.ts`)

Web Speech API is **not** used (Firefox/Linux defaults to eSpeak, which is robotic). Instead, every `voicePrompt` string in `techniques.ts` maps to a pre-rendered MP3 in `public/voice/` via the `PROMPT_FILE` table in `useSpeech.ts`. To add a new prompt: add it to `PROMPT_FILE`, add the matching slug to `scripts/generate-voice.sh`, run the script (requires `edge-tts`; `pip install edge-tts`), commit the new mp3. The service worker precaches all `*.mp3` so prompts work offline.

### Audio (`hooks/useAudioEngine.ts`)

Tone.js is lazy-initialized on the user's first gesture (browser autoplay policy). The ambient pad is a `PolySynth` (C2+G2+D3+A3) through a low-pass with a slow LFO and 12 s reverb. Chimes are a sine `Synth` fired on `onPhaseEnter`; default frequencies per phase kind are in `DEFAULT_CHIME_HZ` in `techniques.ts` and can be overridden per-phase via `chimeFreqHz`.

### Routing (`App.tsx`)

Three layers, outer to inner:

1. **`AuthGate`** — shows `<Login>` when signed out, otherwise mounts `SettingsProvider`.
2. **`SignedInApp`** — redirects to `/onboarding` until `settings.onboarded` is true, then shows `DisclaimerModal` until `settings.disclaimerAcknowledged` is set.
3. **Routes:** `/`, `/category/:id`, `/session/:id`, `/settings`, `/onboarding`.

### Safety constraint

Upregulate techniques (`category: "upregulate"`) must always show `SafetyModal` before the session begins. The modal reads `safetyNotes[]` from the technique object.

### Accessibility

ARIA live regions announce phase changes. `prefers-reduced-motion` is resolved in `hooks/useReducedMotion.ts` and overridable in Settings. The orb falls back to opacity pulse when reduced motion is active.
