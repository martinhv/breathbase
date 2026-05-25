// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LEGAL } from "@/lib/legal";

export function Imprint() {
  const { t } = useTranslation();
  return (
    <div className="min-h-full safe-top safe-bottom px-5 pb-8 max-w-md mx-auto">
      <header className="pt-4 pb-5 flex items-center gap-3">
        <Link
          to="/"
          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          aria-label={t("common.back")}
        >
          ←
        </Link>
        <h1 className="text-xl font-light text-slate-900 dark:text-slate-100">
          {t("imprint.title")}
        </h1>
      </header>

      <section className="space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {t("imprint.heading")}
        </p>

        <div>
          <h2 className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
            {t("imprint.providerH")}
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
            {t("imprint.contactH")}
          </h2>
          <p>
            {t("imprint.email")}{" "}
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
            {t("imprint.authH")}
          </h2>
          <p>{t("imprint.managingDirectorPrefix")} {LEGAL.managingDirector}</p>
        </div>

        <div>
          <h2 className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
            {t("imprint.registerH")}
          </h2>
          <p>
            {t("imprint.registerCourt")} {LEGAL.registerCourt}<br />
            {t("imprint.registerNumber")} {LEGAL.registerNumber}
          </p>
        </div>

        {LEGAL.vatId && (
          <div>
            <h2 className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
              {t("imprint.vatH")}
            </h2>
            <p>{t("imprint.vatBody", { id: LEGAL.vatId })}</p>
          </div>
        )}

        <div>
          <h2 className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
            {t("imprint.contentResponsibleH")}
          </h2>
          <p>
            {LEGAL.company}<br />
            {LEGAL.street}<br />
            {LEGAL.city}
          </p>
        </div>

        <div>
          <h2 className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
            {t("imprint.disputeH")}
          </h2>
          <p>
            {t("imprint.disputeBody")}{" "}
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:underline text-teal-400"
            >
              ec.europa.eu/consumers/odr
            </a>
            {t("imprint.disputeOptOut")}
          </p>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 pt-2">
          {t("imprint.seeAlso")}{" "}
          <Link to="/privacy" className="underline-offset-2 hover:underline">
            {t("imprint.privacyPolicy")}
          </Link>
        </p>
      </section>
    </div>
  );
}
