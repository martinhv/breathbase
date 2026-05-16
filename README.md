# BreathBase

**Foundational breathwork, grounded in science.**

BreathBase is a mobile-first, client-side PWA for guided breathwork. It
covers the *Foundational* tier of practice — awareness, relaxation, and
basic breath control — with nine evidence-based techniques across four
states: downregulate, upregulate, balance, and focus.

The app uses synthesized ambient audio (Tone.js), an animated breathing
orb (Framer Motion) tightly synchronized to the breath cycle, optional
voice guidance (Web Speech API), and haptic feedback. All data is stored
locally; no backend, no accounts, no analytics.

---

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`).

For a production build:

```bash
npm run build
npm run preview
```

The build emits a service worker and PWA manifest; the resulting
`dist/` can be served from any static host and installed to the home
screen on iOS Safari or Android Chrome.

To verify types:

```bash
npm run lint   # runs tsc --noEmit
```

---

## Tech stack

- **React 18 + TypeScript** via Vite
- **Tailwind CSS** for styling (dark-mode-first, soft gradients)
- **Framer Motion** for the orb animation
- **Tone.js** for synthesized ambient pad + phase chimes (no audio
  assets shipped — everything is generated client-side)
- **Web Speech API** (`SpeechSynthesis`) for voice prompts
- **`navigator.vibrate`** for phase-transition haptics where supported
- **`localStorage`** for settings, session history, streak/total stats
- **`vite-plugin-pwa`** for the manifest + service worker

---

## Architecture

```
src/
├── lib/
│   ├── techniques.ts        # Single source of truth for all techniques.
│   ├── storage.ts           # localStorage accessors + streak/total stats.
│   └── settings.tsx         # SettingsContext + useSettings hook.
├── hooks/
│   ├── useBreathSession.ts  # Reducer-based FSM driving the breath cycle.
│   ├── useAudioEngine.ts    # Tone.js pad + chimes (lazy unlock on gesture).
│   ├── useSpeech.ts         # SpeechSynthesis wrapper with calm defaults.
│   ├── useHaptics.ts        # navigator.vibrate guard.
│   └── useReducedMotion.ts  # OS + settings reduced-motion resolver.
├── components/
│   ├── BreathingOrb.tsx     # Framer Motion scale + color, reduced-motion fallback.
│   ├── PhaseIndicator.tsx   # Large phase label + countdown + ARIA live.
│   ├── NostrilDiagram.tsx   # SVG hand-position cue for Nadi Shodhana.
│   ├── SafetyModal.tsx
│   ├── DisclaimerModal.tsx
│   ├── MoodCheckIn.tsx
│   └── CategoryCard.tsx
└── pages/
    ├── Home.tsx             # 2×2 category grid + streak / total / last-session.
    ├── Category.tsx         # Technique list with rationale + citation.
    ├── Session.tsx          # Full-screen orb + phase indicator + controls.
    ├── Settings.tsx         # Toggles, volumes, durations, history, disclaimer.
    └── Onboarding.tsx       # 3-screen intro for first launch.
