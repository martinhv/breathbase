import { useCallback, useEffect, useState } from "react";
import { useSettings } from "@/lib/settings";

/**
 * SpeechSynthesis wrapper. Calm defaults (rate 0.85, pitch 0.9).
 * Cancels any pending utterance before speaking so phase prompts don't pile
 * up if cycles are short.
 */
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

  const speak = useCallback(
    (text: string) => {
      if (!settings.voiceEnabled) return;
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.85;
      u.pitch = 0.9;
      u.volume = Math.max(0, Math.min(1, settings.voiceVolume));
      const chosen =
        settings.voiceURI &&
        voices.find((v) => v.voiceURI === settings.voiceURI);
      if (chosen) u.voice = chosen;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    },
    [settings.voiceEnabled, settings.voiceURI, settings.voiceVolume, voices],
  );

  const cancel = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
  }, []);

  return { speak, cancel, voices };
}
