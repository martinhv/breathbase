// Firebase Cloud Messaging background service worker.
//
// Sits alongside the vite-plugin-pwa service worker (different scope so they
// don't conflict). Its only job is to render notifications when an FCM push
// arrives while the app is closed.
//
// The Firebase config below is INTENTIONALLY left blank in the repo —
// `scripts/build-fcm-sw.mjs` rewrites this file at build time, inlining the
// VITE_FIREBASE_* values from the environment so they ship with the SW.
// (Service workers can't read import.meta.env.)

importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js",
);

// __FIREBASE_CONFIG__ — this placeholder is replaced at build time.
const firebaseConfig = {
  apiKey: "__FIREBASE_API_KEY__",
  authDomain: "__FIREBASE_AUTH_DOMAIN__",
  projectId: "__FIREBASE_PROJECT_ID__",
  storageBucket: "__FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__FIREBASE_APP_ID__",
};

// If the placeholders weren't replaced or are empty (local-mode build, or
// the user hasn't configured Firebase), skip initialization — the SW just
// sits idle. Both an empty string and a "__PLACEHOLDER__" value fail this.
if (
  firebaseConfig.projectId &&
  !firebaseConfig.projectId.startsWith("__")
) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || "Sough";
    const options = {
      body: payload.notification?.body || "Time to practice.",
      icon: "/icon-512.svg",
      tag: "sough-reminder",
    };
    self.registration.showNotification(title, options);
  });
}
