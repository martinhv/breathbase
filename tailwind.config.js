/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
      colors: {
        ink: {
          950: "#070b14",
          900: "#0b1120",
          800: "#0f172a",
          700: "#1e293b",
        },
        teal: {
          muted: "#3a8a87",
        },
      },
      keyframes: {
        "soft-pulse": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "soft-pulse": "soft-pulse 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
