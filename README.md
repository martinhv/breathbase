# BreathBase

**Foundational breathwork, grounded in science.**

BreathBase is a mobile-first PWA for guided breathwork. It covers the
*Foundational* tier of practice — awareness, relaxation, and basic breath
control — with nine evidence-based techniques across four states:
downregulate, upregulate, balance, and focus.

The app uses a layered piano + strings + cello + pad ensemble (Tone.js, plus
optional ocean / rain / brown-noise / silent soundscapes), an animated
breathing orb (Framer Motion) tightly synchronized to the breath cycle,
optional MP3 voice guidance, and haptic feedback. Five curated 7-day
programs (foundations, sleep, stress reset, focus, energy) introduce the
techniques progressively, with linear day-by-day gating.

By default the app uses Firebase Auth (Google sign-in) + Firestore for
multi-device sync. For local testing or offline-only use, a **local mode**
runs the whole app without Firebase — see below. No analytics either way.

---

## Quick start

### Option 1 — local mode (no Firebase, no login)

```bash
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`). With no
`.env.local` present, the app auto-detects that Firebase is unconfigured
and runs in **local mode**: a synthetic "local user" is signed in
automatically (no login screen) and all settings + session history persist
to `window.localStorage` under `breathbase:local-user:*` keys.

You can also force local mode explicitly by setting `VITE_LOCAL_MODE=true`
in `.env.local` — useful if you want to keep Firebase credentials handy
but test without them.

### Option 2 — with Firebase (multi-device sync, Google sign-in)

```bash
npm install
cp .env.example .env.local   # fill in your Firebase web-app credentials
npm run dev
```

**Firebase setup:**

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication** → enable the *Google* sign-in provider.
3. **Firestore Database** → create in production mode and paste these rules
   (users can only access their own subtree):

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```

4. **Project settings → Your apps → Web app** → register a new web app and
   copy the six config values into `.env.local`.
5. **Authentication → Settings → Authorized domains** → add your production
   domain (`localhost` is allowed by default).

### Optional — push reminders that fire when the app is closed

Daily reminders work out of the box, but only while a BreathBase tab is open.
To deliver reminders via background push (the way Calm / Headspace do it),
wire up Firebase Cloud Messaging + the scheduled Cloud Function in
`functions/`:

1. **Firebase Console → Project settings → Cloud Messaging** → under *Web
   configuration*, click **Generate key pair** to create a VAPID key. Paste
   it into `.env.local`:

   ```
   VITE_FIREBASE_VAPID_KEY=BL...your-key...
   ```

2. **Upgrade to the Blaze plan** — Cloud Functions deploys require it.
   Free-tier usage limits comfortably cover a 5-min scheduled function for
   a small user base.

3. **Install function dependencies and deploy:**

   ```bash
   cd functions
   npm install
   npm run deploy   # alias for: firebase deploy --only functions
   ```

   The function `sendReminders` runs every 5 minutes, reads each user's
   `/users/{uid}/devices/{fcmToken}` doc, computes the device's local time
   from its stored timezone, and sends pushes to any device whose
   `reminderTime` matches the current slot.

When the VAPID key is set, the Settings page automatically registers an FCM
token whenever a user enables reminders; the explainer line updates to
*"Reminders are delivered via Firebase Cloud Messaging — they fire even
when BreathBase is closed."* Without the VAPID key it falls back to the
client-side setTimeout that only fires with a tab open.

### Other commands

```bash
npm run build     # tsc -b && vite build → dist/ (PWA + service worker)
npm run preview   # serve the dist/ build locally
npm run lint      # tsc --noEmit (type-check only)
npm test          # vitest run
```

The build emits a service worker and PWA manifest; `dist/` can be served
from any static host and installed to the home screen on iOS Safari or
Android Chrome.

---

## Deploying behind a separate Caddy VM

The repo ships a `Dockerfile`, `nginx.conf`, and `docker-compose.yml` so
BreathBase can run on its own VM and sit behind a dedicated edge VM that
runs Caddy (TLS termination, HTTP→HTTPS, certs). Both VMs live on the
same internal network; only the Caddy VM exposes 80/443 to the outside.

```
   internet ──443──▶  Caddy VM  ──8080──▶  BreathBase VM (nginx :8080)
                       (TLS)              (Docker container)
