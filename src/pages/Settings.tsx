// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useSettings } from "@/lib/settings";
import { useAuth } from "@/lib/auth";
import { useSpeech } from "@/hooks/useSpeech";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { DisclaimerModal } from "@/components/DisclaimerModal";
import { exportAllUserData, type Soundscape } from "@/lib/storage";
import { TECHNIQUES } from "@/lib/techniques";
import { VOICE_PROFILES } from "@/lib/voiceProfiles";
import { LICENSE_NAME, LICENSE_URL, SOURCE_URL } from "@/lib/about";
import { ANALYTICS_CONFIGURED, track } from "@/lib/analytics";
import {
  getPermission as getNotificationPermission,
  isSupported as notificationsSupported,
  requestPermission as requestNotificationPermission,
} from "@/lib/notifications";
import {
  detectTimezone,
  isPushAvailable,
  obtainPushToken,
  registerDevice,
  unregisterDevice,
} from "@/lib/push";

const SOUNDSCAPE_OPTIONS: {
  id: Soundscape;
  emoji: string;
  label: string;
  description: string;
}[] = [
  {
    id: "piano",
    emoji: "🎹",
    label: "Piano ensemble",
    description: "Salamander grand with strings, cello, pad, and bell.",
  },
  {
    id: "ocean",
    emoji: "🌊",
    label: "Ocean",
    description: "Slow wave-like swells of filtered noise.",
  },
  {
    id: "rain",
    emoji: "🌧️",
    label: "Rain",
    description: "Steady high-frequency wash. Even and enveloping.",
  },
  {
    id: "brown",
    emoji: "🟫",
    label: "Brown noise",
    description: "Deep, full-spectrum hum. Great for masking distractions.",
  },
  {
    id: "silent",
    emoji: "🔇",
    label: "Silent",
    description: "No bed at all — chimes and voice still fire on phase changes.",
  },
];

// -- shared subcomponents --------------------------------------------------

