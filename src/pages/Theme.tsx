// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { THEMES, type ThemeId } from "@/lib/themes";
import { findTechnique } from "@/lib/techniques";
import { TechniqueCard } from "@/components/TechniqueCard";

export function Theme() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const theme = id && (id as ThemeId) in THEMES ? THEMES[id as ThemeId] : null;
  if (!theme) {
    return (
      <div className="p-6 text-center text-slate-600 dark:text-slate-400 safe-top safe-bottom">
        <p>{t("theme.notFound")}</p>
        <Link to="/" className="text-teal-300 underline">
          {t("theme.backHome")}
        </Link>
      </div>
    );
  }
  const techniques = theme.techniqueIds
    .map((tid) => findTechnique(tid))
    .filter((tt): tt is NonNullable<typeof tt> => !!tt);

  return (
    <div className="min-h-full safe-top safe-bottom px-5 pb-6 max-w-md mx-auto">
      <header className="pt-4 pb-5 flex items-center gap-3">
        <Link
          to="/"
          aria-label={t("common.back")}
          className="p-2 -ml-2 rounded-full hover:bg-slate-900/[0.04] dark:hover:bg-white/5 text-slate-600 dark:text-slate-400"
        >
          ←
        </Link>
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500">
            {theme.emoji}{" "}
            {t(`themes.${theme.id}.tagline`, { defaultValue: theme.tagline })}
          </div>
          <h1 className="text-2xl font-light">
            {t(`themes.${theme.id}.name`, { defaultValue: theme.name })}
          </h1>
        </div>
      </header>

      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
        {t(`themes.${theme.id}.description`, { defaultValue: theme.description })}
      </p>

      <div className="flex flex-col gap-3">
        {techniques.map((tt) => (
          <TechniqueCard key={tt.id} t={tt} />
        ))}
      </div>
    </div>
  );
}
