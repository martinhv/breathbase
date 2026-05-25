// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

// English source strings. Mirrored 1:1 by de.ts. Adding a new key here
// without adding the German counterpart leaves the UI showing the English
// text in a German session — fine as a fallback, but worth completing.

export const en = {
  common: {
    loading: "Loading…",
    back: "Back",
    close: "Close",
    cancel: "Cancel",
    notNow: "Not now",
    skip: "Skip",
    next: "Next",
    begin: "Begin",
    done: "Done",
    continue: "Continue",
    pause: "Pause",
    resume: "Resume",
    skipToEnd: "Skip to end",
    play: "Play",
    minutesShort: "min",
    minutesAbbrev: "m",
    secondsShort: "s",
    sessionLabel_one: "{{count}} cycle",
    sessionLabel_other: "{{count}} cycles",
  },

  language: {
    label: "Language",
    auto: "Auto (follow device)",
    en: "English",
    de: "Deutsch (German)",
  },

  loginScreen: {
    tagline: "Foundational breathwork, grounded in science.",
    takeABreath: "Take a breath",
    signInToSync: "Sign in to sync across devices",
    orSync: "or sync across devices",
    or: "or",
    continueWithGoogle: "Continue with Google",
    signingIn: "Signing in…",
    emailPlaceholder: "Email",
    passwordPlaceholder: "Password",
    signIn: "Sign in",
    createAccount: "Create account",
    creatingAccount: "Creating account…",
    needAccount: "Need an account? Create one",
    haveAccount: "Have an account? Sign in",
    forgotPassword: "Forgot password?",
    enterEmailFirst: "Enter your email above first, then tap 'Forgot password?'.",
    resetSent: "Sent a reset link to {{email}}. Check your inbox.",
    couldNotSend: "Couldn't send reset email",
    somethingWentWrong: "Something went wrong",
    educationalNote:
      "By continuing you agree to use this app as an educational tool, not medical advice. See safety details after sign-in.",
    builtForOpenSource: "Built with love for",
    openSource: "open source",
    imprint: "Imprint",
    privacy: "Privacy",
    errInvalidEmail: "That email address doesn't look right.",
    errMissingPassword: "Please enter your password.",
    errWeakPassword: "Password is too short. Use at least 6 characters.",
    errEmailInUse: "An account with that email already exists. Try signing in instead.",
    errWrongCreds: "Email or password is incorrect.",
    errTooManyRequests: "Too many attempts. Try again in a few minutes or reset your password.",
    errNetwork: "Network error. Check your connection and try again.",
  },

  home: {
    appTagline: "Foundational breathwork, grounded in science.",
    startProgram: "Start the {{name}} program",
    startProgramSub: "Five days, one practice each — with a short lesson up front.",
    programComplete: "{{name}} · complete",
    programDay: "{{name}} · day {{day}} of {{total}}",
    daysFinished: "{{total}} days finished",
    continueProgram: "Continue program",
    library: "Library",
    librarySub: "Every technique, grouped by physiology.",
    themesAria: "Themes",
    tryTheme: "{{period}} — try {{theme}}?",
    dismissSuggestion: "Dismiss suggestion",
    dayStreak: "day streak",
    minutes: "minutes",
    lastSession: "last session",
    justNow: "just now",
    minutesAgo: "{{n}}m ago",
    hoursAgo: "{{n}}h ago",
    daysAgo: "{{n}}d ago",
    history: "History",
    settings: "Settings",
  },

  onboarding: {
    slides: [
      {
        title: "Welcome to Sough",
        body: "Breathwork rooted in modern science.",
      },
      {
        title: "Many ways it helps",
        body: "Calm stress. Sleep deeper. Sharpen focus. Find energy.",
      },
      {
        title: "Start small",
        body: "Five minutes a day. Consistency matters more than duration.",
      },
      {
        title: "A five-day start",
        body: "We've laid out a five-day Foundations program — one practice per day, each with a short lesson. Pick it up on the home screen whenever you're ready.",
      },
    ],
    tapToBegin: "Tap anywhere to begin",
  },

  settings: {
    title: "Settings",
    guestMode: "Guest mode",
    guestSubtitle: "Data stays on this device",
    signOut: "Sign out",
    signOutConfirm: "Sign out?",
    signUpToSync: "Sign up to sync across devices",
    signUpFromGuestConfirm:
      "Sign up to sync your settings and history across devices. Your existing data will be carried over to the new account. Continue?",
    voicePrompts: "Voice prompts",
    backgroundMusic: "Background music",
    chimes: "Chimes",
    haptics: "Haptics",
    soundscape: "Soundscape",
    voice: "Voice",
    countdown: "Count down remaining seconds",
    previewVoice: "Preview {{name}}",
    play: "Play",
    volume: "Volume",
    master: "Master",
    music: "Music",
    perTechniqueDurations: "Per-technique durations",
    reminders: "Reminders",
    remindersDaily: "Daily practice reminder",
    remindersTime: "Time",
    remindersOff: "off",
    remindersDailyHint: "daily · {{time}}",
    remindersUnsupported: "Notifications aren't available in this browser.",
    remindersBlocked:
      "Notifications are blocked. Enable them for sough.app in your browser settings, then re-enable here.",
    remindersBackground: "Reminders are delivered via Firebase Cloud Messaging — they fire even when Sough is closed.",
    remindersForeground:
      "Reminders fire only while Sough is open in a tab. Set VITE_FIREBASE_VAPID_KEY and deploy the reminder Cloud Function for background push (see README).",
    display: "Display",
    theme: "Theme",
    themeAuto: "Auto (follow system)",
    themeLight: "Light",
    themeDark: "Dark",
    motion: "Reduce motion",
    motionAuto: "Auto (follow system)",
    motionOn: "On",
    motionOff: "Off",
    displayHint: "{{theme}} · motion {{motion}}",
    testSound: "Test sound",
    testSoundHint:
      "Tap below to hear a sample chime and chord. If you hear nothing, check your system volume and that no other app is muting the tab.",
    testSoundButton: "Test sound",
    playingTestSound: "Playing test sound…",
    privacy: "Privacy",
    analyticsOn: "analytics on",
    analyticsOff: "analytics off",
    helpImprove: "Help improve Sough (anonymous usage)",
    analyticsNote:
      "Self-hosted, cookieless. Sends page views, session completions by technique, and which soundscape / voice / program you pick. No personal data, no third-party trackers — see the source for the full event list.",
    dataAccount: "Data & account",
    exportData: "Export my data (JSON)",
    exportDownload: "Download",
    exportPreparing: "Preparing…",
    exportFailed: "Export failed. Please try again.",
    clearLocal: "Clear local data",
    deleteAccount: "Delete account and all data",
    permanent: "Permanent",
    deleting: "Deleting…",
    confirmClearLocal: "Clear all locally-stored settings and session history? This cannot be undone.",
    confirmDelete: "Delete your account and all session history? This cannot be undone.",
    deleteFailedLocal: "Could not clear local data. Please try again.",
    deleteFailedAccount: "Account deletion failed. Please try again.",
    viewDisclaimer: "View safety disclaimer",
    resetSettings: "Reset settings",
    resetConfirm: "Reset all settings to defaults?",
    footerSource: "Source code",
    footerImprint: "Imprint",
    footerPrivacy: "Privacy",
  },

  session: {
    notFound: "Technique not found.",
    backHome: "Back home",
    getReady: "Get ready",
    settleIn: "Take a slow breath. Settle in.",
    newHere: "New here?",
    newHereActivating: "Activating techniques can be intense. Try a calmer practice first.",
    tryBoxFirst: "Try Box Breathing first →",
    safetyReminder: "Safety reminder",
    roundOf: "Round {{current}} of {{total}}",
    cycleOf: "Cycle {{current}} of {{total}}",
    closeSession: "Close session",
    endSessionConfirm: "End this session? Your progress will not be saved.",
    stay: "Stay",
    endSession: "End session",
    settleTitle: "A moment to settle",
    settleBody: "Rest here for a moment. Notice how you feel.",
    sessionComplete: "Session complete",
    useThisWhen: "Use this when",
    dayOf: "Day {{day}} of {{total}}",
    today: "Today",
    whyItWorks: "Why it works",
    whatToNotice: "What to notice",
    beginWithDuration: "Begin · {{mins}}m",
    nostrilOpen: "{{side}} nostril open",
    open: "Open: {{side}}",
    nostrilLeft: "left",
    nostrilRight: "right",
    debugVoice: "voice",
    debugVoiceAria: "Debug: switch voice profile",
  },

  category: {
    notFound: "Category not found.",
    backToLibrary: "Back to library",
  },

  library: {
    badge: "Library",
    title: "Browse by category",
    intro:
      "Every technique grouped by physiology — the way breathwork affects the autonomic nervous system. Themes on the home screen group the same techniques by goal instead.",
  },

  theme: {
    notFound: "Theme not found.",
    backHome: "Back home",
  },

  history: {
    title: "History",
    dayStreak: "day streak",
    minutes: "minutes",
    sessions: "sessions",
    last14Days: "Last 14 days",
    peakMinutes: "peak {{n}}m",
    noSessionsInWindow: "No sessions in the last two weeks yet.",
    filterAll: "All",
    noSessionsYet: "No sessions yet.",
    noSessionsCategory: "No {{category}} sessions yet.",
    narratedLesson: "Narrated lesson",
    playLesson: "Play lesson",
    pauseLesson: "Pause lesson",
  },

  program: {
    badge: "Five-day program",
    fiveDayHeadline: "Foundational, in five days",
    enrollDescription:
      "One practice per day, each with a brief lesson. Slow breath, resonance, holds, long exhales, and a reset you can use anywhere. About five minutes a day.",
    enrollCta: "Begin the program",
    statusComplete: "Program complete",
    statusDay: "Day {{day}} of {{total}}",
    devUnlock: "DEV — all days unlocked for testing",
    completeBlurb:
      "You've worked through the foundations. Keep practicing whichever techniques resonated — themes on the home screen are a good way to pick one for the moment.",
    dayLabel: "Day {{day}} · {{mins}}m",
  },

  techniqueCard: {
    duration: "Duration",
    less: "Less",
    more: "More",
    tutorial: "Tutorial",
    closeTutorial: "Close",
    playTutorial: "Play tutorial",
    pauseTutorial: "Pause tutorial",
    closeTutorialAria: "Close tutorial",
    sessionLength: "Session length",
    citation: "Citation: ",
    statsLine: "{{count}}× · {{minutes}}m total",
    wantToKnowMore: "Want to know more about this exercise?",
    listenShortTutorial: "Listen to a short tutorial.",
  },

  disclaimer: {
    title: "A note on safety",
    notMedical: "Sough is not medical advice.",
    educational: "It is an educational tool to support a personal breathwork practice.",
    stopIfDizzy: "Stop immediately if you feel dizzy or lightheaded. Sit or lie down until the sensation passes.",
    upregulateWater:
      "Upregulating techniques (cyclic hyperventilation, bellows breath) should never be done in or near water, while driving, or while operating machinery — fainting can occur.",
    consultPhysician:
      "Consult a physician before practicing if you are pregnant, or if you have cardiovascular, respiratory, or psychiatric conditions, or a history of seizures.",
    consentLabel:
      "I have read and understood the safety information above. I accept that Sough is an educational tool, not medical advice, and I practice at my own risk.",
    accept: "I accept",
    understand: "I understand",
  },

  safetyModal: {
    beforeBegin: "Before you begin — {{name}}",
    newHere: "New here?",
    newHereActivating:
      "Activating techniques like this can be intense. We recommend starting with a calmer practice first to build a baseline.",
    tryBoxFirst: "Try Box Breathing first →",
    notNow: "Not now",
    understand: "I understand",
  },

  // Imprint / Privacy keep two-language headings (de + en) by tradition;
  // we still translate the body paragraphs.
  imprint: {
    title: "Imprint",
    heading: "Angaben gemäß § 5 DDG / § 18 MStV",
    providerH: "Anbieter / Service Provider",
    contactH: "Kontakt / Contact",
    email: "Email:",
    authH: "Vertretungsberechtigt / Authorised Representative",
    managingDirectorPrefix: "Geschäftsführer:",
    registerH: "Handelsregister / Commercial Register",
    registerCourt: "Registergericht:",
    registerNumber: "Registernummer:",
    vatH: "Umsatzsteuer-ID / VAT ID",
    vatBody: "Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: {{id}}",
    contentResponsibleH: "Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV",
    disputeH: "EU-Streitschlichtung / EU Dispute Resolution",
    disputeBody:
      "Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:",
    disputeOptOut:
      ". Wir sind nicht bereit oder verpflichtet, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
    seeAlso: "See also:",
    privacyPolicy: "Privacy Policy",
  },

  privacy: {
    title: "Privacy Policy",
    heading: "Datenschutzerklärung nach Art. 13 DSGVO",
    controllerH: "1. Controller (Verantwortlicher)",
    email: "Email:",
    collectH: "2. What we collect and why",
    collectIntro:
      "Sough processes the minimum data needed to give you a personalised, multi-device experience.",
    guestModeStrong: "Guest mode:",
    guestModeBody:
      'if you chose "Start without an account", your settings and session history are stored only in this browser\'s local storage. None of the data described in this section leaves your device until you create an account.',
    authH: "Account / Authentication",
    authBody:
      "When you sign in we receive an account identifier and email address (and, with Google sign-in, your display name and profile picture URL). This is stored by Google Firebase Authentication on our behalf.",
    legalContract: "Legal basis: Art. 6(1)(b) GDPR — performance of a contract.",
    settingsH: "Settings & session history",
    settingsBody:
      "Your preferences (theme, sounds, reminder time, etc.) and a log of each completed breathing session — duration, technique, and an optional mood check-in — are stored in Google Firestore under your account ID. They are visible only to you.",
    analyticsH: "Analytics",
    analyticsBody:
      "We use a self-hosted instance of Umami to count anonymous page views and a small set of product events (e.g. session completed, voice changed). No cookies are set. Your IP address is briefly processed for spam/abuse protection and discarded — it is never written to long-term storage. You can disable analytics at any time in Settings.",
    legalLegitimate: "Legal basis: Art. 6(1)(f) GDPR — legitimate interest in improving the service.",
    pushH: "Push reminders (optional)",
    pushBody:
      "If you enable daily practice reminders, a push subscription token is stored via Google Firebase Cloud Messaging so we can deliver the reminder while the app is closed. Turn the reminder off in Settings to delete the token.",
    legalConsent: "Legal basis: Art. 6(1)(a) GDPR — your consent.",
    processorsH: "3. Processors and recipients",
    processorsBody:
      "(Gordon House, Barrow Street, Dublin 4, Ireland) processes authentication, database, and (optionally) push-messaging data on our behalf as a data processor under Art. 28 GDPR. A Data Processing Addendum is in place. Google may transfer data outside the EU under the EU Commission's Standard Contractual Clauses.",
    noSell: "We do not sell or rent your data. Beyond the processor above, we share nothing with third parties.",
    retentionH: "4. Retention",
    retentionAccount: "Account, settings, and session history: kept until you delete your account (Settings → Delete account).",
    retentionPush: "Push tokens: deleted when reminders are disabled or the account is deleted.",
    retentionAnalytics: "Analytics events: 12 months, then automatically purged.",
    rightsH: "5. Your rights",
    rightsIntro: "Under the GDPR you have the right to:",
    rightAccess: "Access the personal data we hold about you (Art. 15)",
    rightCorrect: "Correct inaccurate data (Art. 16)",
    rightDelete: 'Delete your data (Art. 17) — the in-app "Delete account" action does this',
    rightRestrict: "Restrict processing (Art. 18)",
    rightPortable: "Receive your data in a portable format (Art. 20)",
    rightObject: "Object to processing based on legitimate interest (Art. 21) — e.g. opt out of analytics in Settings",
    rightWithdraw: "Withdraw consent for consent-based processing at any time, without affecting prior lawful processing",
    rightsExercise: "To exercise any of these rights, email",
    complaintH: "6. Right to complain",
    complaintBody:
      "You have the right to lodge a complaint with a data protection supervisory authority. The competent authority for us is:",
    automatedH: "7. No automated decisions",
    automatedBody:
      "We do not make automated decisions or profile users. The app shows you the data you generate; we do not analyse it to make decisions that affect you.",
    healthH: "8. Health-related content",
    healthBody:
      "Sough is a wellness tool, not a medical device. We do not ask for diagnoses, conditions, or any data that would fall under Art. 9 GDPR (special categories). Optional mood check-ins are general well-being signals stored only under your own account.",
    lastUpdated: "Last updated: 18 May 2026. See also:",
    imprintLink: "Imprint",
  },

  // ── Domain data ─────────────────────────────────────────────────────────
  categories: {
    downregulate: {
      title: "Downregulate",
      tagline: "Calm the nervous system",
      description:
        "Longer exhales than inhales activate the parasympathetic branch of the autonomic nervous system, lowering arousal.",
    },
    upregulate: {
      title: "Upregulate",
      tagline: "Energize and alert",
      description:
        "More vigorous inhales than exhales recruit sympathetic tone, increasing alertness and energy.",
    },
    balance: {
      title: "Balance",
      tagline: "Restore equilibrium",
      description:
        "Equal inhale–exhale ratios stabilize autonomic tone and maximize heart rate variability.",
    },
    focus: {
      title: "Focus",
      tagline: "Sharpen attention",
      description:
        "Rhythmic, attention-anchoring patterns improve sustained concentration.",
    },
  },

  themes: {
    sleep: {
      name: "Sleep",
      tagline: "Wind down for rest",
      description:
        "Slow breath and long exhales activate the parasympathetic nervous system, lowering arousal and preparing the body for sleep.",
      period: "Evening",
    },
    stress: {
      name: "Stress reset",
      tagline: "Tools for hard moments",
      description:
        "Fast-acting techniques to de-escalate the stress response, plus a few steady patterns to settle the system after the spike has passed.",
      period: "Late afternoon",
    },
    focus: {
      name: "Focus",
      tagline: "Sharpen attention",
      description:
        "Symmetric and rhythm-based patterns that train sustained attention. The breath becomes a single thing to hold the mind to.",
      period: "Afternoon",
    },
    energy: {
      name: "Energy",
      tagline: "Activate body and mind",
      description:
        "Active breathwork that raises sympathetic tone — useful for waking up, before a workout, or when the afternoon slump hits.",
      period: "Morning",
    },
  },

  techniques: {
    "physiological-sigh": {
      shortDescription: "Double-inhale through the nose, long extended exhale through the mouth.",
      scientificRationale:
        "Most effective single technique for rapidly reducing physiological arousal and improving mood in a randomized comparison of breathwork protocols against mindfulness meditation.",
    },
    "four-seven-eight": {
      shortDescription: "Inhale 4s through the nose, hold 7s, exhale 8s through pursed lips.",
      scientificRationale:
        "A long-exhale, breath-hold pattern that increases vagal tone; widely taught for relaxation and sleep onset.",
    },
    diaphragmatic: {
      shortDescription: "Slow nasal inhale expanding the belly; longer slow exhale.",
      scientificRationale:
        "Foundational vagal-nerve stimulation technique; slow, belly-led breathing reliably lowers heart rate and blood pressure.",
    },
    "energizing-breath": {
      shortDescription: "30 active 2s nasal inhales / 1s passive mouth exhales, then a long exhale-hold. 2 rounds.",
      scientificRationale:
        "A beginner-safe cyclic hyperventilation modeled on the Wim Hof Method. Raises sympathetic tone and adrenaline, producing alertness and warmth.",
      safety: [
        "Do not practice in or near water.",
        "Do not practice while driving or operating machinery.",
        "Avoid if pregnant or with cardiovascular, respiratory, or seizure conditions.",
        "Stop immediately if you feel dizzy or lightheaded — these techniques can cause fainting.",
      ],
    },
    "bellows-breath": {
      shortDescription: "Equal vigorous 2s nasal inhale and exhale for ~30 seconds, then 15s rest. 3 rounds.",
      scientificRationale:
        "Rapid forced breathing increases sympathetic activity and alertness; a gentle, equal-ratio version is beginner-appropriate.",
      safety: [
        "Stop if you feel dizzy or lightheaded.",
        "Do not practice while driving or in water.",
        "Skip if pregnant or with cardiovascular conditions.",
      ],
    },
    "box-breathing": {
      shortDescription: "Inhale 4s, hold 4s, exhale 4s, hold 4s. Used by Navy SEALs.",
      scientificRationale:
        "Equal-ratio breath-holding patterns stabilize autonomic tone and are well tolerated by beginners.",
    },
    "coherent-breathing": {
      shortDescription: "Inhale 5.5s, exhale 5.5s. ~5.5 breaths/min — the HRV sweet spot.",
      scientificRationale:
        "Breathing at ~5.5–6 breaths per minute maximizes baroreflex gain and heart rate variability, the marker of autonomic flexibility.",
    },
    "alternate-nostril": {
      shortDescription: "Inhale left, exhale right, inhale right, exhale left — repeat.",
      scientificRationale:
        "Alternate nostril breathing (Nadi Shodhana) improves attention, autonomic balance, and cognitive performance.",
    },
    "equal-breathing": {
      shortDescription: "Inhale 4s, exhale 4s. A steady rhythm for attention.",
      scientificRationale:
        "Simple symmetric breathing serves as an attention anchor; consistent practice is associated with improved sustained attention.",
    },
  },

  phaseLabels: {
    "Breathe in": "Breathe in",
    "Breathe out": "Breathe out",
    Hold: "Hold",
    "Top off": "Top off",
    "Long exhale": "Long exhale",
    "Active in": "Active in",
    "Active out": "Active out",
    "Let go": "Let go",
    "Final exhale": "Final exhale",
    "Hold (empty)": "Hold (empty)",
    "Recovery in": "Recovery in",
    "Recovery hold": "Recovery hold",
    Release: "Release",
    Settle: "Settle",
    Rest: "Rest",
    "In — left": "In — left",
    "Out — right": "Out — right",
    "In — right": "In — right",
    "Out — left": "Out — left",
  },

  phaseNotes: {
    "Second short inhale": "Second short inhale",
    "Passive release": "Passive release",
    "Belly expands": "Belly expands",
    "Belly falls": "Belly falls",
    "Release whenever you feel the urge to breathe": "Release whenever you feel the urge to breathe",
    "Slow nasal inhale — let the body unwind": "Slow nasal inhale — let the body unwind",
    "Soften shoulders and jaw. Notice tingling, warmth.":
      "Soften shoulders and jaw. Notice tingling, warmth.",
  },

  program_days: {
    "1": {
      headline: "Settle into the breath",
      why: "Belly-led breathing is the foundation. Notice the body softening as the exhale lengthens.",
      learn: "Belly-led breathing — the foundation everything else builds on.",
      science:
        "A slow nasal inhale that expands the belly and a longer exhale engages the vagus nerve, lowering heart rate and blood pressure.",
      notice: "Rest a hand on your belly. It should rise on the inhale — not your chest.",
      useWhen:
        "Anytime you catch yourself shallow-chest breathing — at the desk, in traffic, before sleep.",
    },
    "2": {
      headline: "Find your resonance",
      why: "Around six breaths a minute maximizes heart rate variability — the body's measure of autonomic flexibility.",
      learn: "Find your resonance — roughly five and a half breaths per minute.",
      science:
        "At this pace heart rate, blood pressure, and breath synchronize. This 'coherence' maximizes heart rate variability, a marker of autonomic flexibility.",
      notice: "Smooth and even, in and out. The pace should feel slow but never strained.",
      callback: "Yesterday you grounded the breath in the belly. Today we tune its pace.",
      useWhen: "As a daily five-minute reset — pre-meeting, post-work, or as a stress baseline.",
    },
    "3": {
      headline: "Add a hold",
      why: "Equal in, hold, out, hold. Holds train tolerance and steady the nervous system.",
      learn: "Equal counts, in all four directions: in, hold, out, hold.",
      science:
        "Brief breath holds train CO₂ tolerance and steady the nervous system. It's why combat units use it before high-stakes moments.",
      notice: "The holds shouldn't feel like white-knuckling. Soften the throat and shoulders while you wait.",
      callback: "Yesterday's rhythm was a two-beat cycle. Today we make it four.",
      useWhen: "Before anything that spikes your heart rate — a presentation, a hard conversation, a workout.",
    },
    "4": {
      headline: "Lean into the exhale",
      why: "A long exhale with a held breath strongly activates the parasympathetic branch — useful before sleep.",
      learn: "Lean into the exhale. Inhale four, hold seven, exhale eight.",
      science:
        "Long exhales — especially after a hold — strongly activate the parasympathetic branch. It's the breath pattern most reliably linked to faster sleep onset.",
      notice: "The exhale through pursed lips should feel slow and audible — like fogging a mirror.",
      callback: "Yesterday's holds were symmetric. Today we tilt the ratio toward calm.",
      useWhen: "In bed when you can't sleep, or in the five minutes before something stressful.",
    },
    "5": {
      headline: "A reset on demand",
      why: "The fastest tool for de-escalating arousal in the moment. Keep this one in your pocket.",
      learn: "A reset on demand — two quick nasal inhales, one long mouth exhale.",
      science:
        "The double-inhale re-inflates collapsed alveoli; the long exhale offloads CO₂ fast. In a randomized comparison against meditation, it was the single most effective protocol for reducing acute stress.",
      notice: "The second inhale is short — just a top-off. The long exhale is where the work happens.",
      callback: "The last four days were structured practices. Today's tool you can do in ten seconds, anywhere.",
      useWhen: "Mid-stress, mid-spiral, mid-anything. One to three sighs and the body resets.",
    },
  },

  programMeta: {
    name: "Foundations",
    tagline: "A tour of the basics",
  },

  weekdayNarrow: ["S", "M", "T", "W", "T", "F", "S"],

  notifications: {
    title: "Time to practice",
    body: "A few minutes of breathwork.",
  },
};

export type Resources = typeof en;
