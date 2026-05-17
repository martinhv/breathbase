#!/usr/bin/env node
// Inline Firebase config into public/firebase-messaging-sw.js so the FCM
// service worker can initialize without import.meta.env (which SWs can't
// access). Runs as a postbuild step.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const SRC = resolve("public/firebase-messaging-sw.js");
const OUT = resolve("dist/firebase-messaging-sw.js");

if (!existsSync(OUT) && !existsSync(SRC)) {
  console.error("[build-fcm-sw] firebase-messaging-sw.js not found, skipping");
  process.exit(0);
}

const target = existsSync(OUT) ? OUT : SRC;
let content = readFileSync(target, "utf8");

const replacements = {
  __FIREBASE_API_KEY__: process.env.VITE_FIREBASE_API_KEY || "",
  __FIREBASE_AUTH_DOMAIN__: process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  __FIREBASE_PROJECT_ID__: process.env.VITE_FIREBASE_PROJECT_ID || "",
  __FIREBASE_STORAGE_BUCKET__:
    process.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  __FIREBASE_MESSAGING_SENDER_ID__:
    process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  __FIREBASE_APP_ID__: process.env.VITE_FIREBASE_APP_ID || "",
};

let replaced = 0;
for (const [placeholder, value] of Object.entries(replacements)) {
  if (content.includes(placeholder)) {
    content = content.replaceAll(placeholder, value);
    replaced += 1;
  }
}

writeFileSync(target, content);
console.info(`[build-fcm-sw] wrote ${target} (${replaced} placeholders)`);
