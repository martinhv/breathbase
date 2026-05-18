// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onAcknowledge: () => void;
  onClose?: () => void;
  /**
   * When true, acknowledgment is required: the dialog can't be dismissed,
   * and the user must explicitly check the consent box before the
   * acknowledge button enables.
   */
  required?: boolean;
};

export function DisclaimerModal({
  open,
  onAcknowledge,
  onClose,
  required,
}: Props) {
  const [consented, setConsented] = useState(false);

  // Reset the checkbox each time the modal opens so a previously-checked
  // state doesn't auto-accept a reopened modal.
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
          A note on safety
        </h2>
        <div className="space-y-3 text-slate-700 dark:text-slate-300 text-sm">
          <p>
            <strong>BreathBase is not medical advice.</strong> It is an
            educational tool to support a personal breathwork practice.
          </p>
          <p>
            Stop immediately if you feel dizzy or lightheaded. Sit or lie down
            until the sensation passes.
          </p>
          <p>
            Upregulating techniques (cyclic hyperventilation, bellows breath)
            should <strong>never</strong> be done in or near water, while
            driving, or while operating machinery — fainting can occur.
          </p>
          <p>
            Consult a physician before practicing if you are pregnant, or if
            you have cardiovascular, respiratory, or psychiatric conditions,
            or a history of seizures.
          </p>
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
              I have read and understood the safety information above. I
              accept that BreathBase is an educational tool, not medical
              advice, and I practice at my own risk.
            </span>
          </label>
        )}

        <div className="mt-6 flex gap-3">
          {!required && onClose && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-2xl border border-slate-900/10 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-slate-900/[0.04] dark:hover:bg-white/5"
            >
              Close
            </button>
          )}
          <button
            onClick={onAcknowledge}
            disabled={!canAcknowledge}
            className="flex-1 px-4 py-3 rounded-2xl bg-teal-400/90 text-ink-950 font-medium hover:bg-teal-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {required ? "I accept" : "I understand"}
          </button>
        </div>
      </div>
    </div>
  );
}