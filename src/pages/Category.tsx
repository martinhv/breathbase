import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  CATEGORIES,
  techniquesByCategory,
  type Category as Cat,
  type Technique,
} from "@/lib/techniques";
import { useSettings } from "@/lib/settings";
import { useAudioEngine } from "@/hooks/useAudioEngine";

function TechniqueCard({ t }: { t: Technique }) {
  const { settings } = useSettings();
  const audio = useAudioEngine();
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const duration =
    settings.durationOverrides[t.id] ?? t.defaultDurationMin;

  return (
    <article className="p-4 rounded-2xl bg-white/5 border border-white/10">
      <header className="flex items-baseline justify-between gap-3 mb-2">
        <h3 className="text-lg font-medium text-slate-100">{t.name}</h3>
        <div className="text-xs text-slate-400 whitespace-nowrap">
          {duration} min
        </div>
      </header>
      <p className="text-sm text-slate-300 leading-relaxed">
        {t.shortDescription}
      </p>
      <p className="text-xs text-teal-300/80 mt-2 leading-relaxed italic">
        {t.scientificRationale}
      </p>
      {expanded && (
        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
          <span className="uppercase tracking-widest text-slate-300">
            Citation:{" "}
          </span>
          {t.citation}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/10 border border-white/10"
        >
          {expanded ? "Less" : "More"}
        </button>
        <button
          onClick={async () => {
            // CRITICAL: unlock() (which calls Tone.start internally) must run
            // inside a real user-gesture handler, not from a useEffect, or
            // Chrome's autoplay policy keeps the AudioContext suspended.
            // Doing it here ALSO builds the audio graph against a running
            // context, so the singleton is fully ready by the time Session
            // mounts and calls startMusic.
            await audio.unlock();
            navigate(`/session/${t.id}`);
          }}
          className="ml-auto px-5 py-2 rounded-xl bg-teal-400/90 text-ink-950 text-sm font-medium hover:bg-teal-300"
        >
          Begin
        </button>
      </div>
    </article>
  );
}

export function Category() {
  const { id } = useParams<{ id: string }>();
  const cat = id && (id as Cat) in CATEGORIES ? CATEGORIES[id as Cat] : null;
  if (!cat) {
    return (
      <div className="p-6 text-center text-slate-400">
        <p>Category not found.</p>
        <Link to="/" className="text-teal-300 underline">
          Back home
        </Link>
      </div>
    );
  }
  const techniques = techniquesByCategory(cat.id);
  return (
    <div className="min-h-full safe-top safe-bottom px-5 pb-6 max-w-md mx-auto">
      <header className="pt-4 pb-5 flex items-center gap-3">
        <Link
          to="/"
          aria-label="Back"
          className="p-2 -ml-2 rounded-full hover:bg-white/5 text-slate-400"
        >
          ←
        </Link>
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500">
            {cat.emoji} {cat.tagline}
          </div>
          <h1 className="text-2xl font-light">{cat.title}</h1>
        </div>
      </header>

      <p className="text-sm text-slate-400 leading-relaxed mb-5">
        {cat.description}
      </p>

      <div className="flex flex-col gap-3">
        {techniques.map((t) => (
          <TechniqueCard key={t.id} t={t} />
        ))}
      </div>
    </div>
  );
}
