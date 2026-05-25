// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LEGAL } from "@/lib/legal";

export function Privacy() {
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
          {t("privacy.title")}
        </h1>
      </header>

      <section className="space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {t("privacy.heading")}
        </p>

        <div>
          <h2 className="text-base text-slate-900 dark:text-slate-100 font-medium mb-2">
            {t("privacy.controllerH")}
          </h2>
          <p>
            {LEGAL.company}<br />
            {LEGAL.street}<br />
            {LEGAL.city}<br />
            {LEGAL.country}
          </p>
          <p className="mt-2">
            {t("privacy.email")}{" "}
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
            {t("privacy.collectH")}
          </h2>

          <p className="mb-3">{t("privacy.collectIntro")}</p>

          <div className="mb-3 rounded-xl bg-teal-400/10 border border-teal-400/30 px-3 py-2 text-xs text-slate-700 dark:text-slate-300">
            <strong className="text-slate-900 dark:text-slate-100">
              {t("privacy.guestModeStrong")}
            </strong>{" "}
            {t("privacy.guestModeBody")}
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm text-slate-900 dark:text-slate-100 font-medium">
                {t("privacy.authH")}
              </h3>
              <p className="text-sm">{t("privacy.authBody")}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t("privacy.legalContract")}
              </p>
            </div>

            <div>
              <h3 className="text-sm text-slate-900 dark:text-slate-100 font-medium">
                {t("privacy.settingsH")}
              </h3>
              <p className="text-sm">{t("privacy.settingsBody")}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t("privacy.legalContract")}
              </p>
            </div>

            <div>
              <h3 className="text-sm text-slate-900 dark:text-slate-100 font-medium">
                {t("privacy.analyticsH")}
              </h3>
              <p className="text-sm">{t("privacy.analyticsBody")}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t("privacy.legalLegitimate")}
              </p>
            </div>

            <div>
              <h3 className="text-sm text-slate-900 dark:text-slate-100 font-medium">
                {t("privacy.pushH")}
              </h3>
              <p className="text-sm">{t("privacy.pushBody")}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t("privacy.legalConsent")}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-base text-slate-900 dark:text-slate-100 font-medium mb-2">
            {t("privacy.processorsH")}
          </h2>
          <p>
            <strong className="text-slate-900 dark:text-slate-200">
              Google Ireland Limited
            </strong>{" "}
            {t("privacy.processorsBody")}
          </p>
          <p className="mt-2">{t("privacy.noSell")}</p>
        </div>

        <div>
          <h2 className="text-base text-slate-900 dark:text-slate-100 font-medium mb-2">
            {t("privacy.retentionH")}
          </h2>
          <ul className="space-y-1.5 list-disc pl-5">
            <li>{t("privacy.retentionAccount")}</li>
            <li>{t("privacy.retentionPush")}</li>
            <li>{t("privacy.retentionAnalytics")}</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base text-slate-900 dark:text-slate-100 font-medium mb-2">
            {t("privacy.rightsH")}
          </h2>
          <p>{t("privacy.rightsIntro")}</p>
          <ul className="space-y-1.5 list-disc pl-5 mt-2">
            <li>{t("privacy.rightAccess")}</li>
            <li>{t("privacy.rightCorrect")}</li>
            <li>{t("privacy.rightDelete")}</li>
            <li>{t("privacy.rightRestrict")}</li>
            <li>{t("privacy.rightPortable")}</li>
            <li>{t("privacy.rightObject")}</li>
            <li>{t("privacy.rightWithdraw")}</li>
          </ul>
          <p className="mt-3">
            {t("privacy.rightsExercise")}{" "}
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
            {t("privacy.complaintH")}
          </h2>
          <p>{t("privacy.complaintBody")}</p>
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
            {t("privacy.automatedH")}
          </h2>
          <p>{t("privacy.automatedBody")}</p>
        </div>

        <div>
          <h2 className="text-base text-slate-900 dark:text-slate-100 font-medium mb-2">
            {t("privacy.healthH")}
          </h2>
          <p>{t("privacy.healthBody")}</p>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 pt-2">
          {t("privacy.lastUpdated")}{" "}
          <Link to="/imprint" className="underline-offset-2 hover:underline">
            {t("privacy.imprintLink")}
          </Link>
        </p>
      </section>
    </div>
  );
}
