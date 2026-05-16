#!/usr/bin/env bash
# Regenerate the built-in voice clips for breath prompts.
#
# Requires `edge-tts` (pip install edge-tts). Free; uses Microsoft's neural
# voices over their public TTS endpoint.
#
# Run from repo root:
#     ./scripts/generate-voice.sh
#
# To change the voice, edit VOICE below. List options with:
#     edge-tts --list-voices | grep -i en-US

set -euo pipefail

VOICE="en-US-AriaNeural"
RATE="-25%"   # slower for guided breathwork
OUT_DIR="$(dirname "$0")/../public/voice"

mkdir -p "$OUT_DIR"

# slug → phrase. Keep in sync with PROMPT_FILE in src/hooks/useSpeech.ts.
declare -A PHRASES=(
  ["breathe-in"]="Breathe in"
  ["breathe-out"]="Breathe out"
  ["hold"]="Hold"
  ["top-up"]="Top up"
  ["long-exhale"]="Long exhale"
  ["in"]="In"
  ["out"]="Out"
  ["empty-the-lungs"]="Empty the lungs"
  ["inhale-left"]="Inhale left"
  ["exhale-right"]="Exhale right"
  ["inhale-right"]="Inhale right"
  ["exhale-left"]="Exhale left"
  ["settle"]="Settle"
  ["rest"]="Rest"
  ["preview"]="Breathe in. Hold. Breathe out."
)

for slug in "${!PHRASES[@]}"; do
  phrase="${PHRASES[$slug]}"
  out="$OUT_DIR/$slug.mp3"
  echo "→ $slug.mp3  ($phrase)"
  edge-tts --voice "$VOICE" --text "$phrase" --rate="$RATE" --write-media "$out"
done

echo
echo "Done. ${#PHRASES[@]} clips written to $OUT_DIR"
