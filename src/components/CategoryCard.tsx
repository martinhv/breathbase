import { Link } from "react-router-dom";
import type { CategoryMeta } from "@/lib/techniques";

type Props = { meta: CategoryMeta };

export function CategoryCard({ meta }: Props) {
  return (
    <Link
      to={`/category/${meta.id}`}
      className="group flex flex-col justify-between aspect-square p-5 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 active:bg-white/15 transition shadow-lg"
    >
      <div className="text-4xl">{meta.emoji}</div>
      <div>
        <div className="text-lg font-medium text-slate-100">{meta.title}</div>
        <div className="text-xs text-slate-400 mt-1 leading-snug">
          {meta.tagline}
        </div>
      </div>
    </Link>
  );
}
