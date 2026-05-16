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
# keep 80ms of natural tail). Applied to action clips — edge-tts inserts
# ~1s of trailing silence that throws off countdown scheduling otherwise.
TRIM_FILTER='silenceremove=start_periods=1:start_silence=0.05:start_threshold=-40dB:detection=peak,silenceremove=stop_periods=-1:stop_silence=0.08:stop_threshold=-40dB:detection=peak'

# Looser trim for count clips: keeps a longer natural decay (250ms) and
# uses a softer threshold so short words like "One" don't feel clipped
# after the volume drop + bandpass.
TRIM_FILTER_COUNT='silenceremove=start_periods=1:start_silence=0.05:start_threshold=-40dB:detection=peak,silenceremove=stop_periods=-1:stop_silence=0.25:stop_threshold=-48dB:detection=peak'

# Build a per-count whisper filter_complex. Counts use a gradient so the
# numbers feel like they're trailing into breath as the phase ends:
#
#   count-15  (start of long phases)   → mild thin-out, voice 0.55, light hiss
#   count-1   (last second)            → strong whisper, voice 0.18, prominent hiss
#
# The "whisper" approximation stacks three things:
#   1. A bandpass that removes the chest-voice body.
#   2. A baked-in voice volume drop that scales with count number.
#   3. A pink-noise hiss in the 1.5–5 kHz "breath" band, mixed under the
#      voice, with amplitude that scales the opposite way (loudest on
#      count-1) so the closer to zero, the more it sounds like breath
#      and less like speech.
#
# Returns a complete filter_complex string ending in [out]; callers must
# invoke ffmpeg with `-filter_complex "$str" -map "[out]"`.
whisper_filter_for_count() {
  local n="$1"
  # strength_pct: 0 (n=15) … 100 (n=1)
  local strength_pct=$(( (16 - n) * 100 / 15 ))
  local voice_vol noise_amp noise_weight lp hp
  # voice_vol sweeps 0.55 (n=15) → 0.25 (n=1)
  voice_vol=$(awk "BEGIN{printf \"%.3f\", 0.55 - 0.30*$strength_pct/100}")
  # noise_amp 0.03 → 0.07, noise_weight 0.02 → 0.08 — a hint of breath, not a hiss
  noise_amp=$(awk "BEGIN{printf \"%.3f\", 0.03 + 0.04*$strength_pct/100}")
  noise_weight=$(awk "BEGIN{printf \"%.2f\", 0.02 + 0.06*$strength_pct/100}")
  # lp 3700 → 2300 Hz, hp 380 → 800 Hz
  lp=$(( 3700 - 14 * strength_pct ))
  hp=$(( 380 + 42 * strength_pct / 10 ))

  # asplit so we can both (a) shape the voice and (b) use the un-shaped
  # trimmed speech as a sidechain trigger for the noise gate.
  printf "[0:a]%s,asplit=2[for_voice][trig];" "$TRIM_FILTER_COUNT"
  printf "[for_voice]highpass=f=%d,lowpass=f=%d,volume=%s[voice];" \
    "$hp" "$lp" "$voice_vol"
  printf "anoisesrc=color=pink:amplitude=%s:duration=5,highpass=f=1500,lowpass=f=5000[noise_raw];" \
    "$noise_amp"
  # sidechaingate: when the trigger (speech) is above threshold the gate
  # opens and noise passes through; otherwise it's attenuated. Attack/release
  # smooth the envelope so the hiss swells with syllables rather than
  # chattering on/off.
  printf "[noise_raw][trig]sidechaingate=threshold=0.01:ratio=8:range=0.05:attack=10:release=200:level_sc=4[noise];"
  printf "[voice][noise]amix=inputs=2:duration=first:dropout_transition=0:weights=1 %s[out]" \
    "$noise_weight"
}

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

    # Per-slug rate override: pronounce the final beat ("one") more
    # deliberately than the rest. Two is also slightly slowed to match
    # the wind-down feel.
    slug_rate="$rate"
    case "$slug" in
      count-1) slug_rate="-45%" ;;
      count-2) slug_rate="-38%" ;;
    esac

    edge-tts --voice "$voice" --text "$phrase" --rate="$slug_rate" --pitch="$pitch" --write-media "$raw"

    if [[ "$slug" == count-* ]]; then
      n="${slug#count-}"
      filter_complex=$(whisper_filter_for_count "$n")
      ffmpeg -y -loglevel error -i "$raw" -filter_complex "$filter_complex" -map "[out]" -codec:a libmp3lame -q:a 4 "$out"
    else
      ffmpeg -y -loglevel error -i "$raw" -af "$TRIM_FILTER" -codec:a libmp3lame -q:a 4 "$out"
    fi
    echo "  → $slug.mp3"
  done
done

echo
echo "Done."
