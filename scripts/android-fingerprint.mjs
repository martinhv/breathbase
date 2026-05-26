#!/usr/bin/env node
// Read the SHA-256 cert fingerprint from the local TWA keystore that
// bubblewrap produces and write it into public/.well-known/assetlinks.json.
//
// Usage:
//   node scripts/android-fingerprint.mjs                # local keystore
//   node scripts/android-fingerprint.mjs --play <sha>   # add Play app signing fingerprint
//
// Idempotent: if the fingerprint is already in the file, nothing changes.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ASSETLINKS = resolve("public/.well-known/assetlinks.json");
const KEYSTORE = resolve("android/android.keystore");
// Bubblewrap defaults for the keystore it generates during `init`. Override
// via env vars if you customized them when running `npm run android:init`.
const KEY_ALIAS = process.env.ANDROID_KEY_ALIAS || "android";
const KEY_PASS = process.env.ANDROID_KEY_PASS || "android";

const PLACEHOLDER = "REPLACE_WITH_PLAY_APP_SIGNING_FINGERPRINT";

function getLocalFingerprint() {
  if (!existsSync(KEYSTORE)) {
    console.error(
      `[android-fingerprint] ${KEYSTORE} not found. Run \`npm run android:init\` and \`npm run android:build\` first.`,
    );
    process.exit(1);
  }
  const out = execFileSync(
    "keytool",
    [
      "-list",
      "-v",
      "-keystore", KEYSTORE,
      "-alias", KEY_ALIAS,
      "-storepass", KEY_PASS,
      "-keypass", KEY_PASS,
    ],
    { encoding: "utf8" },
  );
  const match = out.match(/SHA256:\s*([0-9A-F:]+)/);
  if (!match) {
    console.error("[android-fingerprint] Could not find SHA256 in keytool output.");
    console.error(out);
    process.exit(1);
  }
  return match[1];
}

function loadAssetlinks() {
  if (!existsSync(ASSETLINKS)) {
    console.error(`[android-fingerprint] ${ASSETLINKS} not found.`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(ASSETLINKS, "utf8"));
}

function addFingerprint(json, fingerprint, label) {
  const entry = json[0];
  if (!entry || !entry.target) {
    console.error("[android-fingerprint] assetlinks.json shape is unexpected; aborting.");
    process.exit(1);
  }
  const fps = entry.target.sha256_cert_fingerprints || [];
  const filtered = fps.filter((f) => f !== PLACEHOLDER);
  if (filtered.includes(fingerprint)) {
    console.log(`[android-fingerprint] ${label} fingerprint already present, no change.`);
    return false;
  }
  filtered.push(fingerprint);
  entry.target.sha256_cert_fingerprints = filtered;
  return true;
}

const args = process.argv.slice(2);
const playIdx = args.indexOf("--play");
const playFingerprint = playIdx >= 0 ? args[playIdx + 1] : null;

const json = loadAssetlinks();
let changed = false;

if (playFingerprint) {
  if (!/^[0-9A-F:]+$/i.test(playFingerprint)) {
    console.error("[android-fingerprint] --play value doesn't look like a SHA256 (expected colon-separated hex).");
    process.exit(1);
  }
  changed = addFingerprint(json, playFingerprint.toUpperCase(), "Play app signing") || changed;
} else {
  const local = getLocalFingerprint();
  changed = addFingerprint(json, local, "Local keystore") || changed;
}

if (changed) {
  writeFileSync(ASSETLINKS, JSON.stringify(json, null, 2) + "\n");
  console.log(`[android-fingerprint] Updated ${ASSETLINKS}.`);
} else {
  console.log("[android-fingerprint] Nothing to do.");
}
