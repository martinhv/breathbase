// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Link } from "react-router-dom";
import { LEGAL } from "@/lib/legal";

export function Imprint() {
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
          Imprint
        </h1>
      </header>

      <section className="space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Angaben gemäß § 5 DDG / § 18 MStV
        </p>

        <div>
          <h2 className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
            Anbieter / Service Provider
          </h2>
          <p>
            {LEGAL.company}<br />
            {LEGAL.street}<br />
            {LEGAL.city}<br />
            {LEGAL.country}
          </p>
        </div>

        <div>
          <h2 className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
            Kontakt / Contact
          </h2>
          <p>
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
          <h2 className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
            Vertretungsberechtigt / Authorised Representative
          </h2>
          <p>Geschäftsführer: {LEGAL.managingDirector}</p>
        </div>

        <div>
          <h2 className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
            Handelsregister / Commercial Register
          </h2>
          <p>
            Registergericht: {LEGAL.registerCourt}<br />
            Registernummer: {LEGAL.registerNumber}
          </p>
        </div>

        {LEGAL.vatId && (
          <div>
            <h2 className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
              Umsatzsteuer-ID / VAT ID
            </h2>
            <p>
              Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: {LEGAL.vatId}
            </p>
          </div>
        )}

        <div>
          <h2 className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
            Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
          </h2>
          <p>
            {LEGAL.company}<br />
            {LEGAL.street}<br />
            {LEGAL.city}
          </p>
        </div>

        <div>
          <h2 className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
            EU-Streitschlichtung / EU Dispute Resolution
          </h2>
          <p>
            Die Europäische Kommission stellt eine Plattform zur
            Online-Streitbeilegung (OS) bereit:{" "}
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:underline text-teal-400"
            >
              ec.europa.eu/consumers/odr
            </a>
            . Wir sind nicht bereit oder verpflichtet, an einem
            Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 pt-2">
          See also: <Link to="/privacy" className="underline-offset-2 hover:underline">Privacy Policy</Link>
        </p>
      </section>
    </div>
  );
}
