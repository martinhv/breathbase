import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSettings } from "@/lib/settings";
import { useAuth } from "@/lib/auth";
import { useSpeech } from "@/hooks/useSpeech";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { DisclaimerModal } from "@/components/DisclaimerModal";
import {
  loadHistory,
  type SessionEntry,
} from "@/lib/storage";
import { TECHNIQUES } from "@/lib/techniques";

type ToggleProps = {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
};
const Toggle = ({ label, checked, onChange }: ToggleProps) => (
  <label className="flex items-center justify-between py-3">
    <span className="text-slate-200">{label}</span>
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition ${
        checked ? "bg-teal-400/80" : "bg-white/15"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  </label>
);

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
};
const Slider = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
}: SliderProps) => (
  <label className="flex flex-col py-3 gap-2">
    <div className="flex items-baseline justify-between">
      <span className="text-slate-200">{label}</span>
      <span className="text-xs tabular-nums text-slate-400">
        {format ? format(value) : value}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="accent-teal-400"
    />
  </label>
);

export function Settings() {
  const { settings, update, reset } = useSettings();
  const { user, signOut } = useAuth();
  const { voices, preferredVoice, preview } = useSpeech();
  const audio = useAudioEngine();
  const [history, setHistory] = useState<SessionEntry[]>([]);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    loadHistory(user.uid)
      .then((h) => {
        if (!cancelled) setHistory(h.slice(0, 30));
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error("Failed to load history:", e);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const runTest = async () => {
    setTesting(true);
    await audio.testSound();
    // testSound's chord plays for ~2.2s; let the button reflect that.
    window.setTimeout(() => setTesting(false), 2500);
  };

  return (
    <div className="min-h-full safe-top safe-bottom px-5 pb-8 max-w-md mx-auto">
      <header className="pt-4 pb-5 flex items-center gap-3">
        <Link
          to="/"
          aria-label="Back"
          className="p-2 -ml-2 rounded-full hover:bg-white/5 text-slate-400"
        >
          ←
        </Link>
        <h1 className="text-2xl font-light">Settings</h1>
      </header>

      {user && (
        <section className="mb-6">
          <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-1">
            Account
          </h2>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center gap-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-slate-300">
                {(user.displayName ?? user.email ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {user.displayName && (
                <div className="text-sm text-slate-200 truncate">
                  {user.displayName}
                </div>
              )}
              <div className="text-xs text-slate-400 truncate">
                {user.email}
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm("Sign out?")) void signOut();
              }}
              className="px-3 py-2 rounded-lg border border-white/10 text-xs text-slate-300 hover:bg-white/5"
            >
              Sign out
            </button>
          </div>
        </section>
      )}

      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-1">
          Guidance
        </h2>
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 divide-y divide-white/5">
          <Toggle
            label="Voice prompts"
            checked={settings.voiceEnabled}
            onChange={(v) => update({ voiceEnabled: v })}
          />
          {settings.voiceEnabled && voices.length > 0 && (
            <div className="py-3 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-200">Voice</span>
                <div className="flex items-center gap-2">
                  <select
                    value={settings.voiceURI ?? ""}
                    onChange={(e) =>
                      update({ voiceURI: e.target.value || null })
                    }
                    className="bg-ink-700 border border-white/10 rounded-lg px-2 py-1 text-sm text-slate-200 max-w-[45vw]"
                  >
                    <option value="">
                      Auto
                      {preferredVoice ? ` — ${preferredVoice.name}` : ""}
                    </option>
                    {voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => preview(settings.voiceURI ?? null)}
                    aria-label="Preview voice"
                    className="px-3 py-1 rounded-lg border border-white/10 text-xs text-slate-300 hover:bg-white/10"
                  >
                    Preview
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                "Auto" picks the most natural-sounding voice your browser
                offers. On Linux Chrome that may still be eSpeak; installing
                Microsoft Edge or a Chrome voice extension adds higher-quality
                voices system-wide.
              </p>
            </div>
          )}
          <Toggle
            label="Background music"
            checked={settings.musicEnabled}
            onChange={(v) => update({ musicEnabled: v })}
          />
          <Toggle
            label="Chimes"
            checked={settings.chimesEnabled}
            onChange={(v) => update({ chimesEnabled: v })}
          />
          <Toggle
            label="Haptics"
            checked={settings.hapticsEnabled}
            onChange={(v) => update({ hapticsEnabled: v })}
          />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-1">
          Test
        </h2>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <p className="text-xs text-slate-400 mb-3">
            Tap below to hear a sample chime and chord. If you hear nothing,
            check your system volume and that no other app is muting the tab.
          </p>
          <button
            onClick={runTest}
            disabled={testing}
            className="w-full px-4 py-3 rounded-2xl bg-teal-400/90 text-ink-950 font-medium hover:bg-teal-300 disabled:opacity-60"
          >
            {testing ? "Playing test sound…" : "Test sound"}
          </button>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-1">
          Volume
        </h2>
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 divide-y divide-white/5">
          <Slider
            label="Master"
            value={Math.round(settings.masterVolume * 100)}
            min={0}
            max={100}
            onChange={(v) => update({ masterVolume: v / 100 })}
            format={(v) => `${v}%`}
          />
          <Slider
            label="Music"
            value={Math.round(settings.musicVolume * 100)}
            min={0}
            max={100}
            onChange={(v) => update({ musicVolume: v / 100 })}
            format={(v) => `${v}%`}
          />
          <Slider
            label="Chimes"
            value={Math.round(settings.chimeVolume * 100)}
            min={0}
            max={100}
            onChange={(v) => update({ chimeVolume: v / 100 })}
            format={(v) => `${v}%`}
          />
          <Slider
            label="Voice"
            value={Math.round(settings.voiceVolume * 100)}
            min={0}
            max={100}
            onChange={(v) => update({ voiceVolume: v / 100 })}
            format={(v) => `${v}%`}
          />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-1">
          Durations
        </h2>
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 divide-y divide-white/5">
          {TECHNIQUES.map((t) => {
            const current =
              settings.durationOverrides[t.id] ?? t.defaultDurationMin;
            return (
              <Slider
                key={t.id}
                label={t.name}
                value={current}
                min={t.durationRangeMin[0]}
                max={t.durationRangeMin[1]}
                onChange={(v) =>
                  update({
                    durationOverrides: {
                      ...settings.durationOverrides,
                      [t.id]: v,
                    },
                  })
                }
                format={(v) => `${v} min`}
              />
            );
          })}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-1">
          Display
        </h2>
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 divide-y divide-white/5">
          <label className="flex items-center justify-between py-3">
            <span className="text-slate-200">Reduce motion</span>
            <select
              value={settings.reducedMotion}
              onChange={(e) =>
                update({
                  reducedMotion: e.target.value as
                    | "auto"
                    | "on"
                    | "off",
                })
              }
              className="bg-ink-700 border border-white/10 rounded-lg px-2 py-1 text-sm text-slate-200"
            >
              <option value="auto">Auto (follow system)</option>
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </label>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-2">
          Recent practice
        </h2>
        <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5">
          {history.length === 0 ? (
            <div className="p-4 text-sm text-slate-400">No sessions yet.</div>
          ) : (
            history.map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <div>
                  <div className="text-slate-200">{h.techniqueName}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(h.startedAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs text-slate-400 tabular-nums">
                  {Math.round(h.durationMs / 60000)}m
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2 mb-6">
        <button
          onClick={() => setShowDisclaimer(true)}
          className="px-4 py-3 rounded-2xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm"
        >
          View safety disclaimer
        </button>
        <button
          onClick={() => {
            if (confirm("Reset all settings to defaults?")) reset();
          }}
          className="px-4 py-3 rounded-2xl border border-white/10 text-slate-400 hover:bg-white/5 text-sm"
        >
          Reset settings
        </button>
      </section>

      <DisclaimerModal
        open={showDisclaimer}
        onAcknowledge={() => setShowDisclaimer(false)}
        onClose={() => setShowDisclaimer(false)}
      />
    </div>
  );
}
