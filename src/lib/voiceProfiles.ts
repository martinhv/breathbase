// Available built-in voice profiles. Each profile has its own subdirectory
// under public/voice/{id}/ with one mp3 per prompt slug.
//
// To add a profile:
//   1. Append an entry here.
//   2. Add the same id + edge-tts voice name to scripts/generate-voice.sh.
//   3. Run ./scripts/generate-voice.sh and commit the new mp3s.

export type VoiceProfile = {
  /** URL-safe id; also the directory name under public/voice/. */
  id: string;
  /** Display name shown in Settings. */
  name: string;
  /** One-line description / accent + tone. */
  description: string;
  /** edge-tts voice name (informational; not used at runtime). */
  edgeVoice: string;
};

export const VOICE_PROFILES: VoiceProfile[] = [
  {
    id: "aria",
    name: "Aria",
    description: "US English · calm, neutral",
    edgeVoice: "en-US-AriaNeural",
  },
  {
    id: "jenny",
    name: "Jenny",
    description: "US English · warm, friendly",
    edgeVoice: "en-US-JennyNeural",
  },
  {
    id: "guy",
    name: "Guy",
    description: "US English · male, steady",
    edgeVoice: "en-US-GuyNeural",
  },
  {
    id: "libby",
    name: "Libby",
    description: "British English · soft",
    edgeVoice: "en-GB-LibbyNeural",
  },
  {
    id: "thomas",
    name: "Thomas",
    description: "British English · deep, male",
    edgeVoice: "en-GB-ThomasNeural",
  },
];

export const DEFAULT_VOICE_PROFILE = "aria";

export const findVoiceProfile = (id: string): VoiceProfile =>
  VOICE_PROFILES.find((v) => v.id === id) ??
  VOICE_PROFILES.find((v) => v.id === DEFAULT_VOICE_PROFILE)!;
