import { useState } from "react";
import type { Mood } from "@/lib/storage";

const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: -2, emoji: "😩", label: "Much worse" },
  { value: -1, emoji: "😟", label: "A bit worse" },
  { value: 0, emoji: "😐", label: "About the same" },
  { value: 1, emoji: "🙂", label: "A bit better" },
  { value: 2, emoji: "😊", label: "Much better" },
];

type Props = { onSubmit: (mood: Mood) => void; onSkip: () => void };

export function MoodCheckIn({ onSubmit, onSkip }: Props) {
  const [selected, setSelected] = useState<Mood | null>(null);
  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-xl font-light text-slate-200">How do you feel?</h2>
      <div className="grid grid-cols-5 gap-2">
        {MOODS.map((m) => (
          <button
            key={m.value}
            onClick={() => setSelected(m.value)}
            aria-label={m.label}
            aria-pressed={selected === m.value}
            className={`text-3xl sm:text-4xl p-3 rounded-2xl transition border ${
              selected === m.value
                ? "bg-teal-400/20 border-teal-400/60 scale-110"
                : "bg-white/5 border-white/10 hover:bg-white/10"
            }`}
          >
            {m.emoji}
          </button>
        ))}
      </div>
      <div className="flex gap-3 w-full">
        <button
          onClick={onSkip}
          className="flex-1 px-4 py-3 rounded-2xl border border-white/10 text-slate-300 hover:bg-white/5"
        >
          Skip
        </button>
        <button
          disabled={selected === null}
          onClick={() => selected !== null && onSubmit(selected)}
          className="flex-1 px-4 py-3 rounded-2xl bg-teal-400/90 text-ink-950 font-medium hover:bg-teal-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </div>
    </div>
  );
}
