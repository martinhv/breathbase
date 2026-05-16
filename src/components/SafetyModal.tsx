type Props = {
  open: boolean;
  notes: string[];
  techniqueName: string;
  onAcknowledge: () => void;
  onCancel: () => void;
};

export function SafetyModal({
  open,
  notes,
  techniqueName,
  onAcknowledge,
  onCancel,
}: Props) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="safety-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div className="w-full sm:max-w-md bg-ink-800 border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl safe-bottom">
        <h2 id="safety-title" className="text-xl font-medium mb-3">
          Before you begin — {techniqueName}
        </h2>
        <ul className="space-y-2 text-slate-300 text-sm list-disc pl-5">
          {notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-2xl border border-white/10 text-slate-200 hover:bg-white/5"
          >
            Not now
          </button>
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
