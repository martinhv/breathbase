// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  open: boolean;
  onAcknowledge: () => void;
  onClose?: () => void;
  required?: boolean;
};

export function DisclaimerModal({
  open,
  onAcknowledge,
  onClose,
  required,
}: Props) {
  const { t } = useTranslation();
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    if (open) setConsented(false);
  }, [open]);

  if (!open) return null;
  const canAcknowledge = !required || consented;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <div className="w-full sm:max-w-md bg-white dark:bg-ink-800 border border-slate-900/10 dark:border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl safe-bottom max-h-[85vh] overflow-y-auto">
        <h2 id="disclaimer-title" className="text-xl font-medium mb-3">
          {t("disclaimer.title")}
        </h2>
        <div className="space-y-3 text-slate-700 dark:text-slate-300 text-sm">
          <p>
            <strong>{t("disclaimer.notMedical")}</strong> {t("disclaimer.educational")}
          </p>
          <p>{t("disclaimer.stopIfDizzy")}</p>
          <p>{t("disclaimer.upregulateWater")}</p>
          <p>{t("disclaimer.consultPhysician")}</p>
        </div>

        {required && (
          <label className="mt-5 flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
              className="mt-0.5 w-5 h-5 accent-teal-400 shrink-0"
              aria-describedby="disclaimer-title"
            />
            <span className="text-sm text-slate-800 dark:text-slate-200 leading-snug">
              {t("disclaimer.consentLabel")}
            </span>
          </label>
        )}

        <div className="mt-6 flex gap-3">
          {!required && onClose && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-2xl border border-slate-900/10 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-slate-900/[0.04] dark:hover:bg-white/5"
            >
              {t("common.close")}
            </button>
          )}
          <button
            onClick={onAcknowledge}
            disabled={!canAcknowledge}
            className="flex-1 px-4 py-3 rounded-2xl bg-teal-400/90 text-ink-950 font-medium hover:bg-teal-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {required ? t("disclaimer.accept") : t("disclaimer.understand")}
          </button>
        </div>
      </div>
    </div>
  );
}
