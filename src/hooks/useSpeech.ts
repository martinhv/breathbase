import { useCallback, useEffect, useRef } from "react";
import { useSettings } from "@/lib/settings";

// Pre-rendered voice prompts.
//
// Why not Web Speech API? On Firefox + Linux the default voice is eSpeak,
// which is robotic and clashes with the calm-ambient feel of the app.
// Quality also varies wildly across browsers, OSes, and installed voices.
//
// Since every prompt in techniques.ts comes from a fixed vocabulary of
// ~14 strings, we ship pre-rendered MP3s (Microsoft Aria, generated via
// scripts/generate-voice.sh) and play them with HTMLAudioElement. The
// PWA service worker caches them so they're available offline after the
// first load.
//
// To add a new voice prompt:
//   1. Add an entry to PROMPT_FILE below.
//   2. Add the same slug → text mapping in scripts/generate-voice.sh.
//   3. Run ./scripts/generate-voice.sh and commit the new mp3.

const PROMPT_FILE: Record<string, string> = {
  "Breathe in": "/voice/breathe-in.mp3",
  "Breathe out": "/voice/breathe-out.mp3",
  Hold: "/voice/hold.mp3",
  "Top up": "/voice/top-up.mp3",
  "Long exhale": "/voice/long-exhale.mp3",
  In: "/voice/in.mp3",
  Out: "/voice/out.mp3",
  "Empty the lungs": "/voice/empty-the-lungs.mp3",
  "Inhale left": "/voice/inhale-left.mp3",
  "Exhale right": "/voice/exhale-right.mp3",
  "Inhale right": "/voice/inhale-right.mp3",
  "Exhale left": "/voice/exhale-left.mp3",
  Settle: "/voice/settle.mp3",
  Rest: "/voice/rest.mp3",
};

const PREVIEW_FILE = "/voice/preview.mp3";

export function useSpeech() {
  const { settings } = useSettings();

  // A single Audio element reused for every prompt. We could pool one per
  // file, but at our cycle rates a fresh play() on the same element is
  // simpler and keeps memory flat.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (audioRef.current === null && typeof window !== "undefined") {
    audioRef.current = new Audio();
    audioRef.current.preload = "auto";
  }

  // Keep volume in sync without re-creating the element.
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(
        0,
        Math.min(1, settings.voiceVolume),
      );
    }
  }, [settings.voiceVolume]);

  const playFile = useCallback((src: string) => {
    const el = audioRef.current;
    if (!el) return;
    // If the same prompt is already mid-play (rare but possible on quick
    // skip), reset to start rather than waiting for it to finish.
    el.pause();
    el.currentTime = 0;
    if (el.src !== window.location.origin + src && !el.src.endsWith(src)) {
      el.src = src;
    }
    // play() returns a promise that rejects if interrupted; swallow it so
    // a quick phase-change doesn't surface a console error.
    void el.play().catch(() => {});
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!settings.voiceEnabled) return;
      const src = PROMPT_FILE[text];
      if (!src) {
        // Unknown phrase — silently skip. Adding a new voicePrompt without
        // a corresponding clip is the only way this happens; the bash
        // generator script enforces parity at build-time-ish.
        return;
      }
      playFile(src);
    },
    [settings.voiceEnabled, playFile],
  );

  const cancel = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  }, []);

  const preview = useCallback(() => {
    playFile(PREVIEW_FILE);
  }, [playFile]);

  return { speak, cancel, preview };
}