type ToggleProps = {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
};
const Toggle = ({ label, checked, onChange }: ToggleProps) => (
  <label className="flex items-center justify-between py-3">
    <span className="text-slate-800 dark:text-slate-200">{label}</span>
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition ${
        checked ? "bg-teal-400/80" : "bg-slate-900/10 dark:bg-white/15"
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
      <span className="text-slate-800 dark:text-slate-200">{label}</span>
      <span className="text-xs tabular-nums text-slate-600 dark:text-slate-400">
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

/**
 * Collapsible section using native <details>/<summary> for accessibility and
 * keyboard support out of the box. The summary row matches the card style of
 * inline sections so they don't visually compete.
 */
type CollapseProps = {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};
const Collapse = ({ title, hint, defaultOpen = false, children }: CollapseProps) => (
  <details
    className="group rounded-2xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 overflow-hidden"
    open={defaultOpen}
  >
    <summary className="list-none cursor-pointer select-none flex items-center justify-between px-4 py-3 hover:bg-slate-900/[0.04] dark:hover:bg-white/5">
      <div className="flex items-baseline gap-3">
        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{title}</span>
        {hint && (
          <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{hint}</span>
        )}
      </div>
      <span
        aria-hidden
        className="text-slate-600 dark:text-slate-400 text-sm transition-transform group-open:rotate-90"
      >
        ›
      </span>
    </summary>
    <div className="px-4 pb-2 border-t border-slate-900/5 dark:border-white/5">{children}</div>
  </details>
);

// -- page ------------------------------------------------------------------

export function Settings() {
  const { settings, update, reset } = useSettings();
  const { user, isGuest, canRegister, signOut, deleteAccount } = useAuth();
  const { preview } = useSpeech();
  const audio = useAudioEngine();
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [testing, setTesting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    () => getNotificationPermission(),
  );

  // Re-poll when the user toggles reminders on/off (in case browser dialog
  // updates permission via the prompt below).
  useEffect(() => {
    setNotifPermission(getNotificationPermission());
  }, [settings.reminderEnabled]);

  // Keep the device's reminder time in Firestore in sync when the user
  // edits it. The server function reads from Firestore each tick, so a
  // late write is enough — no need to re-prompt the user.
  useEffect(() => {
    if (!settings.reminderEnabled || !user || isGuest) return;
    if (!isPushAvailable()) return;
    if (notifPermission !== "granted") return;
    let cancelled = false;
    (async () => {
      const token = await obtainPushToken();
      if (cancelled || !token) return;
      await registerDevice(user.uid, {
        fcmToken: token,
        reminderTime: settings.reminderTime,
        reminderTimezone: detectTimezone(),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [
    settings.reminderEnabled,
    settings.reminderTime,
    user,
    isGuest,
    notifPermission,
  ]);

  const activeVoice = VOICE_PROFILES.find((v) => v.id === settings.voiceProfile);

  const runTest = async () => {
    setTesting(true);
    await audio.testSound();
    window.setTimeout(() => setTesting(false), 2500);
  };

  const exportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const data = await exportAllUserData(user.uid);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `sough-export-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Export failed:", e);
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const onDeleteAccount = async () => {
    if (!user) return;
    const message = isGuest
      ? "Clear all locally-stored settings and session history? This cannot be undone."
      : "Delete your account and all session history? This cannot be undone.";
    const ok = confirm(message);
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteAccount();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Delete failed:", e);
      alert(
        isGuest
          ? "Could not clear local data. Please try again."
          : "Account deletion failed. Please try again.",
      );
      setDeleting(false);
    }
  };

  const onSignUpFromGuest = () => {
    const ok = confirm(
      "Sign up to sync your settings and history across devices. " +
        "Your existing data will be carried over to the new account. Continue?",
    );
    if (!ok) return;
    track("guest_sign_up_intent");
    void signOut();
  };

  return (
    <div className="min-h-full safe-top safe-bottom px-5 pb-8 max-w-md mx-auto">
      <header className="pt-4 pb-5 flex items-center gap-3">
        <Link
          to="/"
          aria-label="Back"
          className="p-2 -ml-2 rounded-full hover:bg-slate-900/[0.04] dark:hover:bg-white/5 text-slate-600 dark:text-slate-400"
        >
          ←
        </Link>
        <h1 className="text-2xl font-light">Settings</h1>
      </header>

      {/* -- Account: small, always visible. Data ops hidden behind a collapse. */}
      {user && (
        <section className="mb-4">
          <div className="rounded-2xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 p-4 flex items-center gap-3">
            {!isGuest && user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-900/5 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300">
                {isGuest
                  ? "👤"
                  : (user.displayName ?? user.email ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {isGuest ? (
                <div className="text-sm text-slate-800 dark:text-slate-200 truncate">
                  Guest mode
                </div>
              ) : (
                user.displayName && (
                  <div className="text-sm text-slate-800 dark:text-slate-200 truncate">
                    {user.displayName}
                  </div>
                )
              )}
              <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                {isGuest ? "Data stays on this device" : user.email}
              </div>
            </div>
            {!isGuest && (
              <button
                onClick={() => {
                  if (confirm("Sign out?")) void signOut();
                }}
                className="px-3 py-2 rounded-lg border border-slate-900/10 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-900/[0.04] dark:hover:bg-white/5"
              >
                Sign out
              </button>
            )}
          </div>

          {/* Guests who CAN register: encourage syncing across devices. */}
          {isGuest && canRegister && (
            <button
              onClick={onSignUpFromGuest}
              className="w-full mt-2 px-4 py-3 rounded-2xl bg-teal-400/90 text-ink-950 text-sm font-medium hover:bg-teal-300 flex items-center justify-between"
            >
              <span>Sign up to sync across devices</span>
              <span aria-hidden>→</span>
            </button>
          )}
        </section>
      )}

      <div className="flex flex-col gap-3">
        {/* -- Guidance: voice on/off lives here visible; details collapse. */}
        <section className="rounded-2xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 px-4 divide-y divide-white/5">
          <Toggle
            label="Voice prompts"
            checked={settings.voiceEnabled}
            onChange={(v) => update({ voiceEnabled: v })}
          />
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
        </section>

        {settings.musicEnabled && (
          <Collapse
            title="Soundscape"
            hint={SOUNDSCAPE_OPTIONS.find((s) => s.id === settings.soundscape)?.label.toLowerCase()}
          >
            <div
              role="radiogroup"
              aria-label="Soundscape"
              className="py-3 flex flex-col gap-2"
            >
              {SOUNDSCAPE_OPTIONS.map((s) => {
                const active = settings.soundscape === s.id;
                return (
                  <button
                    key={s.id}
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      update({ soundscape: s.id });
                      track("soundscape_changed", { soundscape: s.id });
                    }}
                    className={`flex items-start gap-3 px-3 py-2 rounded-xl border transition text-left ${
                      active
                        ? "bg-teal-400/10 border-teal-400/40"
                        : "border-slate-900/10 dark:border-white/10 hover:bg-slate-900/[0.04] dark:hover:bg-white/5"
                    }`}
                  >
                    <div className="text-2xl" aria-hidden>{s.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-800 dark:text-slate-200">
                        {s.label}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                        {s.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Collapse>
        )}

        {settings.voiceEnabled && (
          <Collapse
            title="Voice"
            hint={activeVoice ? `${activeVoice.name} · ${activeVoice.description.split(" · ")[1] ?? activeVoice.description}` : undefined}
          >
            <Toggle
              label="Count down remaining seconds"
              checked={settings.countdownEnabled}
              onChange={(v) => update({ countdownEnabled: v })}
            />
            <div
              role="radiogroup"
              aria-label="Voice"
              className="py-3 flex flex-col gap-2"
            >
              {VOICE_PROFILES.map((v) => {
                const active = settings.voiceProfile === v.id;
                return (
                  <div
                    key={v.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition ${
                      active
                        ? "bg-teal-400/10 border-teal-400/40"
                        : "border-slate-900/10 dark:border-white/10 hover:bg-slate-900/[0.04] dark:hover:bg-white/5"
                    }`}
                  >
                    <button
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        update({ voiceProfile: v.id });
                        track("voice_changed", { voiceProfile: v.id });
                      }}
                      className="flex-1 text-left"
                    >
                      <div className="text-sm text-slate-800 dark:text-slate-200">{v.name}</div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                        {v.description}
                      </div>
                    </button>
                    <button
                      onClick={() => preview(v.id)}
                      aria-label={`Preview ${v.name}`}
                      className="px-3 py-1 rounded-lg border border-slate-900/10 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/10"
                    >
                      Play
                    </button>
                  </div>
                );
              })}
            </div>
          </Collapse>
        )}

        <Collapse title="Volume" hint={`Master ${Math.round(settings.masterVolume * 100)}%`}>
          <div className="divide-y divide-white/5">
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
        </Collapse>

        <Collapse title="Per-technique durations">
          <div className="divide-y divide-white/5">
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
        </Collapse>

        <Collapse
          title="Reminders"
          hint={
            settings.reminderEnabled
              ? `daily · ${settings.reminderTime}`
              : "off"
          }
        >
          <div className="divide-y divide-slate-900/5 dark:divide-white/5">
            <Toggle
              label="Daily practice reminder"
              checked={settings.reminderEnabled}
              onChange={async (v) => {
                if (v) {
                  const result = await requestNotificationPermission();
                  setNotifPermission(result);
                  if (result !== "granted") {
                    // Don't enable if the user denied or the browser blocked.
                    return;
                  }
                  // If push is configured (VAPID + production Firebase),
                  // register an FCM token for server-side delivery.
                  if (isPushAvailable() && user) {
                    const token = await obtainPushToken();
                    if (token) {
                      await registerDevice(user.uid, {
                        fcmToken: token,
                        reminderTime: settings.reminderTime,
                        reminderTimezone: detectTimezone(),
                      });
                    }
                  }
                } else if (isPushAvailable() && user) {
                  // Best-effort cleanup of any prior FCM registration.
                  const token = await obtainPushToken();
                  if (token) await unregisterDevice(user.uid, token);
                }
                update({ reminderEnabled: v });
                track("reminder_toggled", { enabled: v });
              }}
            />
            {settings.reminderEnabled && (
              <label className="flex items-center justify-between py-3">
                <span className="text-slate-800 dark:text-slate-200">Time</span>
                <input
                  type="time"
                  value={settings.reminderTime}
                  onChange={(e) =>
                    update({ reminderTime: e.target.value || "08:00" })
                  }
                  className="bg-slate-100 dark:bg-ink-700 border border-slate-900/10 dark:border-white/10 rounded-lg px-2 py-1 text-sm text-slate-800 dark:text-slate-200 tabular-nums"
                />
              </label>
            )}
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed py-3">
              {!notificationsSupported()
                ? "Notifications aren't available in this browser."
                : notifPermission === "denied"
                  ? "Notifications are blocked. Enable them for sough.app in your browser settings, then re-enable here."
                  : isPushAvailable()
                    ? "Reminders are delivered via Firebase Cloud Messaging — they fire even when Sough is closed."
                    : "Reminders fire only while Sough is open in a tab. Set VITE_FIREBASE_VAPID_KEY and deploy the reminder Cloud Function for background push (see README)."}
            </p>
          </div>
        </Collapse>

        <Collapse
          title="Display"
          hint={`${settings.theme} · motion ${settings.reducedMotion}`}
        >
          <div className="divide-y divide-slate-900/5 dark:divide-white/5">
            <label className="flex items-center justify-between py-3">
              <span className="text-slate-800 dark:text-slate-200">Theme</span>
              <select
                value={settings.theme}
                onChange={(e) =>
                  update({
                    theme: e.target.value as "auto" | "light" | "dark",
                  })
                }
                className="bg-slate-100 dark:bg-ink-700 border border-slate-900/10 dark:border-white/10 rounded-lg px-2 py-1 text-sm text-slate-800 dark:text-slate-200"
              >
                <option value="auto">Auto (follow system)</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label className="flex items-center justify-between py-3">
              <span className="text-slate-800 dark:text-slate-200">
                Reduce motion
              </span>
              <select
                value={settings.reducedMotion}
                onChange={(e) =>
                  update({
                    reducedMotion: e.target.value as "auto" | "on" | "off",
                  })
                }
                className="bg-slate-100 dark:bg-ink-700 border border-slate-900/10 dark:border-white/10 rounded-lg px-2 py-1 text-sm text-slate-800 dark:text-slate-200"
              >
                <option value="auto">Auto (follow system)</option>
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </label>
          </div>
        </Collapse>

        <Collapse title="Test sound">
          <div className="py-3">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
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
        </Collapse>

        {ANALYTICS_CONFIGURED && (
          <Collapse
            title="Privacy"
            hint={settings.analyticsEnabled ? "analytics on" : "analytics off"}
          >
            <div className="divide-y divide-slate-900/5 dark:divide-white/5">
              <Toggle
                label="Help improve Sough (anonymous usage)"
                checked={settings.analyticsEnabled}
                onChange={(v) => update({ analyticsEnabled: v })}
              />
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed py-3">
                Self-hosted, cookieless. Sends page views, session completions
                by technique, and which soundscape / voice / program you pick.
                No personal data, no third-party trackers — see the source for
                the full event list.
              </p>
            </div>
          </Collapse>
        )}

        {user && (
          <Collapse title="Data & account">
            <div className="divide-y divide-white/5">
              <button
                onClick={exportData}
                disabled={exporting}
                className="w-full flex items-center justify-between py-3 text-sm text-slate-800 dark:text-slate-200 hover:opacity-90 disabled:opacity-50"
              >
                <span>Export my data (JSON)</span>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {exporting ? "Preparing…" : "Download"}
                </span>
              </button>
              <button
                onClick={onDeleteAccount}
                disabled={deleting}
                className="w-full flex items-center justify-between py-3 text-sm text-red-300/90 hover:opacity-90 disabled:opacity-50"
              >
                <span>
                  {isGuest ? "Clear local data" : "Delete account and all data"}
                </span>
                <span className="text-xs text-red-300/70">
                  {deleting ? "Deleting…" : "Permanent"}
                </span>
              </button>
            </div>
          </Collapse>
        )}
      </div>

      <section className="flex flex-col gap-2 mt-6 mb-6">
        <button
          onClick={() => setShowDisclaimer(true)}
          className="px-4 py-3 rounded-2xl border border-slate-900/10 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-900/[0.04] dark:hover:bg-white/5 text-sm"
        >
          View safety disclaimer
        </button>
        <button
          onClick={() => {
            if (confirm("Reset all settings to defaults?")) reset();
          }}
          className="px-4 py-3 rounded-2xl border border-slate-900/10 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-900/[0.04] dark:hover:bg-white/5 text-sm"
        >
          Reset settings
        </button>
      </section>

      <footer className="text-center text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed pt-2 pb-4">
        <a
          href={SOURCE_URL}
          target="_blank"
          rel="noreferrer"
          className="underline-offset-2 hover:underline"
        >
          Source code
        </a>
        {" · "}
        <a
          href={LICENSE_URL}
          target="_blank"
          rel="noreferrer"
          className="underline-offset-2 hover:underline"
        >
          {LICENSE_NAME}
        </a>
        {" · "}
        <Link to="/impressum" className="underline-offset-2 hover:underline">
          Impressum
        </Link>
        {" · "}
        <Link to="/privacy" className="underline-offset-2 hover:underline">
          Privacy
        </Link>
      </footer>

      <DisclaimerModal
        open={showDisclaimer}
        onAcknowledge={() => setShowDisclaimer(false)}
        onClose={() => setShowDisclaimer(false)}
      />
    </div>
  );
}