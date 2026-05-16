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

## Architecture

BreathBase is a mobile-first PWA (React 18 + TypeScript + Vite). No backend, no accounts — all state in `localStorage`.

**Path alias:** `@/` resolves to `src/`.

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

`SettingsContext` / `useSettings()` provides app-wide settings. Hydration from `localStorage` is deferred one tick after mount (avoids SSR edge cases). All writes are synchronous via `saveSettings`.

### Audio (`hooks/useAudioEngine.ts`)

Tone.js is lazy-initialized on the user's first gesture (browser autoplay policy). The ambient pad is a `PolySynth` (C2+G2+D3+A3) through a low-pass with a slow LFO and 12 s reverb. Chimes are a sine `Synth` fired on `onPhaseEnter`; default frequencies per phase kind are in `DEFAULT_CHIME_HZ` in `techniques.ts` and can be overridden per-phase via `chimeFreqHz`.

### Routing (`App.tsx`)

`FirstLaunchGate` redirects to `/onboarding` until `settings.onboarded` is true, then shows `DisclaimerModal` until `settings.disclaimerAcknowledged` is set. Routes: `/`, `/category/:id`, `/session/:id`, `/settings`, `/onboarding`.

### Safety constraint

Upregulate techniques (`category: "upregulate"`) must always show `SafetyModal` before the session begins. The modal reads `safetyNotes[]` from the technique object.

### Accessibility

ARIA live regions announce phase changes. `prefers-reduced-motion` is resolved in `hooks/useReducedMotion.ts` and overridable in Settings. The orb falls back to opacity pulse when reduced motion is active.
