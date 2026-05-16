// Firebase client initialization.
//
// Config is read from Vite env vars (VITE_FIREBASE_*) so secrets aren't
// hard-coded. See .env.example for the required keys. To set up:
//
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

import { initializeApp, type FirebaseOptions } from "firebase/app";
import { GoogleAuthProvider, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const config: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missing = Object.entries(config)
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missing.length > 0) {
  // Surfaced visibly so a fresh clone without .env.local fails loudly
  // rather than 400-ing on every auth call.
  // eslint-disable-next-line no-console
  console.error(
    `Firebase config missing: ${missing.join(", ")}. Copy .env.example to .env.local and fill in your Firebase web-app credentials.`,
  );
}

export const firebaseApp = initializeApp(config);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
