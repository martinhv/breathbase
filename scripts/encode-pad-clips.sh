#!/usr/bin/env bash
# Encode the 8 pad clips rendered by scripts/render-pad-clips.html into MP3s
# under public/sounds/. Run once after a fresh bake.
#
# Usage:
#   ./scripts/encode-pad-clips.sh                # reads WAVs from ~/Downloads
#   ./scripts/encode-pad-clips.sh /path/to/dir   # reads WAVs from <dir>
#
# Requires: ffmpeg
#
# The runtime engine fetches /sounds/pad-chord-{0..7}.mp3 via Tone.Player; the
# service worker runtime-caches them on first play (see vite.config.ts).

set -euo pipefail

SRC_DIR="${1:-$HOME/Downloads}"
OUT_DIR="$(dirname "$0")/../public/sounds"

mkdir -p "$OUT_DIR"

# 96 kbps stereo VBR is plenty for an ambient drone; trim leading/trailing
# silence is NOT applied — the baked envelope (attack + release) is the point.
# -ac 2     keep stereo (the chorus on the strings creates real L/R movement)
# -ar 44100 standard sample rate
# -q:a 5    LAME VBR quality ≈ 130 kbps
for i in 0 1 2 3 4 5 6 7; do
  IN="$SRC_DIR/pad-chord-$i.wav"
  OUT="$OUT_DIR/pad-chord-$i.mp3"
  if [[ ! -f "$IN" ]]; then
    echo "missing: $IN" >&2
    exit 1
  fi
  echo "encoding $IN → $OUT"
  ffmpeg -y -loglevel error -i "$IN" -ac 2 -ar 44100 -codec:a libmp3lame -q:a 5 "$OUT"
done

echo
echo "done — $OUT_DIR/pad-chord-{0..7}.mp3"
ls -lh "$OUT_DIR"/pad-chord-*.mp3
