#!/usr/bin/env bash
# Generate a welcome-screen background video via Veo on Vertex AI.
#
# Requires:
#   - gcloud auth login as a personal account with Vertex AI billing
#   - ffmpeg + jq + curl
#   - .env.local with GCLOUD_PROJECT, GCLOUD_ACCOUNT, VEO_* vars (see .env.example)
#
# Cost: a single 8-second Veo 3.x clip is roughly US$3–6 depending on the model.
#
# Run from repo root:
#   ./scripts/generate-welcome-video.sh                       # default prompt
#   ./scripts/generate-welcome-video.sh "custom prompt text"  # override prompt
#
# Outputs:
#   tmp/welcome-bg-raw-<runid>.mp4   (the original 1080p clip from Veo)
#   public/welcome-bg.mp4            (transcoded for web — 720p H.264, no audio)
#   public/welcome-bg-poster.jpg     (first-frame poster for reduced-motion users)

set -euo pipefail

# Load config from .env.local — single source of truth for project/account/model.
if [[ -f .env.local ]]; then
  set -a; . ./.env.local; set +a
fi

PROJECT="${GCLOUD_PROJECT:?GCLOUD_PROJECT must be set in .env.local}"
ACCOUNT="${GCLOUD_ACCOUNT:?GCLOUD_ACCOUNT must be set in .env.local}"
LOCATION="${VEO_LOCATION:-us-central1}"
MODEL="${VEO_MODEL:-veo-3.0-generate-001}"
BUCKET="${VEO_BUCKET:?VEO_BUCKET must be set in .env.local (e.g. gs://my-veo-output)}"

DEFAULT_PROMPT='An abstract, calming loop: slow waves of soft luminous mist in deep teal and indigo blue, gently expanding outward then contracting back inward against a near-black background. The motion follows a breathing rhythm — expansion over about 4 seconds, contraction over about 4 seconds. No people, no objects, no text. Cinematic, minimalist, dreamlike. The final frame should match the first frame so the clip loops seamlessly.'

PROMPT="${1:-$DEFAULT_PROMPT}"

api() {
  curl -sS \
    -H "Authorization: Bearer $(gcloud auth print-access-token --account="$ACCOUNT")" \
    -H "Content-Type: application/json" \
    -H "x-goog-user-project: $PROJECT" \
    "$@"
}

# Ensure output bucket exists.
if ! gcloud storage buckets describe "$BUCKET" --account="$ACCOUNT" --project="$PROJECT" >/dev/null 2>&1; then
  echo "Creating output bucket $BUCKET..."
  gcloud storage buckets create "$BUCKET" --account="$ACCOUNT" --project="$PROJECT" --location="$LOCATION"
fi

RUN_ID=$(date +%Y%m%d-%H%M%S)
STORAGE_URI="$BUCKET/runs/$RUN_ID/"
SUBMIT_URL="https://$LOCATION-aiplatform.googleapis.com/v1/projects/$PROJECT/locations/$LOCATION/publishers/google/models/$MODEL:predictLongRunning"
FETCH_URL="https://$LOCATION-aiplatform.googleapis.com/v1/projects/$PROJECT/locations/$LOCATION/publishers/google/models/$MODEL:fetchPredictOperation"

REQUEST_BODY=$(jq -nc \
  --arg prompt "$PROMPT" \
  --arg storageUri "$STORAGE_URI" \
  '{
    instances: [{prompt: $prompt}],
    parameters: {
      aspectRatio: "16:9",
      durationSeconds: 8,
      sampleCount: 1,
      personGeneration: "dont_allow",
      resolution: "1080p",
      generateAudio: false,
      storageUri: $storageUri
    }
  }')

echo "=== submit ==="
echo "prompt: $(echo "$PROMPT" | head -c 120)..."
echo "model:  $MODEL"
echo "output: $STORAGE_URI"

RESPONSE=$(api -X POST "$SUBMIT_URL" -d "$REQUEST_BODY")
OPERATION_NAME=$(echo "$RESPONSE" | jq -r '.name // empty')
if [[ -z "$OPERATION_NAME" ]]; then
  echo "Submit failed:"
  echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
  exit 1
fi
echo "operation: $OPERATION_NAME"

echo "=== poll ==="
VIDEO_URI=""
for attempt in $(seq 1 60); do
  sleep 5
  STATUS=$(api -X POST "$FETCH_URL" -d "$(jq -nc --arg name "$OPERATION_NAME" '{operationName:$name}')")
  DONE=$(echo "$STATUS" | jq -r '.done // false')
  if [[ "$DONE" == "true" ]]; then
    if echo "$STATUS" | jq -e '.error' >/dev/null 2>&1; then
      echo "Operation failed:"
      echo "$STATUS" | jq .
      exit 1
    fi
    VIDEO_URI=$(echo "$STATUS" | jq -r '.response.videos[0].gcsUri // .response.predictions[0].videoUri // empty')
    if [[ -z "$VIDEO_URI" ]]; then
      echo "Could not find video URI in response:"
      echo "$STATUS" | jq .
      exit 1
    fi
    echo "complete after ${attempt} polls (~$((attempt * 5))s)"
    break
  fi
  echo "  ...processing ($attempt/60)"
done

if [[ -z "$VIDEO_URI" ]]; then
  echo "Timed out after 5 minutes; check the operation in the Cloud console."
  exit 1
fi

echo "=== download ==="
mkdir -p tmp public
RAW_FILE="tmp/welcome-bg-raw-$RUN_ID.mp4"
gcloud storage cp "$VIDEO_URI" "$RAW_FILE" --account="$ACCOUNT" --project="$PROJECT"
ls -lh "$RAW_FILE"

echo "=== transcode ==="
OUT_FILE="public/welcome-bg.mp4"
ffmpeg -y -loglevel error -i "$RAW_FILE" \
  -vf scale=1280:-2 \
  -c:v libx264 -crf 28 -preset slow \
  -an -movflags +faststart \
  "$OUT_FILE"
POSTER="public/welcome-bg-poster.jpg"
ffmpeg -y -loglevel error -ss 0 -i "$OUT_FILE" -frames:v 1 -q:v 4 "$POSTER"

echo
echo "✓ outputs:"
ls -lh "$OUT_FILE" "$POSTER"
echo
echo "Raw clip retained at $RAW_FILE for re-transcoding without re-billing."
