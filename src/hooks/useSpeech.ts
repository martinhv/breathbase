import { useCallback, useEffect, useRef } from "react";
import { useSettings } from "@/lib/settings";
import { findVoiceProfile } from "@/lib/voiceProfiles";

// Pre-rendered voice prompts.
//
// Why not Web Speech API? On Firefox + Linux the default voice is eSpeak,
// which is robotic and clashes with the calm-ambient feel of the app.
// Quality also varies wildly across browsers, OSes, and installed voices.
//
// Every prompt comes from a fixed vocabulary of ~14 strings, so we ship
// pre-rendered MP3s (Microsoft neural voices, generated via
// scripts/generate-voice.sh) and play them with HTMLAudioElement. The
// service worker precaches them so they're available offline.
//
// Multiple voice profiles live under public/voice/{profileId}/{slug}.mp3.
// The active profile comes from settings.voiceProfile.

const PROMPT_SLUGS: Record<string, string> = {
  "Breathe in": "breathe-in",
  "Breathe out": "breathe-out",
  Hold: "hold",
  "Top up": "top-up",
  "Long exhale": "long-exhale",
  In: "in",
  Out: "out",
  "Empty the lungs": "empty-the-lungs",
  "Inhale left": "inhale-left",
  "Exhale right": "exhale-right",
  "Inhale right": "inhale-right",
  "Exhale left": "exhale-left",
  Settle: "settle",
  Rest: "rest",
};

const PREVIEW_SLUG = "preview";

const clipUrl = (profileId: string, slug: string): string =>
  `/voice/${profileId}/${slug}.mp3`;

export function useSpeech() {
  const { settings } = useSettings();

  // A single Audio element reused for every prompt.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (audioRef.current === null && typeof window !== "undefined") {
    audioRef.current = new Audio();
    audioRef.current.preload = "auto";
  }

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
    el.pause();
    el.currentTime = 0;
    if (!el.src.endsWith(src)) {
      el.src = src;
    }
    // play() returns a promise that rejects if interrupted; swallow it so
    // a quick phase-change doesn't surface a console error.
    void el.play().catch(() => {});
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!settings.voiceEnabled) return;
      const slug = PROMPT_SLUGS[text];
      if (!slug) return;
      const profile = findVoiceProfile(settings.voiceProfile);
      playFile(clipUrl(profile.id, slug));
    },
    [settings.voiceEnabled, settings.voiceProfile, playFile],
  );

  const cancel = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  }, []);

  /**
   * Play the preview phrase. Pass a profile id to preview a specific voice;
   * omit to preview the currently selected one.
   */
  const preview = useCallback(
    (profileId?: string) => {
      const profile = findVoiceProfile(profileId ?? settings.voiceProfile);
      playFile(clipUrl(profile.id, PREVIEW_SLUG));
    },
    [settings.voiceProfile, playFile],
  );

  return { speak, cancel, preview };
}
