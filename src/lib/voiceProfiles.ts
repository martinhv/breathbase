// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

// Available built-in voice profiles. Each profile has its own subdirectory
// under public/voice/{id}/ with one mp3 per prompt slug. All voices are
// rendered by ElevenLabs — the edge-tts (free Microsoft neural) engine was
// dropped after premium-voice tuning settled on ElevenLabs for quality.
//
// To add a profile:
//   1. Append an entry here.
//   2. Add the same id + ElevenLabs voice row to scripts/generate-voice.sh.
//   3. Run ./scripts/generate-voice.sh and commit the new mp3s.

export type VoiceProfile = {
  /** URL-safe id; also the directory name under public/voice/. */
  id: string;
  /** Display name shown in Settings. */
  name: string;
  /** One-line description / accent + tone. */
  description: string;
  /** Source voice (ElevenLabs voice id). Informational. */
  sourceVoice: string;
  /** BCP-47 language tag the voice speaks. Defaults to "en" when omitted.
   *  Used to auto-pick a language-appropriate voice when the user switches
   *  language and hasn't manually chosen one. */
  language?: string;
};

export const VOICE_PROFILES: VoiceProfile[] = [
  // Oliver and Bill temporarily disabled — clips remain under
  // public/voice/{id}/ so un-commenting brings them back without regen.
  // {
  //   id: "oliver",
  //   name: "Oliver",
  //   description: "British English · warm male",
  //   sourceVoice: "ElevenLabs · George",
  // },
  {
    id: "theo",
    name: "Theo",
    description: "British English · deep, calm male",
    sourceVoice: "ElevenLabs · Theo Silk",
  },
  {
    id: "sarah",
    name: "Sarah",
    description: "US English · calm female",
    sourceVoice: "ElevenLabs · Sarah",
  },
  // {
  //   id: "bill",
  //   name: "Bill",
  //   description: "US English · energetic male",
  //   sourceVoice: "ElevenLabs · Bill",
  // },
  {
    id: "priyanka",
    name: "Priyanka",
    description: "British English · velvety, calm female",
    sourceVoice: "ElevenLabs · Priyanka Sogam",
  },
  {
    id: "brittney",
    name: "Brittney",
    description: "US English · soft, meditative female",
    sourceVoice: "ElevenLabs · Brittney",
  },
  {
    id: "christopher",
    name: "Christopher",
    description: "US English · intimate, meditative male",
    sourceVoice: "ElevenLabs · Christopher",
  },
  {
    id: "leon",
    name: "Leon",
    description: "Deutsch · ruhige männliche Stimme",
    sourceVoice: "ElevenLabs · MJ0RnG71ty4LH3dvNfSd",
    language: "de",
  },
  {
    id: "lana",
    name: "Lana",
    description: "Deutsch · ruhige weibliche Stimme",
    sourceVoice: "ElevenLabs · rAmra0SCIYOxYmRNDSm3",
    language: "de",
  },
];

/** Default voice id used when the user's language preference resolves to `lang`.
 *  Falls back to the global default for unknown languages. */
export function defaultVoiceForLanguage(lang: string): string {
  if (lang === "de") return "leon";
  return DEFAULT_EXERCISE_VOICE_PROFILE;
}

/** Voice profile id that holds the long-form narration clips (onboarding,
 *  tutorials, lessons) for the given UI language. These clips are baked once
 *  per language, not per user-selected exercise voice, so this is a fixed
 *  pick rather than a user setting. */
export function narrationVoiceForLanguage(lang: string): string {
  if (lang === "de") return "leon";
  return DEFAULT_VOICE_PROFILE;
}

// Used for app narration (onboarding slides, technique tutorials, lesson
// audio) and as the fallback when a saved voice ID is unknown. Theo has the
// full clip set; other profiles only cover the in-session prompts.
export const DEFAULT_VOICE_PROFILE = "theo";

// Initial value for `settings.voiceProfile` — the voice the user hears
// *during exercises* (breathe-in, breathe-out, count clips) before they pick
// one in Settings.
export const DEFAULT_EXERCISE_VOICE_PROFILE = "christopher";

export const findVoiceProfile = (id: string): VoiceProfile =>
  VOICE_PROFILES.find((v) => v.id === id) ??
  VOICE_PROFILES.find((v) => v.id === DEFAULT_VOICE_PROFILE)!;

/** The language tag a voice profile speaks. Defaults to "en" when unset. */
export const voiceLanguage = (v: VoiceProfile): string => v.language ?? "en";

/** Subset of VOICE_PROFILES whose spoken language matches `lang`. */
export const voiceProfilesForLanguage = (lang: string): VoiceProfile[] =>
  VOICE_PROFILES.filter((v) => voiceLanguage(v) === lang);
