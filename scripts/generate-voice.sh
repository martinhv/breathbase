#!/usr/bin/env bash
# Regenerate the built-in voice clips for breath prompts, one set per voice.
#
# Requires:
#   - edge-tts (pip install edge-tts)        — Microsoft neural TTS (free, offline)
#   - curl + jq                               — ElevenLabs API calls
#   - ffmpeg                                  — silence trim + whisper filter
#
# ElevenLabs voices (engine "11l") additionally need:
#   - ELEVENLABS_API_KEY env var (https://elevenlabs.io → profile → API key)
#
# Run from repo root:
#     ./scripts/generate-voice.sh                  # all voices
#     ./scripts/generate-voice.sh aria thomas      # specific voices
#     ./scripts/generate-voice.sh oliver           # ElevenLabs voice only
#
# To list available edge-tts voices:
#     edge-tts --list-voices | grep -i en-
# To list available ElevenLabs voices (paste your key first):
#     curl -s -H "xi-api-key: $ELEVENLABS_API_KEY" https://api.elevenlabs.io/v1/voices | jq '.voices[] | {voice_id,name}'

set -euo pipefail

# Pipe-separated rows. The second field selects the synthesis engine; remaining
# fields are engine-specific. Keep ids in sync with src/lib/voiceProfiles.ts.
#
#   edge: id|edge|edge-voice-name|rate|pitch
#   11l:  id|11l|voice-id|model-id|stability|similarity_boost
#
# ElevenLabs voice IDs come from the public library at elevenlabs.io/app/voice-library
# or from `/v1/voices` (see header). George is a warm British male; swap the id
# below to retune the "oliver" profile without touching anything else.
VOICES=(
  "aria|edge|en-US-AriaNeural|-30%|+0Hz"
  "jenny|edge|en-US-JennyNeural|-30%|+0Hz"
  "guy|edge|en-US-GuyNeural|-30%|+0Hz"
  "libby|edge|en-GB-LibbyNeural|-30%|+0Hz"
  "thomas|edge|en-GB-ThomasNeural|-30%|-10Hz"
  "oliver|11l|JBFqnCBsd6RMkjVDRZzb|eleven_multilingual_v2|0.80|0.85"
  "sarah|11l|EXAVITQu4vr4xnSDxMaL|eleven_multilingual_v2|0.80|0.85"
  "bill|11l|pqHfZKP75CvOlQylNhV4|eleven_turbo_v2|0.80|0.85"
  "theo|11l|UmQN7jS1Ee8B1czsUtQh|eleven_multilingual_v2|0.80|0.85"
  "priyanka|11l|BpjGufoPiobT79j2vtj4|eleven_multilingual_v2|0.80|0.85"
  "brittney|11l|pjcYQlDFKMbcOUp6F5GD|eleven_multilingual_v2|0.80|0.85"
  "christopher|11l|zO2z8i0srbO9r7GT5C4h|eleven_multilingual_v2|0.80|0.85"
)

OUT_ROOT="$(dirname "$0")/../public/voice"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# Lazy-init the ElevenLabs auth headers in a file under $TMP_DIR so the API
# key never appears in curl's argv (which is world-readable via /proc on
# Linux). The file inherits $TMP_DIR's 0700 perms; we set 0600 on it as
# defence-in-depth. Cleared automatically by the EXIT trap.
ELEVENLABS_HEADER_FILE=""
prepare_elevenlabs_header() {
  if [[ -n "$ELEVENLABS_HEADER_FILE" ]]; then return; fi
  : "${ELEVENLABS_API_KEY:?ELEVENLABS_API_KEY not set — needed for 11l engine voices}"
  ELEVENLABS_HEADER_FILE="$TMP_DIR/elevenlabs-headers"
  ( umask 077 && {
      echo "xi-api-key: $ELEVENLABS_API_KEY"
      echo "Content-Type: application/json"
      echo "Accept: audio/mpeg"
    } > "$ELEVENLABS_HEADER_FILE" )
}

