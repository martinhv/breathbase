import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // "prompt" so a new build doesn't silently swap the SW under a user
      // mid-session. The ReloadPrompt component (src/components/) shows a
      // small banner and the user taps to apply the update.
      registerType: "prompt",
      includeAssets: ["favicon.svg", "icon-512.svg"],
      workbox: {
        // Voice mp3s are *not* precached — that would force every user to
        // download all 5 voices' worth of clips (~1.5MB) on first visit.
        // Instead they're cached at runtime as the active voice plays them.
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/voice/"),
            handler: "CacheFirst",
            options: {
              cacheName: "bb-voice-clips",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: "BreathBase",
        short_name: "BreathBase",
        description: "Foundational breathwork, grounded in science.",
        theme_color: "#0f172a",
        background_color: "#0b1120",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "icon-512.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Pull the three heaviest dependencies into their own chunks so the
        // browser can fetch them in parallel with the main app code, and so
        // updates that only touch our source don't bust their cache.
        manualChunks: {
          firebase: [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
          ],
          tone: ["tone"],
          framer: ["framer-motion"],
        },
      },
    },
  },
});
