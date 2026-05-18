// Tutorial narrations per technique. Each entry maps a technique id to the
// spoken-tutorial transcript. The transcript is shown as text in the UI AND
// rendered to mp3 by scripts/generate-tutorial-voice.sh — keep both in sync.
//
// Audio files live at:
//   public/voice/{DEFAULT_VOICE_PROFILE}/tutorial-{techniqueId}.mp3
//
// Pinned to the default voice profile rather than the user's selected voice
// to keep generation cost low; can be widened to all voices later.

export const TUTORIALS: Record<string, string> = {
  "box-breathing":
    "Box breathing follows a simple pattern of four equal parts. Inhale for four seconds. Hold your breath for four seconds. Exhale for four seconds. Then hold empty for four seconds. Each side of the box is the same length — that's where the name comes from.\n\n" +
    "This technique was popularized by Navy SEALs for use under high-stress situations. By keeping every phase equal, it stabilizes your autonomic nervous system without strongly tilting toward calming or activating. It's a balanced reset.\n\n" +
    "It's particularly useful before something stressful — a presentation, a difficult conversation, or any moment where you want to be alert but composed.\n\n" +
    "To begin, find a comfortable seated position. Breathe through your nose if you can. And don't strain — if four seconds feels long, start with three. Just five minutes is enough to feel the effect.",
};

export const hasTutorial = (techniqueId: string): boolean =>
  techniqueId in TUTORIALS;