# slug → phrase. Keep slugs in sync with PROMPT_SLUGS in src/hooks/useSpeech.ts.
declare -A PHRASES=(
  ["breathe-in"]="Breathe in"
  ["breathe-out"]="Breathe out"
  ["hold"]="Hold"
  ["top-up"]="Top up"
  ["long-exhale"]="Long exhale"
  # "In." / "Out." (with period) — ElevenLabs treats single-token utterances
  # like bare "In" as fragments and can mispronounce or truncate them; the
  # period gives the model a complete-sentence signal. edge-tts handles either
  # form fine, so we use the punctuated form for both.
  ["in"]="In."
  ["out"]="Out."
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

# Loudness normalization (EBU R128). Applied BEFORE trim and whisper FX so
# all voices land at the same perceived loudness without us having to boost
# in post — which would amplify the whispered count noise floor. Target
# -22 LUFS matches Priyanka's natural level; tweak both numbers in sync if
# you want a louder/quieter baseline.
LOUDNORM='loudnorm=I=-22:LRA=7:TP=-1.5'

# ffmpeg filter to trim leading + trailing silence (-40dB threshold,
# keep 180ms of natural tail). Applied to action clips — edge-tts inserts
# ~1s of trailing silence that throws off countdown scheduling otherwise.
# ElevenLabs short utterances ("In.", "Out.") have a gentle release that
# falls below the threshold quickly, so we keep a generous tail to avoid
# clipping the final phoneme.
TRIM_FILTER="${LOUDNORM},silenceremove=start_periods=1:start_silence=0.05:start_threshold=-40dB:detection=peak,silenceremove=stop_periods=-1:stop_silence=0.18:stop_threshold=-40dB:detection=peak"

# Looser trim for count clips: keeps a longer natural decay (250ms) and
# uses a softer threshold so short words like "One" don't feel clipped
# after the volume drop + bandpass.
TRIM_FILTER_COUNT="${LOUDNORM},silenceremove=start_periods=1:start_silence=0.05:start_threshold=-40dB:detection=peak,silenceremove=stop_periods=-1:stop_silence=0.25:stop_threshold=-48dB:detection=peak"

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

# Synthesize one phrase to $raw using the engine-specific params.
#   synthesize <engine> <raw_out> <phrase> <slug> <engine_params...>
synthesize() {
  local engine="$1" raw="$2" phrase="$3" slug="$4"; shift 4
  case "$engine" in
    edge)
      local voice="$1" rate="$2" pitch="$3"
      # Final-beat clarity: slow "one" and "two" so they feel deliberate.
      local slug_rate="$rate"
      case "$slug" in
        count-1) slug_rate="-45%" ;;
        count-2) slug_rate="-38%" ;;
      esac
      edge-tts --voice "$voice" --text "$phrase" --rate="$slug_rate" --pitch="$pitch" --write-media "$raw"
      ;;
    11l)
      local voice_id="$1" model="$2" stability="$3" similarity="$4"
      prepare_elevenlabs_header
      # Write request body to a temp file so it stays out of curl's argv too
      # (pairs with the header-file fix for the credential).
      local body_file="$TMP_DIR/elevenlabs-body.json"
      jq -nc \
        --arg text "$phrase" --arg model "$model" \
        --argjson stability "$stability" --argjson similarity "$similarity" \
        '{text:$text, model_id:$model,
          voice_settings:{stability:$stability, similarity_boost:$similarity,
                          style:0.0, use_speaker_boost:true}}' > "$body_file"
      # Retry transient 429/5xx with exponential backoff. ElevenLabs returns
      # 429 "system_busy" during traffic spikes; usually clears within seconds.
      local http_code attempt delay
      for attempt in 1 2 3 4; do
        http_code=$(curl -sS -w "%{http_code}" -o "$raw" \
          -X POST "https://api.elevenlabs.io/v1/text-to-speech/${voice_id}?output_format=mp3_44100_128" \
          -H "@$ELEVENLABS_HEADER_FILE" \
          --data "@$body_file")
        if [[ "$http_code" == "200" ]]; then break; fi
        if [[ "$http_code" != "429" && "$http_code" != "5"* ]]; then break; fi
        if [[ "$attempt" == "4" ]]; then break; fi
        delay=$(( attempt * 3 ))
        echo "  ElevenLabs HTTP $http_code on '$slug', retrying in ${delay}s (attempt $attempt/3)..." >&2
        sleep "$delay"
      done
      if [[ "$http_code" != "200" ]]; then
        echo "  ElevenLabs HTTP $http_code for slug '$slug':" >&2
        cat "$raw" >&2; echo >&2
        return 1
      fi
      # ElevenLabs has no rate knob, so achieve the deliberate-final-beat feel
      # via post-hoc atempo (preserves pitch). Skipped for longer counts.
      case "$slug" in
        count-1) ffmpeg -y -loglevel error -i "$raw" -af "atempo=0.78" -codec:a libmp3lame -q:a 2 "$raw.tmp.mp3" && mv "$raw.tmp.mp3" "$raw" ;;
        count-2) ffmpeg -y -loglevel error -i "$raw" -af "atempo=0.85" -codec:a libmp3lame -q:a 2 "$raw.tmp.mp3" && mv "$raw.tmp.mp3" "$raw" ;;
      esac
      ;;
    *) echo "Unknown engine: $engine" >&2; return 1 ;;
  esac
}

for entry in "${VOICES[@]}"; do
  IFS='|' read -ra fields <<< "$entry"
  id="${fields[0]}"
  engine="${fields[1]}"
  engine_params=("${fields[@]:2}")

  if ! should_render "$id"; then continue; fi

  out_dir="$OUT_ROOT/$id"
  mkdir -p "$out_dir"
  echo "=== $id ($engine: ${engine_params[*]}) ==="
  for slug in "${!PHRASES[@]}"; do
    phrase="${PHRASES[$slug]}"
    raw="$TMP_DIR/$id-$slug-raw.mp3"
    out="$out_dir/$slug.mp3"

    synthesize "$engine" "$raw" "$phrase" "$slug" "${engine_params[@]}"

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
