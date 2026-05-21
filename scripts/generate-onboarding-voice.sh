#!/usr/bin/env bash
# Generate onboarding-slide narration clips via ElevenLabs.
#
# These are longer prose clips (~5–10 s each) rendered with the same per-voice
# tuning as the breath prompts but WITHOUT the whisper FX or aggressive silence
# trim — narration sounds natural with normal pauses.
#
# Requires:
#   - ELEVENLABS_API_KEY env var (sourced from .env.local if present)
#   - curl + jq + ffmpeg
#
# Run from repo root:
#     ./scripts/generate-onboarding-voice.sh                   # default voice (theo), all slugs
#     ./scripts/generate-onboarding-voice.sh theo sarah        # specific voices, all slugs
#     ./scripts/generate-onboarding-voice.sh theo -- five-day  # one voice, one slug (cheap)
#     ./scripts/generate-onboarding-voice.sh -- five-day       # default voice, one slug
#
# Output: public/voice/{voice}/onboarding-{slug}.mp3
#
# Keep slugs and text in sync with SLIDES in src/pages/Onboarding.tsx.
#
# Cost: ~1200 chars per voice, well under one cent on the paid plan.

set -euo pipefail

# Extract ELEVENLABS_API_KEY from .env.local without sourcing the whole file —
# Vite-style dotenv allows unquoted values with spaces (e.g. company names in
# VITE_LEGAL_*), which `sh source` chokes on.
if [[ -f .env.local && -z "${ELEVENLABS_API_KEY:-}" ]]; then
  line=$(grep -E '^ELEVENLABS_API_KEY=' .env.local | head -1) || true
  if [[ -n "$line" ]]; then
    value=${line#ELEVENLABS_API_KEY=}
    # Strip optional surrounding single or double quotes.
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

# Ordered list of slide slugs (bash assoc arrays don't preserve order).
SLUGS=(welcome help start-small five-day)

declare -A NARRATIONS=(
  # Narrations are written with the canonical brand "Sough", but ElevenLabs
  # defaults to /saʊ/ ("sow") for that spelling. We rewrite "Sough" → "Suff"
  # just before synthesis (see the loop below) to force /sʌf/. The source of
  # truth stays "Sough" so a future model with better lexicon coverage — or a
  # pronunciation-dictionary entry — can drop the substitution.
  [welcome]="Welcome to Sough. Breathwork is one of the simplest, most powerful tools we have to influence our nervous system — and modern research is catching up with what practitioners have known for centuries. Let's get you started."
  [help]="Sough can help with many things. Calm yourself when stress builds. Settle into sleep when your mind won't quiet down. Sharpen your focus before something that matters. Or wake up your body when you're feeling flat. Each technique targets a specific response in your nervous system."
  [start-small]="Five minutes a day is enough. Consistency matters far more than duration — a short practice every morning will do more than an hour once a week."
  [five-day]="We've laid out a five-day Foundations program — one practice per day, each with a short lesson up front, building from simple to more advanced. It's there on the home screen whenever you're ready to begin."
)

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

# Auth headers in a 0700 dir so the API key never appears in argv.
HEADER_FILE="$TMP_DIR/elevenlabs-headers"
( umask 077 && {
    echo "xi-api-key: $ELEVENLABS_API_KEY"
    echo "Content-Type: application/json"
    echo "Accept: audio/mpeg"
  } > "$HEADER_FILE" )

# Same loudnorm target the breath-prompt pipeline uses, so onboarding lands
# at the same perceived level as the rest of the in-app voice.
LOUDNORM='loudnorm=I=-22:LRA=7:TP=-1.5'

# Args: [voice...] [-- slug...]. The `--` separator splits voices from slugs;
# either side may be empty. Defaults: voices=(theo), slugs=all SLUGS.
TARGET_VOICES=()
TARGET_SLUGS=()
seen_sep=0
for arg in "$@"; do
  if [[ "$arg" == "--" ]]; then
    seen_sep=1
    continue
  fi
  if [[ $seen_sep -eq 0 ]]; then
    TARGET_VOICES+=("$arg")
  else
    TARGET_SLUGS+=("$arg")
  fi
done
[[ ${#TARGET_VOICES[@]} -eq 0 ]] && TARGET_VOICES=(theo)
[[ ${#TARGET_SLUGS[@]} -eq 0 ]] && TARGET_SLUGS=("${SLUGS[@]}")

for slug in "${TARGET_SLUGS[@]}"; do
  if [[ -z "${NARRATIONS[$slug]+x}" ]]; then
    echo "Unknown slug: $slug" >&2
    echo "Available: ${!NARRATIONS[*]}" >&2
    exit 1
  fi
done

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
    text="${NARRATIONS[$slug]}"
    # Pronunciation respell: see the NARRATIONS comment. The on-disk strings
    # keep the canonical brand; only the bytes sent to ElevenLabs are rewritten.
    text="${text//Sough/Suff}"
    out_file="$out_dir/onboarding-$slug.mp3"
    raw_file="$TMP_DIR/$voice-$slug-raw.mp3"
    echo "  $slug (${#text} chars)"

    body=$(jq -nc \
      --arg text "$text" \
      --arg model "$model_id" \
      --argjson stability "$stability" \
      --argjson sim "$sim" \
      '{text: $text, model_id: $model, voice_settings: {stability: $stability, similarity_boost: $sim}}')

    # Retry on 429 with backoff, like generate-voice.sh.
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
echo "Done. Files under public/voice/{voice}/onboarding-*.mp3"