```

### On the BreathBase VM

Prerequisites: Docker Engine + the compose plugin.

```bash
git clone https://github.com/martinhv/breathbase.git
cd breathbase
cp deploy/.env.production.example .env
# fill in your VITE_FIREBASE_* values (they're baked in at build time)

docker compose up -d --build
```

The container listens on `0.0.0.0:8080`. Lock it down with the Proxmox
firewall (or `ufw` inside the VM) so only the Caddy VM's address can
reach `:8080` — otherwise anyone on the LAN can hit it bypassing TLS.

`GET /healthz` returns `200 ok`; Caddy's `lb_try_duration` and Docker's
own `HEALTHCHECK` both poll it.

### On the Caddy VM

Drop this site block into the Caddyfile (substitute your domain and the
BreathBase VM's address):

```caddyfile
breathbase.example.com {
    encode zstd gzip
    reverse_proxy 10.0.0.42:8080 {
        header_up X-Real-IP        {remote_host}
        header_up X-Forwarded-For  {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

Then `caddy reload` (or restart the Caddy service). Caddy will fetch a
Let's Encrypt cert on first request.

If you serve the app from a domain other than `localhost`, add it under
**Firebase Console → Authentication → Settings → Authorized domains** so
Google sign-in is allowed there.

### Updating

```bash
cd ~/breathbase
git pull
docker compose up -d --build
```

The build runs inside the container — the VM only needs Docker, not Node.

### Caching behavior

`nginx.conf` already sets cache headers appropriate for a PWA:

- **`/assets/*`** (Vite content-hashed) → `immutable, 1 year`
- **`/voice/*`** (pre-rendered MP3 clips) → `public, 30 days`
- **`/index.html`, `/manifest.webmanifest`** → `no-cache` (revalidate)
- **`/sw.js`, `/firebase-messaging-sw.js`, `/workbox-*.js`** →
  `no-cache, no-store` so a deploy is never blocked by a stale service
  worker

Caddy passes these through unchanged; you don't need to duplicate them
in the Caddyfile.

---

## Tech stack

- **React 18 + TypeScript** via Vite
- **Tailwind CSS** for styling (light/dark with system-follow option)
- **Framer Motion** for the orb animation
- **Tone.js** — piano sampler (Salamander Grand, CDN-hosted) + synthesized
  strings / cello / pad / bell / brushed snare layers, plus alternative
  ocean / rain / brown-noise soundscapes (procedural — no sample assets)
- **Pre-rendered MP3 voice prompts** (4 Microsoft neural voices via
  `edge-tts`, generated by `scripts/generate-voice.sh` and cached by the
  service worker — user selects in Settings)
- **`navigator.vibrate`** for phase-transition haptics where supported
- **Firebase Auth (Google) + Firestore** for sign-in and per-user
  persistence — or **localStorage** in local mode
- **`vite-plugin-pwa`** for the manifest + service worker
- **Vitest** for unit tests

---

## Architecture

```
src/
├── lib/
│   ├── techniques.ts        # Single source of truth for all techniques.
│   ├── program.ts           # 5 guided 7-day programs + state helpers.
│   ├── firebase.ts          # Firebase init — gated by the localMode flag.
│   ├── auth.tsx             # FirebaseAuthProvider | LocalAuthProvider.
│   ├── storage.ts           # Firestore or localStorage adapter, picked by localMode.
│   ├── settings.tsx         # SettingsContext + useSettings hook.
│   ├── notifications.ts     # Daily-reminder scheduling (Notification API).
│   ├── theme.ts             # Light/dark theme application.
│   └── voiceProfiles.ts     # Voice profile metadata (id, name, description).
├── hooks/
│   ├── useBreathSession.ts  # Reducer-based FSM driving the breath cycle.
│   ├── useAudioEngine.ts    # Tone.js singleton — full ensemble + soundscapes.
│   ├── useSpeech.ts         # MP3 prompt player with whispered countdowns.
│   ├── useHaptics.ts        # navigator.vibrate guard.
│   ├── useWakeLock.ts       # Screen Wake Lock during active sessions.
│   └── useReducedMotion.ts  # OS + settings reduced-motion resolver.
├── components/
│   ├── BreathingOrb.tsx     # Framer Motion scale + color, reduced-motion fallback.
│   ├── PhaseIndicator.tsx   # Large phase label + countdown + ARIA live.
│   ├── NostrilDiagram.tsx   # SVG hand-position cue for Nadi Shodhana.
│   ├── SafetyModal.tsx
│   ├── DisclaimerModal.tsx
│   ├── ReloadPrompt.tsx
│   └── CategoryCard.tsx
└── pages/
    ├── Login.tsx            # Google sign-in (skipped in local mode).
    ├── Onboarding.tsx       # 4 slides ending in a goal picker → program enrollment.
    ├── Home.tsx             # Foundational banner, program tile, 2×2 category grid, stats.
    ├── Program.tsx          # Selected 7-day program with linear day gating.
    ├── Category.tsx         # Technique list with rationale + citation.
    ├── Session.tsx          # Full-screen orb + phase indicator + controls.
    ├── History.tsx          # Recent sessions.
    └── Settings.tsx         # Account, soundscape, reminders, voice, volumes, ...
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

### Programs — `lib/program.ts`

Five curated 7-day programs reuse the existing techniques in different
orderings, each tuned to a goal:

- **Foundations** — gentle tour of the basics (the original curriculum)
- **Sleep** — diaphragmatic / 4-7-8 / coherent, building toward longer sessions
- **Stress reset** — physiological sigh as the centerpiece tool
- **Focus** — equal / box / alternate-nostril attention training
- **Energy** — gentle ramp into bellows + energizing breath

The onboarding flow asks "Where would you like to start?" and maps the
answer (`curiosity` / `sleep` / `stress` / `focus` / `energy`) to the
matching program. Days are linearly gated — Day N unlocks once Day N-1 is
complete. Users can switch programs from the `/program` page (mid-progress
switches confirm before resetting).

### Synchronization — `hooks/useBreathSession.ts`

A reducer-based finite state machine: `idle → ready → running → paused
→ complete`. Timing is driven by a single `requestAnimationFrame` loop
(*never* `setTimeout`). Each frame measures `performance.now()` delta
and rolls forward — overflow that crosses a phase boundary is applied
to the next phase rather than discarded, so we never drift even if the
tab is briefly throttled.

The orb, audio, voice, and haptics all read from the same phase
transition events, so the orb's scale change, the chime, the voice
prompt, and the vibration all fire on the same `phaseIndex` update —
no cross-system drift.

### Audio — `hooks/useAudioEngine.ts`

A module-level Tone.js singleton, lazily initialized on the user's first
gesture (autoplay policy). Music is **driven by the breath cycle**, not
a fixed timer.

The default "piano" soundscape layers an ensemble under the breath:

- **Piano sampler** (Salamander Grand from the Tone.js CDN) plays
  ascending arpeggios on inhale, descending on exhale, a held chord with
  a high accent on hold-in, low cluster on hold-out.
- **Cello-bass** — fat-saw `PolySynth` low-passed at 450 Hz, sustaining
  the chord root between piano bass triggers.
- **Pad** — fat-triangle `PolySynth` low-passed with a 0.07 Hz LFO,
  playing the lower-mid chord tones for warmth.
- **Strings** — fat-saw `PolySynth` through `Tone.Chorus` + a 0.05 Hz
  filter LFO, playing the upper chord tones. The most audible new
  layer; swells with each chord change.
- **Bell** — sparse FM bell on C6, rings each time the 8-chord progression
  wraps a full pass (~1–2 min depending on technique).
- **Brushed snare** — pink-noise swell that fires only at round boundaries
  in rounds-layout techniques (active cycling → rest, rest → active). So
  it only shows up in Energizing Breath and Bellows Breath.
- **Air** — quiet band-passed pink noise (~-30 dB) for subliminal motion.
- **Chimes** — sine `Synth` per-phase, frequencies in `DEFAULT_CHIME_HZ`
  (inhale 440 Hz, hold 330 Hz, exhale 220 Hz; overridable per phase).

The chord progression walks through 8 voicings in C major / A minor
(vi-IV-I-V then iii-vi-ii-V). A `passIndex` counter increments on each
wrap, used by the phrase logic to re-voice arpeggios on alternate loops
so longer sessions don't lock into a perceptible 8-chord cycle.

**Alternative soundscapes** (selectable in Settings) swap the entire
piano ensemble for a procedural bed:

- **Ocean** — pink noise → low-pass → `Tone.Tremolo` @ 0.12 Hz + LFO-swept
  filter (300–900 Hz), producing wave-like swells.
- **Rain** — white noise high-passed at 1800 Hz for a steady wash.
- **Brown noise** — pure brown noise, no shaping.
- **Silent** — no audio bed at all (chimes + voice still fire).

All routes share the music bus (`pianoVolume`), so one `musicEnabled`
toggle controls everything.

### Reminders — `lib/notifications.ts` + `lib/push.ts` + `functions/`

Two delivery paths, picked automatically:

- **Server-side push (preferred)** — when `VITE_FIREBASE_VAPID_KEY` is set
  and the user is signed into Firebase, `lib/push.ts` requests an FCM
  token, registers it in Firestore at `/users/{uid}/devices/{fcmToken}`
  with the user's chosen `reminderTime` + `reminderTimezone`. A scheduled
  Cloud Function (`functions/src/index.ts`) runs every 5 minutes, reads
  every device doc, computes each device's local time, and fires a push
  to any device whose reminder time matches the current slot. Stale
  tokens (uninstalled app, etc.) are auto-cleaned. Background SW:
  `public/firebase-messaging-sw.js`, rewritten at build time by
  `scripts/build-fcm-sw.mjs` to inline the Firebase config (SWs can't
  read `import.meta.env`). See README "Push reminders" for deploy steps.
- **Client-side fallback (`lib/notifications.ts`)** — when push isn't
  configured (no VAPID key, local mode, denied permission), `App.tsx`
  schedules a self-rearming `setTimeout` that fires `new Notification(...)`
  at the chosen time. Only fires while a BreathBase tab is alive.

### Local mode — `lib/firebase.ts`

`localMode` is true when `VITE_LOCAL_MODE=true` or when every
`VITE_FIREBASE_*` env var is empty (the auto-fallback that makes
`npm run dev` work on a fresh clone). In that mode:

- Firebase is never initialized; `auth` / `db` exports are undefined.
- `AuthProvider` dispatches to `LocalAuthProvider` — a synthetic user
  (`uid: "local-user"`) is signed in immediately, so the Login screen
  never renders.
- `storage.ts` branches every function to read/write `window.localStorage`
  under namespaced JSON keys instead of Firestore.
- Settings UI hides the Sign-out button and relabels "Delete account" to
  "Clear local data."
- Export still works — produces the same JSON shape as the Firestore path.

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

Smaller in-progress items, in roughly the order they'd be useful:

- **Custom techniques** — let users define their own breath patterns.
- **Camera-based HRV biofeedback** — read pulse via PPG, show users their
  parasympathetic shift before/after a session.
- **HealthKit / Google Fit** — write mindfulness minutes to the OS-level
  health store (needs a native shell on iOS).

---

## Disclaimer

BreathBase is an educational tool and **not medical advice**. The
techniques described here are widely taught, but individual responses
vary. If you have a medical condition or are pregnant, please consult a
physician before practicing. Stop immediately if you feel dizzy or
lightheaded. Do not practice upregulating techniques in or near water
or while operating vehicles or machinery.

---

## License

BreathBase is licensed under the [GNU Affero General Public License
v3.0 or later](LICENSE) (AGPL-3.0-or-later).

In plain English:

- ✅ **Self-host it.** Run it for yourself, your family, your school,
  your team — for any purpose. No restrictions.
- ✅ **Modify and redistribute it.** Fork it, change it, share it.
- ✅ **Read the source.** All of it. No hidden parts.
- ⚠️ **If you offer a modified version as a network service** (a
  hosted SaaS, a web app others sign in to), AGPL §13 requires you to
  publish your full modified source code, under AGPL-3.0, to every
  user of that service. There is no "use it internally and keep your
  changes secret" loophole for network use.

This is intentional. BreathBase is meant to be a public, auditable
educational tool — not a free starter kit for someone to wrap in a
paywall. Self-hosting is welcome and encouraged; running a closed
commercial fork is not.

If AGPL doesn't fit your use case and you'd like to discuss a
commercial license, open an issue.
