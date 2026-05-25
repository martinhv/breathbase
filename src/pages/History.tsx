// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  computeStreak,
  totalMinutes,
  type SessionEntry,
} from "@/lib/storage";
import { useHistory } from "@/lib/history";
import { CATEGORIES, type Category } from "@/lib/techniques";
import { WeeklyChart } from "@/components/WeeklyChart";

type Filter = "all" | Category;

function groupByDay(history: SessionEntry[], locale: string): Array<[string, SessionEntry[]]> {
  const groups = new Map<string, SessionEntry[]>();
  for (const e of history) {
    const day = new Date(e.startedAt).toLocaleDateString(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const list = groups.get(day) ?? [];
    list.push(e);
    groups.set(day, list);
  }
  return Array.from(groups.entries());
}

export function History() {
  const { t, i18n } = useTranslation();
  const { history, loading } = useHistory();
  const [filter, setFilter] = useState<Filter>("all");

  const allCategories: Filter[] = ["all", "downregulate", "upregulate", "balance", "focus"];

  const filtered = history.filter(
    (e) => filter === "all" || e.category === filter,
  );
  const streak = computeStreak(history);
  const minutes = totalMinutes(history);
  const sessions = history.length;
  const grouped = groupByDay(filtered, i18n.language);

  return (
    <div className="min-h-full safe-top safe-bottom px-5 pb-8 max-w-md mx-auto">
      <header className="pt-4 pb-5 flex items-center gap-3">
        <Link
          to="/"
          aria-label={t("common.back")}
          className="p-2 -ml-2 rounded-full hover:bg-slate-900/[0.04] dark:hover:bg-white/5 text-slate-600 dark:text-slate-400"
        >
          ←
        </Link>
        <h1 className="text-2xl font-light">{t("history.title")}</h1>
      </header>

      <section className="grid grid-cols-3 gap-3 text-center mb-6">
        <div className="p-3 rounded-2xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10">
          <div className="text-2xl font-light tabular-nums">{streak}</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-400 mt-1">
            {t("history.dayStreak")}
          </div>
        </div>
        <div className="p-3 rounded-2xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10">
          <div className="text-2xl font-light tabular-nums">{minutes}</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-400 mt-1">
            {t("history.minutes")}
          </div>
        </div>
        <div className="p-3 rounded-2xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10">
          <div className="text-2xl font-light tabular-nums">{sessions}</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-400 mt-1">
            {t("history.sessions")}
          </div>
        </div>
      </section>

      <WeeklyChart history={history} />

      <section
        className="flex items-center gap-1.5 flex-wrap mb-4"
        role="radiogroup"
        aria-label={t("history.title")}
      >
        {allCategories.map((c) => {
          const active = filter === c;
          const label =
            c === "all"
              ? t("history.filterAll")
              : t(`categories.${c}.title`, { defaultValue: CATEGORIES[c].title });
          return (
            <button
              key={c}
              role="radio"
              aria-checked={active}
              onClick={() => setFilter(c)}
              className={`px-3 py-1 rounded-lg text-xs transition ${
                active
                  ? "bg-teal-400/90 text-ink-950 font-medium"
                  : "border border-slate-900/10 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          );
        })}
      </section>

      {loading ? (
        <p className="text-slate-600 dark:text-slate-400 text-sm">{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          {filter === "all"
            ? t("history.noSessionsYet")
            : t("history.noSessionsCategory", {
                category: t(`categories.${filter as Category}.title`, {
                  defaultValue: CATEGORIES[filter as Category].title,
                }),
              })}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map(([day, entries]) => (
            <div key={day}>
              <h2 className="text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-2">
                {day}
              </h2>
              <div className="rounded-2xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 divide-y divide-white/5">
                {entries.map((h) => (
                  <div
                    key={h.id ?? h.startedAt}
                    className="flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <div>
                      <div className="text-slate-800 dark:text-slate-200">{h.techniqueName}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {new Date(h.startedAt).toLocaleTimeString(i18n.language, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" · "}
                        <span>
                          {t(`categories.${h.category as Category}.title`, {
                            defaultValue: h.category,
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-300 tabular-nums">
                      {Math.round(h.durationMs / 60000)}m
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
