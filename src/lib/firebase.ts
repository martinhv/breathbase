// Firebase client initialization.
//
// Config is read from Vite env vars (VITE_FIREBASE_*) so secrets aren't
// hard-coded. See .env.example for the required keys.
//
// ── Local mode ─────────────────────────────────────────────────────────────
// Set VITE_LOCAL_MODE=true (or simply omit Firebase env vars) to run with no
// Firebase at all: a synthetic local user is signed in automatically and
// data persists to window.localStorage. Useful for `npm run dev` on a fresh
// clone or for offline-only testing. See `localMode` below.
//
// ── Firebase setup (production) ────────────────────────────────────────────
//   1. Create a Firebase project at https://console.firebase.google.com
//   2. Enable Authentication → Google sign-in provider
//   3. Enable Firestore Database (start in production mode; rules below)
//   4. Copy the web app config into a local .env.local file
//
// Suggested Firestore rules (users can only read/write their own data):
//
//   rules_version = '2';
//   service cloud.firestore {
//     match /databases/{database}/documents {
//       match /users/{uid}/{document=**} {
//         allow read, write: if request.auth != null && request.auth.uid == uid;
//       }
//     }
//   }

import {
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import { GoogleAuthProvider, getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const config: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Local mode = explicit opt-in OR no Firebase config at all. Missing-config
// auto-fallback means `npm run dev` works on a fresh clone with zero setup.
const explicitlyLocal = import.meta.env.VITE_LOCAL_MODE === "true";
const hasAnyFirebaseConfig = Object.values(config).some((v) => !!v);
export const localMode = explicitlyLocal || !hasAnyFirebaseConfig;

let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _provider: GoogleAuthProvider | undefined;

if (localMode) {
  // eslint-disable-next-line no-console
  console.info(
    "[breathbase] Running in local mode — Firebase disabled, data persists to localStorage.",
  );
} else {
  const missing = Object.entries(config)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length > 0) {
    // Partial config: visible failure so a fresh clone with a half-filled
    // .env.local fails loudly rather than 400-ing on every auth call.
    // eslint-disable-next-line no-console
    console.error(
      `Firebase config missing: ${missing.join(", ")}. Copy .env.example to .env.local and fill in your Firebase web-app credentials, or set VITE_LOCAL_MODE=true to skip Firebase entirely.`,
    );
  }
  _app = initializeApp(config);
  _auth = getAuth(_app);
  _db = getFirestore(_app);
  _provider = new GoogleAuthProvider();
}

// In local mode these are undefined. Callers MUST check `localMode` before
// touching them — the cast is a promise we keep, not a runtime safety net.
export const firebaseApp = _app as FirebaseApp;
export const auth = _auth as Auth;
export const db = _db as Firestore;
export const googleProvider = _provider as GoogleAuthProvider;
