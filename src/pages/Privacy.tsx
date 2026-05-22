// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Link } from "react-router-dom";
import { LEGAL } from "@/lib/legal";

export function Privacy() {
  return (
    <div className="min-h-full safe-top safe-bottom px-5 pb-8 max-w-md mx-auto">
      <header className="pt-4 pb-5 flex items-center gap-3">
        <Link
          to="/"
          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          aria-label="Back"
        >
          ←
        </Link>
        <h1 className="text-xl font-light text-slate-900 dark:text-slate-100">
          Privacy Policy
        </h1>
      </header>

      <section className="space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Datenschutzerklärung nach Art. 13 DSGVO
        </p>

        <div>
          <h2 className="text-base text-slate-900 dark:text-slate-100 font-medium mb-2">
            1. Controller (Verantwortlicher)
          </h2>
          <p>
            {LEGAL.company}<br />
            {LEGAL.street}<br />
            {LEGAL.city}<br />
            {LEGAL.country}
          </p>
          <p className="mt-2">
            Email:{" "}
            <a
              href={`mailto:${LEGAL.email}`}
              className="underline-offset-2 hover:underline text-teal-400"
            >
              {LEGAL.email}
            </a>
          </p>
        </div>

        <div>
          <h2 className="text-base text-slate-900 dark:text-slate-100 font-medium mb-2">
            2. What we collect and why
          </h2>

          <p className="mb-3">
            Sough processes the minimum data needed to give you a
            personalised, multi-device experience.
          </p>

          <div className="mb-3 rounded-xl bg-teal-400/10 border border-teal-400/30 px-3 py-2 text-xs text-slate-700 dark:text-slate-300">
            <strong className="text-slate-900 dark:text-slate-100">
              Guest mode:
            </strong>{" "}
            if you chose "Start without an account", your settings and session
            history are stored only in this browser's local storage. None of
            the data described in this section leaves your device until you
            create an account.
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm text-slate-900 dark:text-slate-100 font-medium">
                Account / Authentication
              </h3>
              <p className="text-sm">
                When you sign in we receive an account identifier and email
                address (and, with Google sign-in, your display name and
                profile picture URL). This is stored by Google Firebase
                Authentication on our behalf.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Legal basis: Art. 6(1)(b) GDPR — performance of a contract.
              </p>
            </div>

            <div>
              <h3 className="text-sm text-slate-900 dark:text-slate-100 font-medium">
                Settings & session history
              </h3>
              <p className="text-sm">
                Your preferences (theme, sounds, reminder time, etc.) and a log
                of each completed breathing session — duration, technique, and
                an optional mood check-in — are stored in Google Firestore
                under your account ID. They are visible only to you.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Legal basis: Art. 6(1)(b) GDPR — performance of a contract.
              </p>
            </div>

            <div>
              <h3 className="text-sm text-slate-900 dark:text-slate-100 font-medium">
                Analytics
              </h3>
              <p className="text-sm">
                We use a self-hosted instance of Umami to count anonymous
                page views and a small set of product events (e.g. session
                completed, voice changed). No cookies are set. Your IP
                address is briefly processed for spam/abuse protection and
                discarded — it is never written to long-term storage. You
                can disable analytics at any time in Settings.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Legal basis: Art. 6(1)(f) GDPR — legitimate interest in
                improving the service.
              </p>
            </div>

            <div>
              <h3 className="text-sm text-slate-900 dark:text-slate-100 font-medium">
                Push reminders (optional)
              </h3>
              <p className="text-sm">
                If you enable daily practice reminders, a push subscription
                token is stored via Google Firebase Cloud Messaging so we
                can deliver the reminder while the app is closed. Turn the
                reminder off in Settings to delete the token.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Legal basis: Art. 6(1)(a) GDPR — your consent.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-base text-slate-900 dark:text-slate-100 font-medium mb-2">
            3. Processors and recipients
          </h2>
          <p>
            <strong className="text-slate-900 dark:text-slate-200">
              Google Ireland Limited
            </strong>{" "}
            (Gordon House, Barrow Street, Dublin 4, Ireland) processes
            authentication, database, and (optionally) push-messaging data
            on our behalf as a data processor under Art. 28 GDPR. A Data
            Processing Addendum is in place. Google may transfer data
            outside the EU under the EU Commission's Standard Contractual
            Clauses.
          </p>
          <p className="mt-2">
            We do not sell or rent your data. Beyond the processor above,
            we share nothing with third parties.
          </p>
        </div>

        <div>
          <h2 className="text-base text-slate-900 dark:text-slate-100 font-medium mb-2">
            4. Retention
          </h2>
          <ul className="space-y-1.5 list-disc pl-5">
            <li>
              Account, settings, and session history: kept until you delete
              your account (Settings → Delete account).
            </li>
            <li>
              Push tokens: deleted when reminders are disabled or the
              account is deleted.
            </li>
            <li>
              Analytics events: 12 months, then automatically purged.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-base text-slate-900 dark:text-slate-100 font-medium mb-2">
            5. Your rights
          </h2>
          <p>Under the GDPR you have the right to:</p>
          <ul className="space-y-1.5 list-disc pl-5 mt-2">
            <li>Access the personal data we hold about you (Art. 15)</li>
            <li>Correct inaccurate data (Art. 16)</li>
            <li>Delete your data (Art. 17) — the in-app "Delete account" action does this</li>
            <li>Restrict processing (Art. 18)</li>
            <li>Receive your data in a portable format (Art. 20)</li>
            <li>Object to processing based on legitimate interest (Art. 21) — e.g. opt out of analytics in Settings</li>
            <li>Withdraw consent for consent-based processing at any time, without affecting prior lawful processing</li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, email{" "}
            <a
              href={`mailto:${LEGAL.email}`}
              className="underline-offset-2 hover:underline text-teal-400"
            >
              {LEGAL.email}
            </a>
            .
          </p>
        </div>

        <div>
          <h2 className="text-base text-slate-900 dark:text-slate-100 font-medium mb-2">
            6. Right to complain
          </h2>
          <p>
            You have the right to lodge a complaint with a data protection
            supervisory authority. The competent authority for us is:
          </p>
          <p className="mt-2">
            {LEGAL.supervisoryAuthority}<br />
            {LEGAL.supervisoryAddress}<br />
            <a
              href={LEGAL.supervisoryUrl}
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:underline text-teal-400"
            >
              {LEGAL.supervisoryUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          </p>
        </div>

        <div>
          <h2 className="text-base text-slate-900 dark:text-slate-100 font-medium mb-2">
            7. No automated decisions
          </h2>
          <p>
            We do not make automated decisions or profile users. The app
            shows you the data you generate; we do not analyse it to make
            decisions that affect you.
          </p>
        </div>

        <div>
          <h2 className="text-base text-slate-900 dark:text-slate-100 font-medium mb-2">
            8. Health-related content
          </h2>
          <p>
            Sough is a wellness tool, not a medical device. We do not
            ask for diagnoses, conditions, or any data that would fall
            under Art. 9 GDPR (special categories). Optional mood
            check-ins are general well-being signals stored only under
            your own account.
          </p>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 pt-2">
          Last updated: 18 May 2026. See also:{" "}
          <Link to="/imprint" className="underline-offset-2 hover:underline">
            Imprint
          </Link>
        </p>
      </section>
    </div>
  );
}
