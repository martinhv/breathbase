// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CATEGORIES,
  techniquesByCategory,
  type Category as Cat,
} from "@/lib/techniques";
import { TechniqueCard } from "@/components/TechniqueCard";

export function Category() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const cat = id && (id as Cat) in CATEGORIES ? CATEGORIES[id as Cat] : null;
  if (!cat) {
    return (
      <div className="p-6 text-center text-slate-600 dark:text-slate-400">
        <p>{t("category.notFound")}</p>
        <Link to="/library" className="text-teal-300 underline">
          {t("category.backToLibrary")}
        </Link>
      </div>
    );
  }
  const techniques = techniquesByCategory(cat.id);
  return (
    <div className="min-h-full safe-top safe-bottom px-5 pb-6 max-w-md mx-auto">
      <header className="pt-4 pb-5 flex items-center gap-3">
        <Link
          to="/library"
          aria-label={t("common.back")}
          className="p-2 -ml-2 rounded-full hover:bg-slate-900/[0.04] dark:hover:bg-white/5 text-slate-600 dark:text-slate-400"
        >
          ←
        </Link>
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500">
            {cat.emoji} {t(`categories.${cat.id}.tagline`, { defaultValue: cat.tagline })}
          </div>
          <h1 className="text-2xl font-light">
            {t(`categories.${cat.id}.title`, { defaultValue: cat.title })}
          </h1>
        </div>
      </header>

      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
        {t(`categories.${cat.id}.description`, { defaultValue: cat.description })}
      </p>

      <div className="flex flex-col gap-3">
        {techniques.map((tt) => (
          <TechniqueCard key={tt.id} t={tt} />
        ))}
      </div>
    </div>
  );
}
