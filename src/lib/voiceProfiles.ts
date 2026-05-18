// Available built-in voice profiles. Each profile has its own subdirectory
// under public/voice/{id}/ with one mp3 per prompt slug.
//
// To add a profile:
//   1. Append an entry here.
//   2. Add the same id + engine row to scripts/generate-voice.sh.
//   3. Run ./scripts/generate-voice.sh and commit the new mp3s.

export type VoiceProfile = {
  /** URL-safe id; also the directory name under public/voice/. */
  id: string;
  /** Display name shown in Settings. */
  name: string;
  /** One-line description / accent + tone. */
  description: string;
  /** Source voice (edge-tts name or ElevenLabs voice id). Informational. */
  sourceVoice: string;
};

export const VOICE_PROFILES: VoiceProfile[] = [
  // Standard edge-tts voices temporarily disabled during premium-voice
  // tuning. Re-enable by un-commenting; mp3 clips still exist under
  // public/voice/{id}/ so no regeneration is needed.
  // {
  //   id: "aria",
  //   name: "Aria",
  //   description: "US English · calm, neutral",
  //   sourceVoice: "en-US-AriaNeural",
  // },
  // {
  //   id: "jenny",
  //   name: "Jenny",
  //   description: "US English · warm, friendly",
  //   sourceVoice: "en-US-JennyNeural",
  // },
  // {
  //   id: "guy",
  //   name: "Guy",
  //   description: "US English · male, steady",
  //   sourceVoice: "en-US-GuyNeural",
  // },
  // {
  //   id: "libby",
  //   name: "Libby",
  //   description: "British English · soft",
  //   sourceVoice: "en-GB-LibbyNeural",
  // },
  // {
  //   id: "thomas",
  //   name: "Thomas",
  //   description: "British English · deep, male",
  //   sourceVoice: "en-GB-ThomasNeural",
  // },
  // Oliver and Bill temporarily disabled — clips remain under
  // public/voice/{id}/ so un-commenting brings them back without regen.
  // {
  //   id: "oliver",
  //   name: "Oliver",
  //   description: "British English · warm male (premium)",
  //   sourceVoice: "ElevenLabs · George",
  // },
  {
    id: "sarah",
    name: "Sarah",
    description: "US English · calm female (premium)",
    sourceVoice: "ElevenLabs · Sarah",
  },
  // {
  //   id: "bill",
  //   name: "Bill",
  //   description: "US English · energetic male (premium)",
  //   sourceVoice: "ElevenLabs · Bill",
  // },
  {
    id: "theo",
    name: "Theo",
    description: "British English · deep, calm male (premium)",
    sourceVoice: "ElevenLabs · Theo Silk",
  },
  {
    id: "priyanka",
    name: "Priyanka",
    description: "British English · velvety, calm female (premium)",
    sourceVoice: "ElevenLabs · Priyanka Sogam",
  },
  {
    id: "brittney",
    name: "Brittney",
    description: "US English · soft, meditative female (premium)",
    sourceVoice: "ElevenLabs · Brittney",
  },
  {
    id: "christopher",
    name: "Christopher",
    description: "US English · intimate, meditative male (premium)",
    sourceVoice: "ElevenLabs · Christopher",
  },
];

export const DEFAULT_VOICE_PROFILE = "theo";

export const findVoiceProfile = (id: string): VoiceProfile =>
  VOICE_PROFILES.find((v) => v.id === id) ??
  VOICE_PROFILES.find((v) => v.id === DEFAULT_VOICE_PROFILE)!;
