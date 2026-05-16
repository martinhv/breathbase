#!/usr/bin/env bash
# Regenerate the built-in voice clips for breath prompts, one set per voice.
#
# Requires:
#   - edge-tts (pip install edge-tts)        — neural TTS
#   - ffmpeg                                  — silence trim + whisper filter
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
  "aria|en-US-AriaNeural|-30%|+0Hz"
  "jenny|en-US-JennyNeural|-30%|+0Hz"
  "guy|en-US-GuyNeural|-30%|+0Hz"
  "libby|en-GB-LibbyNeural|-30%|+0Hz"
  "thomas|en-GB-ThomasNeural|-30%|-10Hz"
)

OUT_ROOT="$(dirname "$0")/../public/voice"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

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
  # Countdown clips: spoken at reduced volume + bandpass for an airy
  # whisper-ish feel. Need up to 15 to cover 4-7-8's 8s exhale and bellows'
  # 10s rest. Phases longer than 15s only count their final 15s.
  ["count-1"]="One"
  ["count-2"]="Two"
  ["count-3"]="Three"
  ["count-4"]="Four"
  ["count-5"]="Five"
  ["count-6"]="Six"
  ["count-7"]="Seven"
  ["count-8"]="Eight"
  ["count-9"]="Nine"
  ["count-10"]="Ten"
  ["count-11"]="Eleven"
  ["count-12"]="Twelve"
  ["count-13"]="Thirteen"
  ["count-14"]="Fourteen"
  ["count-15"]="Fifteen"
)

# ffmpeg filter to trim leading + trailing silence (-40dB threshold,
# keep 80ms of natural tail). Applied to every clip — edge-tts inserts
# ~1s of trailing silence that throws off countdown scheduling otherwise.
TRIM_FILTER='silenceremove=start_periods=1:start_silence=0.05:start_threshold=-40dB:detection=peak,silenceremove=stop_periods=-1:stop_silence=0.08:stop_threshold=-40dB:detection=peak'

# Whisper-ish filter for count clips: highpass strips the bass body, lowpass
# rolls off harsh highs, volume drops to 50% so it sits well behind the
# action prompt. Not a true vocoder whisper but perceptibly softer + airier.
WHISPER_FILTER='highpass=f=350,lowpass=f=3800,volume=0.5'

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
    raw="$TMP_DIR/$id-$slug-raw.mp3"
    out="$out_dir/$slug.mp3"

    edge-tts --voice "$voice" --text "$phrase" --rate="$rate" --pitch="$pitch" --write-media "$raw"

    if [[ "$slug" == count-* ]]; then
      filter="$TRIM_FILTER,$WHISPER_FILTER"
    else
      filter="$TRIM_FILTER"
    fi

    ffmpeg -y -loglevel error -i "$raw" -af "$filter" -codec:a libmp3lame -q:a 4 "$out"
    echo "  → $slug.mp3"
  done
done

echo
echo "Done."
