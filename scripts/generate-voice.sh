#!/usr/bin/env bash
# Regenerate the built-in voice clips for breath prompts, one set per voice.
#
# Requires `edge-tts` (pip install edge-tts). Free; uses Microsoft's neural
# voices over their public TTS endpoint.
#
# Run from repo root:
#     ./scripts/generate-voice.sh                  # all voices
#     ./scripts/generate-voice.sh aria thomas      # specific voices
#
# To list available voices:
#     edge-tts --list-voices | grep -i en-

set -euo pipefail

# Pipe-separated: id|edge-voice|rate|pitch.
# Keep ids in sync with src/lib/voiceProfiles.ts.
VOICES=(
  "aria|en-US-AriaNeural|-25%|+0Hz"
  "jenny|en-US-JennyNeural|-25%|+0Hz"
  "guy|en-US-GuyNeural|-25%|+0Hz"
  "libby|en-GB-LibbyNeural|-25%|+0Hz"
  "thomas|en-GB-ThomasNeural|-25%|-10Hz"
)

OUT_ROOT="$(dirname "$0")/../public/voice"

# slug → phrase. Keep slugs in sync with PROMPT_SLUGS in src/hooks/useSpeech.ts.
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

# Filter voices if any args were passed.
selected=("$@")
should_render() {
  local id="$1"
  if [[ ${#selected[@]} -eq 0 ]]; then return 0; fi
  for s in "${selected[@]}"; do
    if [[ "$s" == "$id" ]]; then return 0; fi
  done
  return 1
}

for entry in "${VOICES[@]}"; do
  IFS='|' read -r id voice rate pitch <<< "$entry"
  if ! should_render "$id"; then continue; fi

  out_dir="$OUT_ROOT/$id"
  mkdir -p "$out_dir"
  echo "=== $id ($voice, rate=$rate pitch=$pitch) ==="
  for slug in "${!PHRASES[@]}"; do
    phrase="${PHRASES[$slug]}"
    out="$out_dir/$slug.mp3"
    echo "  → $slug.mp3  ($phrase)"
    edge-tts --voice "$voice" --text "$phrase" --rate="$rate" --pitch="$pitch" --write-media "$out"
  done
done

echo
echo "Done."
