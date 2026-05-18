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
  "physiological-sigh":
    "The physiological sigh is the fastest way to settle your nervous system in real time. It's a pattern your body already uses on its own when you're upset — we just do it deliberately.\n\n" +
    "The mechanics are simple. Take a short inhale through your nose. Top it off with a second quick inhale — short and sharp. Then release everything in one long, extended exhale through your mouth.\n\n" +
    "That second inhale fully inflates the small air sacs in your lungs called alveoli. When the long exhale follows, it offloads a large pulse of carbon dioxide, which signals your brain to slow heart rate and ease arousal.\n\n" +
    "This single move can shift you out of a stress spike in seconds. It's been studied head-to-head against meditation and other breathwork — and for short-term mood lift, it came out on top. Use it any time you feel tension building. Just one or two cycles will work.",

  "four-seven-eight":
    "Four-seven-eight breathing is a sleep-onset and relaxation technique. The numbers are the rhythm: inhale for four seconds, hold your breath for seven seconds, then exhale for eight seconds through pursed lips.\n\n" +
    "The long hold raises carbon dioxide slightly, which dilates blood vessels and increases vagal tone. The extended exhale activates your parasympathetic nervous system — the rest-and-digest side. Together they tip the body toward relaxation.\n\n" +
    "Use it lying in bed when your mind is racing. Many people find three or four cycles enough to fall asleep, though it takes a few days of practice before that becomes reliable.\n\n" +
    "Start gently. If holding for seven seconds feels stressful, scale the whole thing down — three-five-six works fine. Comfort matters more than hitting exact numbers. The point is the slow exhale.",

  "diaphragmatic":
    "Diaphragmatic breathing — also called belly breathing — is the foundation everything else builds on. Most of us breathe shallowly into our chest. This technique trains your diaphragm to do the work it's designed for.\n\n" +
    "Place one hand on your chest, the other on your belly. Inhale slowly through your nose, expanding your belly outward — your chest hand should barely move. Then exhale slowly, a little longer than the inhale, letting your belly soften.\n\n" +
    "Why does this matter? Belly-led breathing stimulates the vagus nerve, the main highway of your parasympathetic nervous system. Heart rate drops. Blood pressure eases. Stress hormones decrease. Over time, your resting breath becomes deeper and slower without effort.\n\n" +
    "If you do nothing else, do this. Five minutes a day, ideally in the morning or before bed. It's the cheapest, most evidence-backed intervention in breathwork.",

  "energizing-breath":
    "Energizing breath is a beginner-safe version of the Wim Hof Method. It uses cycles of fast, deliberate breathing followed by long breath holds to flood your body with oxygen and adrenaline.\n\n" +
    "The pattern is: thirty active breaths — a two-second nasal inhale, a one-second passive mouth exhale. Then a final full exhale, and a long breath hold while empty — until you feel the urge to breathe. Then a recovery inhale, hold full for fifteen seconds, and release. Repeat the whole sequence twice.\n\n" +
    "This raises sympathetic tone — the activating side of your nervous system. You'll likely feel warmth, tingling, and sharp alertness. Studies show it can voluntarily activate the immune response and increase focus.\n\n" +
    "Important safety: never do this in or near water, or while driving. Skip it if you're pregnant or have a cardiovascular condition. Stop immediately if you feel lightheaded — this technique can cause fainting.",

  "bellows-breath":
    "Bellows breath, or bhastrika, is a quick way to wake the body and brain. The mechanics are simple but vigorous. Inhale forcefully through your nose for two seconds, then exhale forcefully through your nose for two seconds — equal, rhythmic, like a bellows pumping air.\n\n" +
    "You'll do about eight of these breaths in a round, then rest for fifteen seconds — a slow inhale to settle, and a longer exhale to release. Repeat for three rounds total.\n\n" +
    "The rapid breathing increases sympathetic tone, raising heart rate, alertness, and oxygenation. Yoga traditions use it before meditation to clear mental fog. Modern research confirms it shifts heart rate variability toward an activated state.\n\n" +
    "Sit upright with a straight spine. The breath should come from your abdomen, not your shoulders. If you feel lightheaded, stop and breathe normally — this is intense for beginners. Build up gradually.",

  "box-breathing":
    "Box breathing follows a simple pattern of four equal parts. Inhale for four seconds. Hold your breath for four seconds. Exhale for four seconds. Then hold empty for four seconds. Each side of the box is the same length — that's where the name comes from.\n\n" +
    "This technique was popularized by Navy SEALs for use under high-stress situations. By keeping every phase equal, it stabilizes your autonomic nervous system without strongly tilting toward calming or activating. It's a balanced reset.\n\n" +
    "It's particularly useful before something stressful — a presentation, a difficult conversation, or any moment where you want to be alert but composed.\n\n" +
    "To begin, find a comfortable seated position. Breathe through your nose if you can. And don't strain — if four seconds feels long, start with three. Just five minutes is enough to feel the effect.",

  "coherent-breathing":
    "Coherent breathing — also called resonant breathing — is breathing at a precise rate that synchronizes your heart, lungs, and nervous system into a single rhythm. The pattern is simple: inhale for five and a half seconds, exhale for five and a half seconds. That's about five and a half breaths per minute.\n\n" +
    "Why that exact number? Around five to six breaths per minute is the resonance frequency of your cardiovascular system. At this pace, your heart rate variability — the gold-standard marker of autonomic flexibility — reaches its maximum. Blood pressure stabilizes. Stress markers drop.\n\n" +
    "It's not a quick fix. It works through repetition. Ten to fifteen minutes a day, several times a week, retrains your baseline. Athletes, soldiers, and people with anxiety all use it as a foundational practice.\n\n" +
    "Use a guide — that's what we're for. The five-and-a-half second pace is hard to maintain on your own.",

  "alternate-nostril":
    "Alternate nostril breathing — Nadi Shodhana in Sanskrit — balances the two sides of your nervous system by alternating which nostril you breathe through. It looks fiddly at first, but the rhythm is straightforward.\n\n" +
    "Inhale through your left nostril for four seconds. Close it, open the right, and exhale right for four seconds. Then inhale right for four. Switch, exhale left for four. That's one full cycle.\n\n" +
    "Traditionally you use your right hand: thumb to close the right nostril, ring finger to close the left. Or just imagine it — visualization works almost as well for the calming effect.\n\n" +
    "Research shows this practice improves attention, lowers blood pressure, and balances heart rate variability. Yogis use it before meditation to clear mental noise. It's particularly good before tasks requiring focus — work, study, anything demanding sustained attention.\n\n" +
    "Don't rush. The point is the slow, alternating rhythm, not the count.",

  "equal-breathing":
    "Equal breathing, or sama vritti, is the simplest focus practice you can do. Inhale for four seconds. Exhale for four seconds. That's the entire technique.\n\n" +
    "The simplicity is the point. By making both halves of the breath the same length, you give your mind something steady to anchor to. Each inhale and exhale becomes a small unit of attention. When your mind wanders — and it will — you just return to the count.\n\n" +
    "This is the practice meditators have used for centuries. Modern research links sustained equal breathing to improved attention span, better emotional regulation, and reduced rumination. It's not flashy. It's foundational.\n\n" +
    "Use it as a five-minute attention reset between tasks. Or extend the count to six or eight seconds for a deeper effect — though four works fine. The key is consistency, not intensity.",
};

export const hasTutorial = (techniqueId: string): boolean =>
  techniqueId in TUTORIALS;
