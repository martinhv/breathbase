import { Link } from "react-router-dom";
import { CategoryCard } from "@/components/CategoryCard";
import { CATEGORIES, CATEGORY_ORDER } from "@/lib/techniques";

export function Library() {
  return (
    <div className="min-h-full safe-top safe-bottom px-5 pb-6 max-w-md mx-auto">
      <header className="pt-4 pb-5 flex items-center gap-3">
        <Link
          to="/"
          aria-label="Back"
          className="p-2 -ml-2 rounded-full hover:bg-slate-900/[0.04] dark:hover:bg-white/5 text-slate-600 dark:text-slate-400"
        >
          ←
        </Link>
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500">
            📚 Library
          </div>
          <h1 className="text-2xl font-light">Browse by category</h1>
        </div>
      </header>

      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
        Every technique grouped by physiology — the way breathwork affects
        the autonomic nervous system. Themes on the home screen group the
        same techniques by goal instead.
      </p>

      <section aria-label="Categories" className="grid grid-cols-2 gap-3">
        {CATEGORY_ORDER.map((id) => (
          <CategoryCard key={id} meta={CATEGORIES[id]} />
        ))}
      </section>
    </div>
  );
}
