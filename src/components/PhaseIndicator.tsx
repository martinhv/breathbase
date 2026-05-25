// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useTranslation } from "react-i18next";
import type { ExpandedPhase } from "@/hooks/useBreathSession";

type Props = {
  phase: ExpandedPhase;
  remainingMs: number;
};

export function PhaseIndicator({ phase, remainingMs }: Props) {
  const { t } = useTranslation();
  const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
  // The label and note in techniques.ts are English source strings; we look
  // them up in the phaseLabels / phaseNotes tables to get the localized form,
  // falling back to the original string when no translation exists.
  const label = t(`phaseLabels.${phase.label}`, { defaultValue: phase.label });
  const note = phase.meta?.note
    ? t(`phaseNotes.${phase.meta.note}`, { defaultValue: phase.meta.note })
    : null;
  return (
    <div className="flex flex-col items-center gap-1 text-center select-none">
      <div
        aria-hidden
        className="text-3xl sm:text-4xl font-light tracking-wide"
      >
        {label}
      </div>
      <div
        aria-hidden
        className="text-6xl sm:text-7xl font-extralight tabular-nums text-slate-900 dark:text-slate-100/90"
      >
        {seconds}
      </div>
      {note && (
        <div
          aria-hidden
          className="mt-1 text-sm text-slate-600 dark:text-slate-400/90 italic"
        >
          {note}
        </div>
      )}
      <div role="status" aria-live="polite" className="sr-only">
        {label}, {seconds} {t("common.secondsShort")}
      </div>
    </div>
  );
}
