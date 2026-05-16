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
      includeAssets: ["favicon.svg", "icon-512.svg", "voice/*.mp3"],
      workbox: {
        // Precache pre-rendered voice clips so the app is fully offline.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,mp3}"],
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
});
