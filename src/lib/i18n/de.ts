// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Resources } from "./en";

export const de: Resources = {
  common: {
    loading: "Lädt…",
    back: "Zurück",
    close: "Schließen",
    cancel: "Abbrechen",
    notNow: "Nicht jetzt",
    skip: "Überspringen",
    next: "Weiter",
    begin: "Starten",
    done: "Fertig",
    continue: "Weiter",
    pause: "Pause",
    resume: "Fortsetzen",
    skipToEnd: "Zum Ende springen",
    play: "Abspielen",
    minutesShort: "Min",
    minutesAbbrev: "Min",
    secondsShort: "s",
    sessionLabel_one: "{{count}} Zyklus",
    sessionLabel_other: "{{count}} Zyklen",
  },

  language: {
    label: "Sprache",
    auto: "Automatisch (Gerätesprache)",
    en: "English",
    de: "Deutsch",
  },

  loginScreen: {
    tagline: "Fundierte Atemarbeit auf Basis aktueller Forschung.",
    takeABreath: "Tief durchatmen",
    signInToSync: "Anmelden, um Geräte zu synchronisieren",
    orSync: "oder geräteübergreifend synchronisieren",
    or: "oder",
    continueWithGoogle: "Mit Google fortfahren",
    signingIn: "Anmeldung läuft…",
    emailPlaceholder: "E-Mail",
    passwordPlaceholder: "Passwort",
    signIn: "Anmelden",
    createAccount: "Konto erstellen",
    creatingAccount: "Konto wird erstellt…",
    needAccount: "Noch kein Konto? Jetzt erstellen",
    haveAccount: "Schon ein Konto? Anmelden",
    forgotPassword: "Passwort vergessen?",
    enterEmailFirst: "Gib oben zuerst deine E-Mail-Adresse ein und tippe dann auf „Passwort vergessen?“.",
    resetSent: "Wir haben dir einen Link an {{email}} gesendet. Sieh in dein Postfach.",
    couldNotSend: "E-Mail zum Zurücksetzen konnte nicht gesendet werden",
    somethingWentWrong: "Etwas ist schiefgelaufen",
    educationalNote:
      "Mit der Nutzung erklärst du dich einverstanden, diese App als Lernwerkzeug zu verwenden — nicht als medizinischen Rat. Sicherheitshinweise folgen nach der Anmeldung.",
    builtForOpenSource: "Mit Liebe gebaut für",
    openSource: "Open Source",
    imprint: "Impressum",
    privacy: "Datenschutz",
    errInvalidEmail: "Die E-Mail-Adresse sieht nicht richtig aus.",
    errMissingPassword: "Bitte gib dein Passwort ein.",
    errWeakPassword: "Das Passwort ist zu kurz. Verwende mindestens 6 Zeichen.",
    errEmailInUse: "Mit dieser E-Mail existiert bereits ein Konto. Versuche dich stattdessen anzumelden.",
    errWrongCreds: "E-Mail oder Passwort sind falsch.",
    errTooManyRequests: "Zu viele Versuche. Versuche es in einigen Minuten erneut oder setze dein Passwort zurück.",
    errNetwork: "Netzwerkfehler. Prüfe deine Verbindung und versuche es erneut.",
  },

  home: {
    appTagline: "Fundierte Atemarbeit auf Basis aktueller Forschung.",
    startProgram: "Programm „{{name}}“ starten",
    startProgramSub: "Fünf Tage, eine Übung pro Tag — jeweils mit einer kurzen Lektion.",
    programComplete: "{{name}} · abgeschlossen",
    programDay: "{{name}} · Tag {{day}} von {{total}}",
    daysFinished: "{{total}} Tage geschafft",
    continueProgram: "Programm fortsetzen",
    library: "Bibliothek",
    librarySub: "Jede Technik, nach Wirkung gruppiert.",
    themesAria: "Themen",
    tryTheme: "{{period}} — {{theme}} probieren?",
    dismissSuggestion: "Vorschlag schließen",
    dayStreak: "Tage in Folge",
    minutes: "Minuten",
    lastSession: "letzte Sitzung",
    justNow: "gerade eben",
    minutesAgo: "vor {{n}} Min",
    hoursAgo: "vor {{n}} Std",
    daysAgo: "vor {{n}} T",
    history: "Verlauf",
    settings: "Einstellungen",
  },

  onboarding: {
    slides: [
      {
        title: "Willkommen bei Sough",
        body: "Atemarbeit auf wissenschaftlicher Grundlage.",
      },
      {
        title: "Vielfältige Wirkung",
        body: "Stress beruhigen. Tiefer schlafen. Fokus schärfen. Energie finden.",
      },
      {
        title: "Klein anfangen",
        body: "Fünf Minuten am Tag. Beständigkeit zählt mehr als Dauer.",
      },
      {
        title: "Ein Start in fünf Tagen",
        body: "Wir haben ein fünftägiges Foundations-Programm vorbereitet — eine Übung pro Tag, jeweils mit einer kurzen Lektion. Du findest es auf dem Startbildschirm, wann immer du bereit bist.",
      },
    ],
    tapToBegin: "Irgendwo tippen, um zu starten",
  },

  settings: {
    title: "Einstellungen",
    guestMode: "Gastmodus",
    guestSubtitle: "Daten bleiben auf diesem Gerät",
    signOut: "Abmelden",
    signOutConfirm: "Wirklich abmelden?",
    signUpToSync: "Registrieren, um zwischen Geräten zu synchronisieren",
    signUpFromGuestConfirm:
      "Registriere dich, um Einstellungen und Verlauf geräteübergreifend zu synchronisieren. Deine bisherigen Daten werden in das neue Konto übernommen. Fortfahren?",
    voicePrompts: "Sprachansagen",
    backgroundMusic: "Hintergrundmusik",
    chimes: "Glocken",
    haptics: "Vibration",
    soundscape: "Klangkulisse",
    voice: "Stimme",
    countdown: "Verbleibende Sekunden mitzählen",
    previewVoice: "Probe für {{name}}",
    play: "Abspielen",
    volume: "Lautstärke",
    master: "Gesamt",
    music: "Musik",
    perTechniqueDurations: "Dauer je Technik",
    reminders: "Erinnerungen",
    remindersDaily: "Tägliche Übungserinnerung",
    remindersTime: "Uhrzeit",
    remindersOff: "aus",
    remindersDailyHint: "täglich · {{time}}",
    remindersUnsupported: "Benachrichtigungen sind in diesem Browser nicht verfügbar.",
    remindersBlocked:
      "Benachrichtigungen sind blockiert. Aktiviere sie für sough.app in deinen Browser-Einstellungen und schalte sie hier erneut ein.",
    remindersBackground:
      "Erinnerungen werden über Firebase Cloud Messaging zugestellt — sie funktionieren auch, wenn Sough geschlossen ist.",
    remindersForeground:
      "Erinnerungen funktionieren nur, solange Sough in einem Tab geöffnet ist. Setze VITE_FIREBASE_VAPID_KEY und deploye die Reminder-Cloud-Function für Hintergrund-Push (siehe README).",
    display: "Darstellung",
    theme: "Erscheinungsbild",
    themeAuto: "Automatisch (System folgen)",
    themeLight: "Hell",
    themeDark: "Dunkel",
    motion: "Bewegung reduzieren",
    motionAuto: "Automatisch (System folgen)",
    motionOn: "An",
    motionOff: "Aus",
    displayHint: "{{theme}} · Bewegung {{motion}}",
    testSound: "Ton testen",
    testSoundHint:
      "Tippe unten, um ein Beispiel zu hören. Hörst du nichts, prüfe die Systemlautstärke und ob eine andere App den Tab stummschaltet.",
    testSoundButton: "Ton testen",
    playingTestSound: "Test läuft…",
    privacy: "Privatsphäre",
    analyticsOn: "Analyse an",
    analyticsOff: "Analyse aus",
    helpImprove: "Sough verbessern helfen (anonyme Nutzung)",
    analyticsNote:
      "Selbst gehostet, ohne Cookies. Erfasst Seitenaufrufe, abgeschlossene Sitzungen je Technik sowie die gewählte Klangkulisse / Stimme / Programm. Keine personenbezogenen Daten, keine Drittanbieter-Tracker — die vollständige Ereignisliste findest du im Quellcode.",
    dataAccount: "Daten & Konto",
    exportData: "Meine Daten exportieren (JSON)",
    exportDownload: "Herunterladen",
    exportPreparing: "Wird vorbereitet…",
    exportFailed: "Export fehlgeschlagen. Bitte erneut versuchen.",
    clearLocal: "Lokale Daten löschen",
    deleteAccount: "Konto und alle Daten löschen",
    permanent: "Endgültig",
    deleting: "Wird gelöscht…",
    confirmClearLocal: "Alle lokal gespeicherten Einstellungen und Sitzungsdaten löschen? Das lässt sich nicht rückgängig machen.",
    confirmDelete: "Konto und gesamten Sitzungsverlauf löschen? Das lässt sich nicht rückgängig machen.",
    deleteFailedLocal: "Lokale Daten konnten nicht gelöscht werden. Bitte erneut versuchen.",
    deleteFailedAccount: "Kontolöschung fehlgeschlagen. Bitte erneut versuchen.",
    viewDisclaimer: "Sicherheitshinweis anzeigen",
    resetSettings: "Einstellungen zurücksetzen",
    resetConfirm: "Alle Einstellungen auf Standard zurücksetzen?",
    footerSource: "Quellcode",
    footerImprint: "Impressum",
    footerPrivacy: "Datenschutz",
  },

  session: {
    notFound: "Technik nicht gefunden.",
    backHome: "Zurück zur Startseite",
    getReady: "Bereit machen",
    settleIn: "Atme langsam ein. Komm an.",
    newHere: "Neu hier?",
    newHereActivating: "Aktivierende Techniken können intensiv sein. Probiere zuerst eine ruhigere Übung.",
    tryBoxFirst: "Erst Box-Atmung probieren →",
    safetyReminder: "Sicherheitshinweis",
    roundOf: "Runde {{current}} von {{total}}",
    cycleOf: "Zyklus {{current}} von {{total}}",
    closeSession: "Sitzung schließen",
    endSessionConfirm: "Sitzung beenden? Dein Fortschritt wird nicht gespeichert.",
    stay: "Bleiben",
    endSession: "Beenden",
    settleTitle: "Ein Moment zum Ankommen",
    settleBody: "Bleib einen Moment hier. Spüre nach.",
    sessionComplete: "Sitzung abgeschlossen",
    useThisWhen: "Wann anwenden",
    dayOf: "Tag {{day}} von {{total}}",
    today: "Heute",
    whyItWorks: "Warum es wirkt",
    whatToNotice: "Worauf achten",
    beginWithDuration: "Starten · {{mins}} Min",
    nostrilOpen: "Nasenloch {{side}} offen",
    open: "Offen: {{side}}",
    nostrilLeft: "links",
    nostrilRight: "rechts",
    debugVoice: "Stimme",
    debugVoiceAria: "Debug: Stimmprofil wechseln",
  },

  category: {
    notFound: "Kategorie nicht gefunden.",
    backToLibrary: "Zurück zur Bibliothek",
  },

  library: {
    badge: "Bibliothek",
    title: "Nach Kategorie suchen",
    intro:
      "Alle Techniken nach Wirkung auf das autonome Nervensystem gruppiert. Die Themen auf der Startseite gruppieren dieselben Techniken nach Ziel.",
  },

  theme: {
    notFound: "Thema nicht gefunden.",
    backHome: "Zurück zur Startseite",
  },

  history: {
    title: "Verlauf",
    dayStreak: "Tage in Folge",
    minutes: "Minuten",
    sessions: "Sitzungen",
    last14Days: "Letzte 14 Tage",
    peakMinutes: "Spitze {{n}} Min",
    noSessionsInWindow: "In den letzten zwei Wochen noch keine Sitzungen.",
    filterAll: "Alle",
    noSessionsYet: "Noch keine Sitzungen.",
    noSessionsCategory: "Noch keine Sitzungen in „{{category}}“.",
    narratedLesson: "Lektion zum Anhören",
    playLesson: "Lektion abspielen",
    pauseLesson: "Lektion pausieren",
  },

  program: {
    badge: "Fünf-Tage-Programm",
    fiveDayHeadline: "Grundlagen in fünf Tagen",
    enrollDescription:
      "Eine Übung pro Tag, jeweils mit kurzer Lektion. Langsame Atmung, Resonanz, Anhalten, lange Ausatmungen und ein Reset für überall. Etwa fünf Minuten täglich.",
    enrollCta: "Programm starten",
    statusComplete: "Programm abgeschlossen",
    statusDay: "Tag {{day}} von {{total}}",
    devUnlock: "DEV — alle Tage zum Testen freigeschaltet",
    completeBlurb:
      "Du hast die Grundlagen durchlaufen. Übe weiter mit den Techniken, die dich angesprochen haben — die Themen auf der Startseite helfen dir, eine passende für den Moment zu finden.",
    dayLabel: "Tag {{day}} · {{mins}} Min",
  },

  techniqueCard: {
    duration: "Dauer",
    less: "Weniger",
    more: "Mehr",
    tutorial: "Erklärung",
    closeTutorial: "Schließen",
    playTutorial: "Erklärung abspielen",
    pauseTutorial: "Erklärung pausieren",
    closeTutorialAria: "Erklärung schließen",
    sessionLength: "Sitzungsdauer",
    citation: "Quelle: ",
    statsLine: "{{count}}× · insgesamt {{minutes}} Min",
    wantToKnowMore: "Mehr über diese Übung erfahren?",
    listenShortTutorial: "Höre eine kurze Erklärung an.",
  },

  disclaimer: {
    title: "Sicherheitshinweis",
    notMedical: "Sough ist keine medizinische Beratung.",
    educational: "Es ist ein Lernwerkzeug, das eine persönliche Atempraxis unterstützt.",
    stopIfDizzy:
      "Höre sofort auf, wenn dir schwindlig oder benommen wird. Setz oder leg dich hin, bis das Gefühl vorbei ist.",
    upregulateWater:
      "Aktivierende Techniken (zyklische Hyperventilation, Blasebalg-Atmung) dürfen niemals im oder am Wasser, beim Autofahren oder beim Bedienen von Maschinen geübt werden — Ohnmacht ist möglich.",
    consultPhysician:
      "Konsultiere vor der Praxis ärztlichen Rat, wenn du schwanger bist oder Herz-Kreislauf-, Atemwegs- oder psychische Erkrankungen oder Krampfanfälle in der Vorgeschichte hast.",
    consentLabel:
      "Ich habe die obigen Sicherheitshinweise gelesen und verstanden. Ich erkenne an, dass Sough ein Lernwerkzeug und keine medizinische Beratung ist, und übe auf eigenes Risiko.",
    accept: "Ich stimme zu",
    understand: "Verstanden",
  },

  safetyModal: {
    beforeBegin: "Bevor du beginnst — {{name}}",
    newHere: "Neu hier?",
    newHereActivating:
      "Aktivierende Techniken wie diese können intensiv sein. Wir empfehlen, zuerst mit einer ruhigeren Übung eine Grundlage aufzubauen.",
    tryBoxFirst: "Erst Box-Atmung probieren →",
    notNow: "Nicht jetzt",
    understand: "Verstanden",
  },

  imprint: {
    title: "Impressum",
    heading: "Angaben gemäß § 5 DDG / § 18 MStV",
    providerH: "Anbieter",
    contactH: "Kontakt",
    email: "E-Mail:",
    authH: "Vertretungsberechtigt",
    managingDirectorPrefix: "Geschäftsführer:",
    registerH: "Handelsregister",
    registerCourt: "Registergericht:",
    registerNumber: "Registernummer:",
    vatH: "Umsatzsteuer-ID",
    vatBody: "Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: {{id}}",
    contentResponsibleH: "Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV",
    disputeH: "EU-Streitschlichtung",
    disputeBody:
      "Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:",
    disputeOptOut:
      ". Wir sind nicht bereit oder verpflichtet, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
    seeAlso: "Siehe auch:",
    privacyPolicy: "Datenschutzerklärung",
  },

  privacy: {
    title: "Datenschutzerklärung",
    heading: "Datenschutzerklärung nach Art. 13 DSGVO",
    controllerH: "1. Verantwortlicher",
    email: "E-Mail:",
    collectH: "2. Welche Daten wir verarbeiten und wozu",
    collectIntro:
      "Sough verarbeitet die minimal nötigen Daten, um dir eine personalisierte, geräteübergreifende Nutzung zu ermöglichen.",
    guestModeStrong: "Gastmodus:",
    guestModeBody:
      "Wenn du „Ohne Konto starten“ gewählt hast, werden deine Einstellungen und dein Sitzungsverlauf ausschließlich im lokalen Speicher dieses Browsers abgelegt. Keine der in diesem Abschnitt beschriebenen Daten verlässt dein Gerät, bevor du ein Konto erstellst.",
    authH: "Konto / Authentifizierung",
    authBody:
      "Bei der Anmeldung erhalten wir eine Konto-Kennung und E-Mail-Adresse (sowie bei Google-Anmeldung Anzeigename und URL des Profilbilds). Diese werden in unserem Auftrag von Google Firebase Authentication gespeichert.",
    legalContract: "Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO — Vertragserfüllung.",
    settingsH: "Einstellungen & Sitzungsverlauf",
    settingsBody:
      "Deine Einstellungen (Erscheinungsbild, Klänge, Erinnerungszeit usw.) sowie ein Protokoll jeder abgeschlossenen Atemsitzung — Dauer, Technik und optionaler Stimmungs-Check — werden in Google Firestore unter deiner Konto-ID gespeichert. Sie sind ausschließlich für dich sichtbar.",
    analyticsH: "Analyse",
    analyticsBody:
      "Wir nutzen eine selbst gehostete Umami-Instanz, um anonym Seitenaufrufe und eine kleine Auswahl an Produkt-Ereignissen (z. B. abgeschlossene Sitzung, Stimme gewechselt) zu zählen. Es werden keine Cookies gesetzt. Deine IP-Adresse wird kurzfristig zum Spam-/Missbrauchsschutz verarbeitet und verworfen — sie wird nie langfristig gespeichert. Du kannst die Analyse jederzeit in den Einstellungen deaktivieren.",
    legalLegitimate:
      "Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO — berechtigtes Interesse an der Verbesserung des Dienstes.",
    pushH: "Push-Erinnerungen (optional)",
    pushBody:
      "Wenn du tägliche Übungserinnerungen aktivierst, wird ein Push-Abonnement-Token über Google Firebase Cloud Messaging gespeichert, damit wir die Erinnerung auch bei geschlossener App zustellen können. Schalte die Erinnerung in den Einstellungen aus, um das Token zu löschen.",
    legalConsent: "Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO — deine Einwilligung.",
    processorsH: "3. Auftragsverarbeiter und Empfänger",
    processorsBody:
      "(Gordon House, Barrow Street, Dublin 4, Irland) verarbeitet Authentifizierungs-, Datenbank- und (optional) Push-Daten in unserem Auftrag als Auftragsverarbeiter gemäß Art. 28 DSGVO. Ein Vertrag zur Auftragsverarbeitung liegt vor. Google kann Daten unter den Standardvertragsklauseln der EU-Kommission außerhalb der EU übertragen.",
    noSell:
      "Wir verkaufen oder vermieten deine Daten nicht. Außer mit dem oben genannten Auftragsverarbeiter geben wir nichts an Dritte weiter.",
    retentionH: "4. Speicherdauer",
    retentionAccount:
      "Konto, Einstellungen und Sitzungsverlauf: bis du dein Konto löschst (Einstellungen → Konto löschen).",
    retentionPush: "Push-Tokens: werden gelöscht, wenn Erinnerungen deaktiviert oder das Konto gelöscht werden.",
    retentionAnalytics: "Analyse-Ereignisse: 12 Monate, danach automatische Löschung.",
    rightsH: "5. Deine Rechte",
    rightsIntro: "Nach der DSGVO hast du folgende Rechte:",
    rightAccess: "Auskunft über deine bei uns gespeicherten personenbezogenen Daten (Art. 15)",
    rightCorrect: "Berichtigung unrichtiger Daten (Art. 16)",
    rightDelete: "Löschung deiner Daten (Art. 17) — die App-Funktion „Konto löschen“ setzt dies um",
    rightRestrict: "Einschränkung der Verarbeitung (Art. 18)",
    rightPortable: "Erhalt deiner Daten in einem übertragbaren Format (Art. 20)",
    rightObject:
      "Widerspruch gegen Verarbeitung auf Grundlage berechtigten Interesses (Art. 21) — z. B. Analyse in den Einstellungen abschalten",
    rightWithdraw:
      "Widerruf der Einwilligung jederzeit möglich, ohne dass die bisherige rechtmäßige Verarbeitung berührt wird",
    rightsExercise: "Um eines dieser Rechte auszuüben, schreib eine E-Mail an",
    complaintH: "6. Beschwerderecht",
    complaintBody:
      "Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Für uns ist zuständig:",
    automatedH: "7. Keine automatisierten Entscheidungen",
    automatedBody:
      "Wir treffen keine automatisierten Entscheidungen und führen kein Profiling durch. Die App zeigt dir die Daten, die du selbst erzeugst; wir werten sie nicht aus, um dich betreffende Entscheidungen zu treffen.",
    healthH: "8. Gesundheitsbezogene Inhalte",
    healthBody:
      "Sough ist ein Wellness-Tool, kein Medizinprodukt. Wir fragen weder Diagnosen noch Erkrankungen noch andere Daten ab, die unter Art. 9 DSGVO (besondere Kategorien) fallen würden. Optionale Stimmungs-Check-ins sind allgemeine Wohlbefinden-Signale, die ausschließlich unter deinem Konto gespeichert werden.",
    lastUpdated: "Zuletzt aktualisiert: 18. Mai 2026. Siehe auch:",
    imprintLink: "Impressum",
  },

  categories: {
    downregulate: {
      title: "Beruhigen",
      tagline: "Das Nervensystem herunterfahren",
      description:
        "Längere Ausatmungen als Einatmungen aktivieren den parasympathischen Zweig des autonomen Nervensystems und senken die Erregung.",
    },
    upregulate: {
      title: "Aktivieren",
      tagline: "Energie und Wachheit",
      description:
        "Kräftigere Einatmungen als Ausatmungen erhöhen den sympathischen Tonus und steigern Wachheit und Energie.",
    },
    balance: {
      title: "Ausgleichen",
      tagline: "Gleichgewicht wiederherstellen",
      description:
        "Gleich lange Ein- und Ausatmungen stabilisieren den autonomen Tonus und maximieren die Herzratenvariabilität.",
    },
    focus: {
      title: "Fokussieren",
      tagline: "Aufmerksamkeit schärfen",
      description:
        "Rhythmische, aufmerksamkeitsbindende Muster verbessern anhaltende Konzentration.",
    },
  },

  themes: {
    sleep: {
      name: "Schlaf",
      tagline: "Zur Ruhe kommen",
      description:
        "Langsame Atmung und lange Ausatmungen aktivieren den Parasympathikus, senken die Erregung und bereiten den Körper auf den Schlaf vor.",
      period: "Abend",
    },
    stress: {
      name: "Stress-Reset",
      tagline: "Werkzeuge für harte Momente",
      description:
        "Schnell wirkende Techniken, um die Stressreaktion zu dämpfen, dazu ein paar ruhige Muster, um das System nach der Spitze zu beruhigen.",
      period: "Später Nachmittag",
    },
    focus: {
      name: "Fokus",
      tagline: "Aufmerksamkeit schärfen",
      description:
        "Symmetrische und rhythmische Muster trainieren anhaltende Aufmerksamkeit. Der Atem wird zu einem einzigen Ankerpunkt für den Geist.",
      period: "Nachmittag",
    },
    energy: {
      name: "Energie",
      tagline: "Körper und Geist aktivieren",
      description:
        "Aktive Atemarbeit, die den Sympathikus anhebt — nützlich beim Aufwachen, vor dem Training oder im Nachmittagstief.",
      period: "Morgen",
    },
  },

  techniques: {
    "physiological-sigh": {
      shortDescription: "Doppelt durch die Nase einatmen, lange durch den Mund ausatmen.",
      scientificRationale:
        "In einer randomisierten Vergleichsstudie gegenüber Achtsamkeitsmeditation war dies die effektivste Einzeltechnik, um Erregung schnell zu senken und die Stimmung zu verbessern.",
    },
    "four-seven-eight": {
      shortDescription: "4 Sek durch die Nase einatmen, 7 Sek halten, 8 Sek durch gespitzte Lippen ausatmen.",
      scientificRationale:
        "Ein Muster aus langer Ausatmung und Atemanhalten, das den Vagustonus steigert; weit verbreitet zur Entspannung und Einschlafhilfe.",
    },
    diaphragmatic: {
      shortDescription: "Langsame Naseneinatmung, die den Bauch dehnt; längere, langsame Ausatmung.",
      scientificRationale:
        "Grundlegende Technik zur Vagus-Stimulation; langsame, bauchgeführte Atmung senkt zuverlässig Herzfrequenz und Blutdruck.",
    },
    "energizing-breath": {
      shortDescription: "30 aktive Naseneinatmungen (2 Sek) / passive Mundausatmungen (1 Sek), dann lange Ausatempause. 2 Runden.",
      scientificRationale:
        "Eine anfängerfreundliche zyklische Hyperventilation in Anlehnung an die Wim-Hof-Methode. Erhöht sympathischen Tonus und Adrenalin und erzeugt Wachheit und Wärme.",
      safety: [
        "Nicht im oder am Wasser üben.",
        "Nicht beim Autofahren oder Bedienen von Maschinen üben.",
        "Bei Schwangerschaft oder Herz-Kreislauf-, Atemwegs- oder Krampferkrankungen vermeiden.",
        "Sofort aufhören, wenn dir schwindlig oder benommen wird — diese Techniken können Ohnmacht auslösen.",
      ],
    },
    "bellows-breath": {
      shortDescription: "Gleich kräftiges 2-Sek-Nasenein- und -ausatmen für ~30 Sekunden, dann 15 Sek Pause. 3 Runden.",
      scientificRationale:
        "Schnelle, kraftvolle Atmung erhöht die sympathische Aktivität und Wachheit; eine sanfte Variante mit gleichen Verhältnissen ist für Anfänger geeignet.",
      safety: [
        "Aufhören, wenn dir schwindlig oder benommen wird.",
        "Nicht beim Autofahren oder im Wasser üben.",
        "Bei Schwangerschaft oder Herz-Kreislauf-Erkrankungen aussetzen.",
      ],
    },
    "box-breathing": {
      shortDescription: "4 Sek einatmen, 4 Sek halten, 4 Sek ausatmen, 4 Sek halten. Wird von Navy SEALs eingesetzt.",
      scientificRationale:
        "Atemmuster mit gleichen Verhältnissen und kurzen Pausen stabilisieren den autonomen Tonus und sind für Anfänger gut verträglich.",
    },
    "coherent-breathing": {
      shortDescription: "5,5 Sek einatmen, 5,5 Sek ausatmen. ~5,5 Atemzüge/Min — der HRV-Sweet-Spot.",
      scientificRationale:
        "Atmen mit ~5,5–6 Atemzügen pro Minute maximiert die Baroreflex-Verstärkung und die Herzratenvariabilität — der Marker für autonome Flexibilität.",
    },
    "alternate-nostril": {
      shortDescription: "Links einatmen, rechts ausatmen, rechts einatmen, links ausatmen — wiederholen.",
      scientificRationale:
        "Wechselatmung (Nadi Shodhana) verbessert Aufmerksamkeit, autonomes Gleichgewicht und kognitive Leistung.",
    },
    "equal-breathing": {
      shortDescription: "4 Sek einatmen, 4 Sek ausatmen. Ein gleichmäßiger Rhythmus für die Aufmerksamkeit.",
      scientificRationale:
        "Einfache symmetrische Atmung dient als Aufmerksamkeitsanker; regelmäßige Praxis wird mit verbesserter Daueraufmerksamkeit assoziiert.",
    },
  },

  phaseLabels: {
    "Breathe in": "Einatmen",
    "Breathe out": "Ausatmen",
    Hold: "Halten",
    "Top off": "Nachatmen",
    "Long exhale": "Lang ausatmen",
    "Active in": "Aktiv ein",
    "Active out": "Aktiv aus",
    "Let go": "Loslassen",
    "Final exhale": "Letzte Ausatmung",
    "Hold (empty)": "Halten (leer)",
    "Recovery in": "Erholung ein",
    "Recovery hold": "Erholungspause",
    Release: "Loslassen",
    Settle: "Ankommen",
    Rest: "Ruhe",
    "In — left": "Ein — links",
    "Out — right": "Aus — rechts",
    "In — right": "Ein — rechts",
    "Out — left": "Aus — links",
  },

  phaseNotes: {
    "Second short inhale": "Zweite kurze Einatmung",
    "Passive release": "Passiv loslassen",
    "Belly expands": "Bauch dehnt sich",
    "Belly falls": "Bauch sinkt",
    "Release whenever you feel the urge to breathe": "Loslassen, sobald du das Atmen brauchst",
    "Slow nasal inhale — let the body unwind": "Langsam durch die Nase einatmen — der Körper darf entspannen",
    "Soften shoulders and jaw. Notice tingling, warmth.":
      "Schultern und Kiefer lockern. Kribbeln, Wärme wahrnehmen.",
  },

  program_days: {
    "1": {
      headline: "Im Atem ankommen",
      why: "Bauchgeführtes Atmen ist die Grundlage. Spüre, wie der Körper weich wird, sobald die Ausatmung länger wird.",
      learn: "Bauchgeführte Atmung — das Fundament für alles Weitere.",
      science:
        "Eine langsame Naseneinatmung, die den Bauch dehnt, und eine längere Ausatmung aktivieren den Vagusnerv, senken Herzfrequenz und Blutdruck.",
      notice: "Lege eine Hand auf den Bauch. Er sollte sich beim Einatmen heben — nicht die Brust.",
      useWhen: "Immer wenn du dich beim flachen Brustatmen ertappst — am Schreibtisch, im Verkehr, vor dem Schlafen.",
    },
    "2": {
      headline: "Deine Resonanz finden",
      why: "Etwa sechs Atemzüge pro Minute maximieren die Herzratenvariabilität — den Marker für autonome Flexibilität.",
      learn: "Finde deine Resonanz — etwa fünfeinhalb Atemzüge pro Minute.",
      science:
        "In diesem Tempo synchronisieren sich Herzfrequenz, Blutdruck und Atmung. Diese „Kohärenz“ maximiert die Herzratenvariabilität, einen Marker autonomer Flexibilität.",
      notice: "Weich und gleichmäßig, ein und aus. Das Tempo darf langsam sein, aber niemals angestrengt.",
      callback: "Gestern hast du den Atem im Bauch verankert. Heute stimmen wir sein Tempo ab.",
      useWhen: "Als tägliches Fünf-Minuten-Reset — vor Meetings, nach der Arbeit oder als Stress-Grundlinie.",
    },
    "3": {
      headline: "Eine Pause einbauen",
      why: "Gleich lang ein, halten, aus, halten. Pausen trainieren Toleranz und beruhigen das Nervensystem.",
      learn: "Gleiche Zählweise in alle vier Richtungen: ein, halten, aus, halten.",
      science:
        "Kurze Atempausen trainieren die CO₂-Toleranz und stabilisieren das Nervensystem. Deshalb nutzen Spezialeinheiten das Muster vor heiklen Momenten.",
      notice: "Die Pausen sollen sich nicht angestrengt anfühlen. Lockere Hals und Schultern, während du wartest.",
      callback: "Gestern war der Rhythmus ein Zweiertakt. Heute machen wir einen Vierer daraus.",
      useWhen: "Vor allem, was den Puls hochjagt — eine Präsentation, ein schwieriges Gespräch, ein Workout.",
    },
    "4": {
      headline: "Auf die Ausatmung setzen",
      why: "Eine lange Ausatmung mit Atemanhalten aktiviert den Parasympathikus stark — nützlich vor dem Einschlafen.",
      learn: "Auf die Ausatmung setzen. Vier ein, sieben halten, acht aus.",
      science:
        "Lange Ausatmungen — besonders nach einer Pause — aktivieren den Parasympathikus stark. Das ist das Atemmuster, das am verlässlichsten mit schnellerem Einschlafen verknüpft ist.",
      notice: "Die Ausatmung durch gespitzte Lippen soll langsam und hörbar wirken — wie auf einen Spiegel hauchen.",
      callback: "Gestern waren die Pausen symmetrisch. Heute neigen wir das Verhältnis Richtung Ruhe.",
      useWhen: "Im Bett, wenn du nicht einschlafen kannst, oder in den fünf Minuten vor einer stressigen Situation.",
    },
    "5": {
      headline: "Ein Reset auf Abruf",
      why: "Das schnellste Werkzeug, um Erregung im Moment herunterzufahren. Behalte es immer in der Tasche.",
      learn: "Ein Reset auf Abruf — zwei kurze Naseneinatmungen, eine lange Mundausatmung.",
      science:
        "Die doppelte Einatmung bläst zusammengefallene Lungenbläschen wieder auf; die lange Ausatmung schiebt schnell viel CO₂ raus. In einem randomisierten Vergleich gegen Meditation war es die wirksamste Einzeltechnik gegen akuten Stress.",
      notice: "Die zweite Einatmung ist kurz — ein Nachfüllen. Die Arbeit passiert in der langen Ausatmung.",
      callback: "Die letzten vier Tage waren strukturierte Übungen. Das heutige Werkzeug schaffst du überall in zehn Sekunden.",
      useWhen: "Mitten im Stress, in der Gedankenspirale, in jedem „Mittendrin“. Ein bis drei Seufzer, und der Körper setzt zurück.",
    },
  },

  programMeta: {
    name: "Foundations",
    tagline: "Eine Tour durch die Grundlagen",
  },

  weekdayNarrow: ["S", "M", "D", "M", "D", "F", "S"],

  notifications: {
    title: "Zeit zum Üben",
    body: "Ein paar Minuten Atemarbeit.",
  },
};
