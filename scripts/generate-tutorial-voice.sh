#!/usr/bin/env bash
# Generate per-technique tutorial narrations via ElevenLabs.
#
# Renders longer prose tutorials (~30-45 s each) that explain how a
# technique works and what it does. Same pipeline as the onboarding
# narration: loudnorm only, no whisper FX or silence trim.
#
# Requires:
#   - ELEVENLABS_API_KEY env var (sourced from .env.local if present)
#   - curl + jq + ffmpeg
#
# Run from repo root:
#     ./scripts/generate-tutorial-voice.sh                          # default voice, all tutorials
#     ./scripts/generate-tutorial-voice.sh theo                     # specific voice, all tutorials
#     ./scripts/generate-tutorial-voice.sh -- box-breathing         # default voice, one tutorial
#     ./scripts/generate-tutorial-voice.sh theo -- box-breathing    # explicit voice + slug
#
# Output: public/voice/{voice}/tutorial-{technique-id}.mp3
#
# KEEP IN SYNC with TUTORIALS in src/lib/tutorials.ts.

set -euo pipefail

if [[ -f .env.local ]]; then
  set -a; . ./.env.local; set +a
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

ALL_SLUGS=(box-breathing)

declare -A TUTORIALS=(
  [box-breathing]="Box breathing follows a simple pattern of four equal parts. Inhale for four seconds. Hold your breath for four seconds. Exhale for four seconds. Then hold empty for four seconds. Each side of the box is the same length — that's where the name comes from.

This technique was popularized by Navy SEALs for use under high-stress situations. By keeping every phase equal, it stabilizes your autonomic nervous system without strongly tilting toward calming or activating. It's a balanced reset.

It's particularly useful before something stressful — a presentation, a difficult conversation, or any moment where you want to be alert but composed.

To begin, find a comfortable seated position. Breathe through your nose if you can. And don't strain — if four seconds feels long, start with three. Just five minutes is enough to feel the effect."
)

# Split args at "--" separator: voices before, slugs after.
TARGET_VOICES=()
TARGET_SLUGS=()
seen_sep=0
for arg in "$@"; do
  if [[ "$arg" == "--" ]]; then seen_sep=1; continue; fi
  if [[ $seen_sep -eq 0 ]]; then
    TARGET_VOICES+=("$arg")
  else
    TARGET_SLUGS+=("$arg")
  fi
done
[[ ${#TARGET_VOICES[@]} -eq 0 ]] && TARGET_VOICES=(theo)
[[ ${#TARGET_SLUGS[@]} -eq 0 ]] && TARGET_SLUGS=("${ALL_SLUGS[@]}")

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

  for slug in "${TARGET_SLUGS[@]}"; do
    if [[ -z "${TUTORIALS[$slug]+x}" ]]; then
      echo "Unknown tutorial slug: $slug" >&2
      echo "Available: ${ALL_SLUGS[*]}" >&2
      exit 1
    fi
    text="${TUTORIALS[$slug]}"
    out_file="$out_dir/tutorial-$slug.mp3"
    raw_file="$TMP_DIR/$voice-$slug-raw.mp3"
    echo "  $slug (${#text} chars)"

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
echo "Done. Files under public/voice/{voice}/tutorial-*.mp3"