```

### Data model — `lib/techniques.ts`

A technique is a declarative object: a canonical `cycle` of breath
phases (`inhale`/`hold_in`/`exhale`/`hold_out` with durations and
labels) plus a `layout` describing how that cycle assembles into a
session:

- `fillDuration` — repeat until the user's chosen duration is reached
- `fixedCycles` — exact N repetitions
- `rounds` — N rounds of M cycles, with optional `roundEnd` retention
  phases and `rest` phases between rounds

`expandSession(t, mins)` flattens that into a linear `BreathPhase[]`.
The state machine just walks the array — adding a new technique means
appending one object literal to `TECHNIQUES`, no FSM changes.

### Synchronization — `hooks/useBreathSession.ts`

A reducer-based finite state machine: `idle → ready → running → paused
→ complete`. Timing is driven by a single `requestAnimationFrame` loop
(*never* `setTimeout`). Each frame measures `performance.now()` delta
and rolls forward — overflow that crosses a phase boundary is applied
to the next phase rather than discarded, so we never drift even if the
tab is briefly throttled.

The orb, audio, voice, and haptics all read from the same phase
transition events, ensuring the orb's scale change, the chime, the
voice prompt, and the vibration all fire on the same `phaseIndex`
update — no cross-system drift.

### Audio — `hooks/useAudioEngine.ts`

- **Ambient pad**: a Tone.js `PolySynth` sustaining a low chord
  (C2 + G2 + D3 + A3), filtered through a low-pass with an LFO on
  cutoff (~0.05 Hz) and a 12-second reverb at -18 dB.
- **Chimes**: a sine `Synth` with a short envelope, triggered on each
  phase transition. Frequencies per phase: inhale 440 Hz, hold 330 Hz,
  exhale 220 Hz (overridable per phase in `techniques.ts`).
- `Tone.start()` is deferred until the user's first gesture (browser
  autoplay policy); the Session page invokes it on the "Begin" tap.

---

## Techniques (Foundational tier)

### 🌙 Downregulate — parasympathetic activation

| Technique | Pattern | Source |
|---|---|---|
| **Physiological Sigh** | inhale 1.5s + top-up 1s, exhale 7s (mouth) | Balban et al., *Cell Reports Medicine* (2023) |
| **4-7-8 Breathing** | inhale 4s, hold 7s, exhale 8s (pursed lips) | Weil (2016) |
| **Diaphragmatic (Belly)** | inhale 4s belly, exhale 6s | Russo et al., *Breathe* (2017) |

### ☀️ Upregulate — sympathetic activation

| Technique | Pattern | Source |
|---|---|---|
| **Energizing Breath** | 30× (active in 2s / passive out 1s) → 20s exhale-hold; 2 rounds | Kox et al., *PNAS* (2014) |
| **Bellows (Bhastrika, gentle)** | 8× (in 2s / out 2s) → 15s rest; 3 rounds | Telles et al., *Med Sci Monit* (2011) |

> ⚠️ **Safety:** upregulating techniques should not be practiced in or
> near water, while driving, or with cardiovascular / respiratory /
> seizure conditions or pregnancy. A safety modal is required before
> these sessions begin.

### ⚖️ Balance — equal-ratio breathing

| Technique | Pattern | Source |
|---|---|---|
| **Box Breathing** | 4-4-4-4 | Röttger et al., *Appl Psychophysiol Biofeedback* (2021) |
| **Coherent / Resonant** | 5.5s in / 5.5s out (≈5.5 bpm) | Lehrer & Gevirtz, *Frontiers in Psychology* (2014) |

### 🎯 Focus — attention sharpening

| Technique | Pattern | Source |
|---|---|---|
| **Alternate Nostril (Nadi Shodhana)** | in-L / out-R / in-R / out-L, 4s each | Telles et al., *Med Sci Monit Basic Res* (2014) |
| **Equal Breathing (Sama Vritti)** | 4s in / 4s out | Zaccaro et al., *Front Hum Neurosci* (2018) |

Full citations live alongside each technique in `src/lib/techniques.ts`
and are surfaced in-app under each technique's "More" button.

---

## Accessibility

- ARIA live region announces each phase change for screen readers.
- `prefers-reduced-motion` is honored automatically (the orb falls back
  to a gentle opacity pulse instead of scale animation). Users can also
  force reduced motion on or off in Settings.
- All interactive controls are keyboard-reachable; phase labels use
  semantic heading/status roles.

---

## Roadmap

BreathBase ships the **Foundational** tier today: techniques that are
safe to learn unsupervised and that build the skills of awareness,
relaxation, and basic breath control. Future tiers will introduce more
advanced practices that require firmer prerequisites and additional
safety scaffolding:

- **Intermediate** — Sudarshan Kriya basics, SOMA Breath patterns,
  Tummo-light, more vigorous Bhastrika, longer breath retentions
  (kumbhaka). Adds CO₂-tolerance and HRV progress tracking.
- **Advanced** — Full Tummo, Holotropic-style guided sessions, advanced
  kapalabhati and pranayama sequences, optional integration with
  wearables for biofeedback. Requires an explicit acknowledgment of
  contraindications and ideally pairs with a qualified teacher.

These tiers are intentionally out of scope for this build.

---

## Disclaimer

BreathBase is an educational tool and **not medical advice**. The
techniques described here are widely taught, but individual responses
vary. If you have a medical condition or are pregnant, please consult a
physician before practicing. Stop immediately if you feel dizzy or
lightheaded. Do not practice upregulating techniques in or near water
or while operating vehicles or machinery.
