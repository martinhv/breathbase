type Props = {
  open: boolean;
  onAcknowledge: () => void;
  onClose?: () => void;
  /** When true, acknowledgment is required (no dismiss button). */
  required?: boolean;
};

export function DisclaimerModal({
  open,
  onAcknowledge,
  onClose,
  required,
}: Props) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <div className="w-full sm:max-w-md bg-ink-800 border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl safe-bottom max-h-[85vh] overflow-y-auto">
        <h2 id="disclaimer-title" className="text-xl font-medium mb-3">
          A note on safety
        </h2>
        <div className="space-y-3 text-slate-300 text-sm">
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
        <div className="mt-6 flex gap-3">
          {!required && onClose && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-2xl border border-white/10 text-slate-200 hover:bg-white/5"
            >
              Close
            </button>
          )}
          <button
            onClick={onAcknowledge}
            className="flex-1 px-4 py-3 rounded-2xl bg-teal-400/90 text-ink-950 font-medium hover:bg-teal-300"
          >
            I understand
          </button>
        </div>
      </div>
    </div>
  );
}
