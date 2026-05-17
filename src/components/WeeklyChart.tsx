import { useMemo } from "react";
import { CATEGORIES, type Category } from "@/lib/techniques";
import type { SessionEntry } from "@/lib/storage";

const CATEGORY_FILL: Record<Category, string> = {
  downregulate: "bg-blue-400/80",
  upregulate: "bg-amber-400/80",
  balance: "bg-teal-400/80",
  focus: "bg-violet-400/80",
};

const CATEGORY_ORDER_BOTTOM_UP: Category[] = [
  // Bottom of stack is drawn first; the order here is purely cosmetic so
  // related categories visually group from the ground up.
  "downregulate",
  "balance",
  "focus",
  "upregulate",
];

type Day = {
  date: Date;
  key: string;
  /** Minutes per category for this day. */
  segments: Record<Category, number>;
};

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function buildDays(history: SessionEntry[], windowDays = 14): Day[] {
  const out: Day[] = [];
  const now = new Date();
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    out.push({
      date: d,
      key: dayKey(d),
      segments: { downregulate: 0, upregulate: 0, balance: 0, focus: 0 },
    });
  }
  const byKey = new Map(out.map((d) => [d.key, d]));
  for (const e of history) {
    const day = byKey.get(dayKey(new Date(e.startedAt)));
    if (!day) continue;
    const cat = e.category as Category;
    if (cat in day.segments) {
      day.segments[cat] += e.durationMs / 60_000;
    }
  }
  return out;
}

/** Single-letter weekday: S M T W T F S. */
function weekdayLetter(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "narrow" });
}

export function WeeklyChart({ history }: { history: SessionEntry[] }) {
  const days = useMemo(() => buildDays(history), [history]);
  const max = useMemo(
    () =>
      Math.max(
        1,
        ...days.map((d) =>
          Object.values(d.segments).reduce((a, b) => a + b, 0),
        ),
      ),
    [days],
  );
  const today = days[days.length - 1].key;
  const hasAny = days.some((d) =>
    Object.values(d.segments).some((m) => m > 0),
  );

  return (
    <section
      aria-label="Last 14 days"
      className="p-4 rounded-2xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 mb-6"
    >
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400">
          Last 14 days
        </div>
        <div className="text-[10px] text-slate-500 tabular-nums">
          peak {Math.round(max)}m
        </div>
      </div>

      <div className="flex items-end gap-1 h-24 mb-1">
        {days.map((d) => {
          const total = Object.values(d.segments).reduce((a, b) => a + b, 0);
          const heightPct = total > 0 ? Math.max(4, (total / max) * 100) : 0;
          const isToday = d.key === today;
          return (
            <div
              key={d.key}
              className="flex-1 flex flex-col justify-end h-full min-w-0"
              title={`${d.date.toLocaleDateString()} · ${Math.round(total)}m`}
            >
              <div
                className={`w-full flex flex-col rounded-sm overflow-hidden ${
                  isToday ? "ring-1 ring-teal-400/60" : ""
                }`}
                style={{ height: `${heightPct}%` }}
              >
                {CATEGORY_ORDER_BOTTOM_UP.map((c) =>
                  d.segments[c] > 0 ? (
                    <div
                      key={c}
                      className={CATEGORY_FILL[c]}
                      style={{ flex: d.segments[c] }}
                    />
                  ) : null,
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-1 mb-3">
        {days.map((d) => (
          <div
            key={d.key}
            className="flex-1 text-center text-[10px] text-slate-600 dark:text-slate-400 min-w-0"
          >
            {weekdayLetter(d.date)}
          </div>
        ))}
      </div>

      {hasAny ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-600 dark:text-slate-400">
          {(Object.keys(CATEGORIES) as Category[]).map((c) => (
            <div key={c} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={`inline-block w-2 h-2 rounded-sm ${CATEGORY_FILL[c]}`}
              />
              <span>{CATEGORIES[c].title}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
          No sessions in the last two weeks yet.
        </p>
      )}
    </section>
  );
}
