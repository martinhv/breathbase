import { useCallback, useEffect, useMemo, useState } from "react";
import { useSettings } from "@/lib/settings";

/**
 * SpeechSynthesis wrapper. Calm defaults (rate 0.75, pitch 0.8) and an
 * auto-pick heuristic that prefers neural / cloud voices over the robotic
 * eSpeak default that ships with Linux Chrome.
 *
 * Cancels any pending utterance before speaking so phase prompts don't pile
 * up if cycles are short.
 */

const RATE = 0.75;
const PITCH = 0.8;

/** Score a voice — higher is better. */
function scoreVoice(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  let score = 0;
  // Microsoft neural voices (Edge / Windows 11) are top-tier.
  if (name.includes("natural")) score += 100;
  if (name.includes("neural")) score += 100;
  // Google's cloud voices on Chrome.
  if (name.includes("google")) score += 80;
  // Known Apple system voices.
  if (/\b(samantha|karen|daniel|moira|fiona|tessa|allison|tom|alex|ava|serena|nicky)\b/.test(name))
    score += 70;
  // Cloud-backed voices are almost always better than locally synthesized ones.
  if (!v.localService) score += 30;
  // Prefer English locales for the English prompts we use.
  if (v.lang.startsWith("en")) score += 15;
  // Penalize known robotic engines.
  if (name.includes("espeak")) score -= 80;
  if (name === "english") score -= 40; // generic eSpeak entries
  // Slight preference for voices typically perceived as calmer in guided
  // breathwork contexts. Subjective; users can always override.
  if (/\b(female|woman|aria|jenny|samantha|karen|moira|ava|serena)\b/.test(name))
    score += 5;
  return score;
}

function pickBestVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  return [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
}

export function useSpeech() {
  const { settings } = useSettings();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const sync = () => setVoices(window.speechSynthesis.getVoices());
    sync();
    // Chrome populates voices asynchronously.
    window.speechSynthesis.addEventListener("voiceschanged", sync);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", sync);
  }, []);

  /** The voice that will be used when the user hasn't explicitly chosen one. */
  const preferredVoice = useMemo(() => pickBestVoice(voices), [voices]);

  const resolveVoice = useCallback(
    (override?: string | null): SpeechSynthesisVoice | null => {
      const target = override !== undefined ? override : settings.voiceURI;
      if (target) {
        const found = voices.find((v) => v.voiceURI === target);
        if (found) return found;
      }
      return preferredVoice;
    },
    [settings.voiceURI, voices, preferredVoice],
  );

  const speak = useCallback(
    (text: string) => {
      if (!settings.voiceEnabled) return;
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance(text);
      u.rate = RATE;
      u.pitch = PITCH;
      u.volume = Math.max(0, Math.min(1, settings.voiceVolume));
      const chosen = resolveVoice();
      if (chosen) u.voice = chosen;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    },
    [settings.voiceEnabled, settings.voiceVolume, resolveVoice],
  );

  const cancel = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
  }, []);

  /**
   * Speak a fixed preview phrase. `voiceURI === null` previews the
   * auto-picked default. `voiceURI === undefined` previews the user's
   * currently-saved selection.
   */
  const preview = useCallback(
    (voiceURI?: string | null) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance("Breathe in. Hold. Breathe out.");
      u.rate = RATE;
      u.pitch = PITCH;
      u.volume = Math.max(0, Math.min(1, settings.voiceVolume));
      const chosen = resolveVoice(voiceURI ?? null);
      if (chosen) u.voice = chosen;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    },
    [settings.voiceVolume, resolveVoice],
  );

  return { speak, cancel, preview, voices, preferredVoice };
}
