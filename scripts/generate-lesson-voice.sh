#!/usr/bin/env bash
# Generate per-day lesson narrations for the 5-day Foundations program.
#
# Each clip is a ~25-35 s prose narration played on the intro lesson card
# before the breath session begins. Same pipeline as the onboarding and
# tutorial narrations: loudnorm only, no whisper FX or silence trim.
#
# Requires:
#   - ELEVENLABS_API_KEY env var (extracted from .env.local if present)
#   - curl + jq + ffmpeg
#
# Run from repo root:
#     ./scripts/generate-lesson-voice.sh                # default voice (theo), all 5 days
#     ./scripts/generate-lesson-voice.sh theo           # specific voice, all days
#     ./scripts/generate-lesson-voice.sh -- 3           # default voice, day 3 only
#     ./scripts/generate-lesson-voice.sh theo -- 2 3    # explicit voice, days 2 and 3
#
# Output: public/voice/{voice}/lesson-day-{N}.mp3
#
# KEEP IN SYNC with PROGRAM.days[*].intro in src/lib/program.ts.

set -euo pipefail

# Extract ELEVENLABS_API_KEY from .env.local without sourcing the whole file —
# Vite-style dotenv allows unquoted values with spaces (e.g. company names in
# VITE_LEGAL_*), which `sh source` chokes on.
if [[ -f .env.local && -z "${ELEVENLABS_API_KEY:-}" ]]; then
  line=$(grep -E '^ELEVENLABS_API_KEY=' .env.local | head -1) || true
  if [[ -n "$line" ]]; then
    value=${line#ELEVENLABS_API_KEY=}
    [[ "$value" == \"*\" && "$value" == *\" ]] && value=${value:1:-1}
    [[ "$value" == \'*\' && "$value" == *\' ]] && value=${value:1:-1}
    export ELEVENLABS_API_KEY="$value"
  fi
fi

: "${ELEVENLABS_API_KEY:?ELEVENLABS_API_KEY not set — needed for ElevenLabs API}"

# voice-id|model-id|stability|similarity_boost — mirrors generate-voice.sh
declare -A VOICES=(
  [theo]="UmQN7jS1Ee8B1czsUtQh|eleven_multilingual_v2|0.80|0.85"
  [sarah]="EXAVITQu4vr4xnSDxMaL|eleven_multilingual_v2|0.80|0.85"
  [priyanka]="BpjGufoPiobT79j2vtj4|eleven_multilingual_v2|0.80|0.85"
  [brittney]="pjcYQlDFKMbcOUp6F5GD|eleven_multilingual_v2|0.80|0.85"
  [christopher]="zO2z8i0srbO9r7GT5C4h|eleven_multilingual_v2|0.80|0.85"
)

ALL_DAYS=(1 2 3 4 5)

declare -A LESSONS=(
  [1]="Welcome to day one. Belly-led breathing is the foundation everything else builds on. A slow nasal inhale that expands the belly, and a longer exhale, engages the vagus nerve — lowering heart rate and blood pressure. Rest a hand on your belly. It should rise on the inhale, not your chest. When you're ready, tap begin."

  [2]="Welcome back. Yesterday you grounded the breath in the belly. Today we tune its pace. Find your resonance — roughly five and a half breaths per minute. At this pace, heart rate, blood pressure, and breath synchronize. This coherence maximizes heart rate variability, a marker of autonomic flexibility. Smooth and even, in and out. The pace should feel slow but never strained."

  [3]="Welcome to day three. Yesterday's rhythm was a two-beat cycle. Today we make it four — equal counts in all four directions: in, hold, out, hold. Brief breath holds train carbon dioxide tolerance and steady the nervous system. It's why combat units use it before high-stakes moments. The holds shouldn't feel like white-knuckling. Soften the throat and shoulders while you wait."

  [4]="Welcome to day four. Yesterday's holds were symmetric. Today we tilt the ratio toward calm. Lean into the exhale: inhale four, hold seven, exhale eight. Long exhales — especially after a hold — strongly activate the parasympathetic branch. It's the breath pattern most reliably linked to faster sleep onset. The exhale through pursed lips should feel slow and audible — like fogging a mirror."

  [5]="Welcome to the final day. The last four days were structured practices. Today's tool you can do in ten seconds, anywhere — a reset on demand. Two quick nasal inhales, then one long mouth exhale. The double-inhale re-inflates collapsed alveoli; the long exhale offloads carbon dioxide fast. In a randomized comparison against meditation, this was the single most effective protocol for reducing acute stress. The second inhale is short — just a top-off. The long exhale is where the work happens."
)

# Split args at "--" separator: voices before, day numbers after.
TARGET_VOICES=()
TARGET_DAYS=()
seen_sep=0
for arg in "$@"; do
  if [[ "$arg" == "--" ]]; then seen_sep=1; continue; fi
  if [[ $seen_sep -eq 0 ]]; then
    TARGET_VOICES+=("$arg")
  else
    TARGET_DAYS+=("$arg")
  fi
done
[[ ${#TARGET_VOICES[@]} -eq 0 ]] && TARGET_VOICES=(theo)
[[ ${#TARGET_DAYS[@]} -eq 0 ]] && TARGET_DAYS=("${ALL_DAYS[@]}")

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

HEADER_FILE="$TMP_DIR/elevenlabs-headers"
( umask 077 && {
    echo "xi-api-key: $ELEVENLABS_API_KEY"
    echo "Content-Type: application/json"
    echo "Accept: audio/mpeg"
  } > "$HEADER_FILE" )

LOUDNORM='loudnorm=I=-22:LRA=7:TP=-1.5'

for voice in "${TARGET_VOICES[@]}"; do
  if [[ -z "${VOICES[$voice]+x}" ]]; then
    echo "Unknown voice: $voice" >&2
    echo "Available: ${!VOICES[*]}" >&2
    exit 1
  fi
  IFS='|' read -r voice_id model_id stability sim <<< "${VOICES[$voice]}"
  out_dir="public/voice/$voice"
  mkdir -p "$out_dir"
  echo "=== $voice (model=$model_id) ==="

  for day in "${TARGET_DAYS[@]}"; do
    if [[ -z "${LESSONS[$day]+x}" ]]; then
      echo "Unknown lesson day: $day" >&2
      echo "Available: ${ALL_DAYS[*]}" >&2
      exit 1
    fi
    text="${LESSONS[$day]}"
    out_file="$out_dir/lesson-day-$day.mp3"
    raw_file="$TMP_DIR/$voice-day-$day-raw.mp3"
    echo "  day $day (${#text} chars)"

    body=$(jq -nc \
      --arg text "$text" \
      --arg model "$model_id" \
      --argjson stability "$stability" \
      --argjson sim "$sim" \
      '{text: $text, model_id: $model, voice_settings: {stability: $stability, similarity_boost: $sim}}')

    for attempt in 1 2 3 4; do
      status=$(curl -sS -X POST \
        -H @"$HEADER_FILE" \
        --data-binary "$body" \
        -o "$raw_file" \
        -w '%{http_code}' \
        "https://api.elevenlabs.io/v1/text-to-speech/$voice_id")
      if [[ "$status" == "200" ]]; then break; fi
      if [[ "$status" == "429" && "$attempt" -lt 4 ]]; then
        sleep $((attempt * 3))
        continue
      fi
      echo "    ElevenLabs returned HTTP $status:" >&2
      head -c 400 "$raw_file" >&2; echo >&2
      exit 1
    done

    ffmpeg -y -loglevel error -i "$raw_file" -af "$LOUDNORM" "$out_file"
    ls -lh "$out_file" | awk '{ printf "    %s  %s\n", $5, $NF }'
  done
done

echo
echo "Done. Files under public/voice/{voice}/lesson-day-*.mp3"
