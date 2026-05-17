import { Link, useParams } from "react-router-dom";
import { THEMES, type ThemeId } from "@/lib/themes";
import { findTechnique } from "@/lib/techniques";
import { TechniqueCard } from "@/components/TechniqueCard";

export function Theme() {
  const { id } = useParams<{ id: string }>();
  const theme = id && (id as ThemeId) in THEMES ? THEMES[id as ThemeId] : null;
  if (!theme) {
    return (
      <div className="p-6 text-center text-slate-600 dark:text-slate-400 safe-top safe-bottom">
        <p>Theme not found.</p>
        <Link to="/" className="text-teal-300 underline">
          Back home
        </Link>
      </div>
    );
  }
  const techniques = theme.techniqueIds
    .map((tid) => findTechnique(tid))
    .filter((t): t is NonNullable<typeof t> => !!t);

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
            {theme.emoji} {theme.tagline}
          </div>
          <h1 className="text-2xl font-light">{theme.name}</h1>
        </div>
      </header>

      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
        {theme.description}
      </p>

      <div className="flex flex-col gap-3">
        {techniques.map((t) => (
          <TechniqueCard key={t.id} t={t} />
        ))}
      </div>
    </div>
  );
}
