// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

type Props = {
  open: boolean;
  notes: string[];
  techniqueName: string;
  recommendFoundation?: boolean;
  onAcknowledge: () => void;
  onCancel: () => void;
};

export function SafetyModal({
  open,
  notes,
  techniqueName,
  recommendFoundation = false,
  onAcknowledge,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="safety-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div className="w-full sm:max-w-md bg-white dark:bg-ink-800 border border-slate-900/10 dark:border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl safe-bottom">
        <h2 id="safety-title" className="text-xl font-medium mb-3">
          {t("safetyModal.beforeBegin", { name: techniqueName })}
        </h2>
        {recommendFoundation && (
          <div className="mb-4 rounded-2xl bg-teal-400/10 border border-teal-400/30 px-4 py-3">
            <p className="text-sm text-slate-800 dark:text-slate-100">
              <strong className="font-medium">{t("safetyModal.newHere")}</strong>{" "}
              {t("safetyModal.newHereActivating")}
            </p>
            <Link
              to="/session/box-breathing"
              replace
              className="mt-2 inline-flex items-center gap-1 text-sm text-teal-300 hover:text-teal-200 underline-offset-2 hover:underline"
            >
              {t("safetyModal.tryBoxFirst")}
            </Link>
          </div>
        )}
        <ul className="space-y-2 text-slate-700 dark:text-slate-300 text-sm list-disc pl-5">
          {notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-900/10 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-slate-900/[0.04] dark:hover:bg-white/5"
          >
            {t("safetyModal.notNow")}
          </button>
          <button
            onClick={onAcknowledge}
            className="flex-1 px-4 py-3 rounded-2xl bg-teal-400/90 text-ink-950 font-medium hover:bg-teal-300"
          >
            {t("safetyModal.understand")}
          </button>
        </div>
      </div>
    </div>
  );
}
