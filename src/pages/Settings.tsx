// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSettings } from "@/lib/settings";
import { useAuth } from "@/lib/auth";
import { useSpeech } from "@/hooks/useSpeech";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { DisclaimerModal } from "@/components/DisclaimerModal";
import { exportAllUserData, type Soundscape } from "@/lib/storage";
import { TECHNIQUES } from "@/lib/techniques";
import { voiceProfilesForLanguage } from "@/lib/voiceProfiles";
import { LICENSE_NAME, LICENSE_URL, SOURCE_URL } from "@/lib/about";
import { ANALYTICS_CONFIGURED, track } from "@/lib/analytics";
import { LANGUAGE_OPTIONS, type LanguagePref } from "@/lib/i18n";
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

function useSoundscapeOptions(): {
  id: Soundscape;
  emoji: string;
  label: string;
  description: string;
}[] {
  // Keyed inline so adding a soundscape doesn't require a new translation
  // table — labels are hand-translated below.
  const { t, i18n } = useTranslation();
  const isDe = i18n.language.startsWith("de");
  if (isDe) {
    return [
      {
        id: "piano",
        emoji: "🎹",
        label: "Klavier-Ensemble",
        description: "Salamander-Flügel mit Streichern, Cello, Pad und Glocke.",
      },
      { id: "ocean", emoji: "🌊", label: "Meer", description: "Langsame, wellenartige Schwellen aus gefiltertem Rauschen." },
      { id: "rain", emoji: "🌧️", label: "Regen", description: "Gleichmäßiges, hohes Rauschen — gleichmäßig und einhüllend." },
      { id: "brown", emoji: "🟫", label: "Braunes Rauschen", description: "Tiefer, voller Brumm. Gut, um Ablenkungen zu maskieren." },
      { id: "silent", emoji: "🔇", label: t("common.skip") ? "Stumm" : "Silent", description: "Kein Klangbett — Glocken und Stimme spielen weiter zu den Phasenwechseln." },
    ];
  }
  return [
    { id: "piano", emoji: "🎹", label: "Piano ensemble", description: "Salamander grand with strings, cello, pad, and bell." },
    { id: "ocean", emoji: "🌊", label: "Ocean", description: "Slow wave-like swells of filtered noise." },
    { id: "rain", emoji: "🌧️", label: "Rain", description: "Steady high-frequency wash. Even and enveloping." },
    { id: "brown", emoji: "🟫", label: "Brown noise", description: "Deep, full-spectrum hum. Great for masking distractions." },
    { id: "silent", emoji: "🔇", label: "Silent", description: "No bed at all — chimes and voice still fire on phase changes." },
  ];
}

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
  const { t, i18n } = useTranslation();
  const SOUNDSCAPE_OPTIONS = useSoundscapeOptions();
  const { settings, update, reset } = useSettings();
  // Only show voices that speak the active app language.
  const VOICE_PROFILES = voiceProfilesForLanguage(
    i18n.language.startsWith("de") ? "de" : "en",
  );
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

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
  }, [settings.reminderEnabled]);

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
      alert(t("settings.exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  const onDeleteAccount = async () => {
    if (!user) return;
    const message = isGuest
      ? t("settings.confirmClearLocal")
      : t("settings.confirmDelete");
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
          ? t("settings.deleteFailedLocal")
          : t("settings.deleteFailedAccount"),
      );
      setDeleting(false);
    }
  };

  const onSignUpFromGuest = () => {
    const ok = confirm(t("settings.signUpFromGuestConfirm"));
    if (!ok) return;
    track("guest_sign_up_intent");
    void signOut();
  };

  const themeLabel =
    settings.theme === "auto"
      ? t("settings.themeAuto")
      : settings.theme === "light"
        ? t("settings.themeLight")
        : t("settings.themeDark");
  const motionLabel =
    settings.reducedMotion === "auto"
      ? t("settings.motionAuto")
      : settings.reducedMotion === "on"
        ? t("settings.motionOn")
        : t("settings.motionOff");

  return (
    <div className="min-h-full safe-top safe-bottom px-5 pb-8 max-w-md mx-auto">
      <header className="pt-4 pb-5 flex items-center gap-3">
        <Link
          to="/"
          aria-label={t("common.back")}
          className="p-2 -ml-2 rounded-full hover:bg-slate-900/[0.04] dark:hover:bg-white/5 text-slate-600 dark:text-slate-400"
        >
          ←
        </Link>
        <h1 className="text-2xl font-light">{t("settings.title")}</h1>
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
                  {t("settings.guestMode")}
                </div>
              ) : (
                user.displayName && (
                  <div className="text-sm text-slate-800 dark:text-slate-200 truncate">
                    {user.displayName}
                  </div>
                )
              )}
              <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                {isGuest ? t("settings.guestSubtitle") : user.email}
              </div>
            </div>
            {!isGuest && (
              <button
                onClick={() => {
                  if (confirm(t("settings.signOutConfirm"))) void signOut();
                }}
                className="px-3 py-2 rounded-lg border border-slate-900/10 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-900/[0.04] dark:hover:bg-white/5"
              >
                {t("settings.signOut")}
              </button>
            )}
          </div>

          {isGuest && canRegister && (
            <button
              onClick={onSignUpFromGuest}
              className="w-full mt-2 px-4 py-3 rounded-2xl bg-teal-400/90 text-ink-950 text-sm font-medium hover:bg-teal-300 flex items-center justify-between"
            >
              <span>{t("settings.signUpToSync")}</span>
              <span aria-hidden>→</span>
            </button>
          )}
        </section>
      )}

      <div className="flex flex-col gap-3">
        <section className="rounded-2xl bg-slate-900/[0.04] dark:bg-white/5 border border-slate-900/10 dark:border-white/10 px-4 divide-y divide-white/5">
          <Toggle
            label={t("settings.voicePrompts")}
            checked={settings.voiceEnabled}
            onChange={(v) => update({ voiceEnabled: v })}
          />
          <Toggle
            label={t("settings.backgroundMusic")}
            checked={settings.musicEnabled}
            onChange={(v) => update({ musicEnabled: v })}
          />
          <Toggle
            label={t("settings.chimes")}
            checked={settings.chimesEnabled}
            onChange={(v) => update({ chimesEnabled: v })}
          />
          <Toggle
            label={t("settings.haptics")}
            checked={settings.hapticsEnabled}
            onChange={(v) => update({ hapticsEnabled: v })}
          />
        </section>

        <Collapse
          title={t("language.label")}
          hint={
            settings.language === "auto"
              ? t("language.auto")
              : settings.language === "de"
                ? t("language.de")
                : t("language.en")
          }
        >
          <div className="py-3">
            <label className="flex items-center justify-between">
              <span className="text-slate-800 dark:text-slate-200">{t("language.label")}</span>
              <select
                value={settings.language}
                onChange={(e) =>
                  update({ language: e.target.value as LanguagePref })
                }
                className="bg-slate-100 dark:bg-ink-700 border border-slate-900/10 dark:border-white/10 rounded-lg px-2 py-1 text-sm text-slate-800 dark:text-slate-200"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "auto"
                      ? t("language.auto")
                      : opt === "de"
                        ? t("language.de")
                        : t("language.en")}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Collapse>

        {settings.musicEnabled && (
          <Collapse
            title={t("settings.soundscape")}
            hint={SOUNDSCAPE_OPTIONS.find((s) => s.id === settings.soundscape)?.label.toLowerCase()}
          >
            <div
              role="radiogroup"
              aria-label={t("settings.soundscape")}
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
            title={t("settings.voice")}
            hint={activeVoice ? `${activeVoice.name} · ${activeVoice.description.split(" · ")[1] ?? activeVoice.description}` : undefined}
          >
            <Toggle
              label={t("settings.countdown")}
              checked={settings.countdownEnabled}
              onChange={(v) => update({ countdownEnabled: v })}
            />
            <div
              role="radiogroup"
              aria-label={t("settings.voice")}
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
                      aria-label={t("settings.previewVoice", { name: v.name })}
                      className="px-3 py-1 rounded-lg border border-slate-900/10 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/10"
                    >
                      {t("settings.play")}
                    </button>
                  </div>
                );
              })}
            </div>
          </Collapse>
        )}

        <Collapse
          title={t("settings.volume")}
          hint={`${t("settings.master")} ${Math.round(settings.masterVolume * 100)}%`}
        >
          <div className="divide-y divide-white/5">
            <Slider
              label={t("settings.master")}
              value={Math.round(settings.masterVolume * 100)}
              min={0}
              max={100}
              onChange={(v) => update({ masterVolume: v / 100 })}
              format={(v) => `${v}%`}
            />
            <Slider
              label={t("settings.music")}
              value={Math.round(settings.musicVolume * 100)}
              min={0}
              max={100}
              onChange={(v) => update({ musicVolume: v / 100 })}
              format={(v) => `${v}%`}
            />
            <Slider
              label={t("settings.chimes")}
              value={Math.round(settings.chimeVolume * 100)}
              min={0}
              max={100}
              onChange={(v) => update({ chimeVolume: v / 100 })}
              format={(v) => `${v}%`}
            />
            <Slider
              label={t("settings.voice")}
              value={Math.round(settings.voiceVolume * 100)}
              min={0}
              max={100}
              onChange={(v) => update({ voiceVolume: v / 100 })}
              format={(v) => `${v}%`}
            />
          </div>
        </Collapse>

        <Collapse title={t("settings.perTechniqueDurations")}>
          <div className="divide-y divide-white/5">
            {TECHNIQUES.map((tt) => {
              const current =
                settings.durationOverrides[tt.id] ?? tt.defaultDurationMin;
              return (
                <Slider
                  key={tt.id}
                  label={tt.name}
                  value={current}
                  min={tt.durationRangeMin[0]}
                  max={tt.durationRangeMin[1]}
                  onChange={(v) =>
                    update({
                      durationOverrides: {
                        ...settings.durationOverrides,
                        [tt.id]: v,
                      },
                    })
                  }
                  format={(v) => `${v} ${t("common.minutesShort")}`}
                />
              );
            })}
          </div>
        </Collapse>

        <Collapse
          title={t("settings.reminders")}
          hint={
            settings.reminderEnabled
              ? t("settings.remindersDailyHint", { time: settings.reminderTime })
              : t("settings.remindersOff")
          }
        >
          <div className="divide-y divide-slate-900/5 dark:divide-white/5">
            <Toggle
              label={t("settings.remindersDaily")}
              checked={settings.reminderEnabled}
              onChange={async (v) => {
                if (v) {
                  const result = await requestNotificationPermission();
                  setNotifPermission(result);
                  if (result !== "granted") return;
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
                  const token = await obtainPushToken();
                  if (token) await unregisterDevice(user.uid, token);
                }
                update({ reminderEnabled: v });
                track("reminder_toggled", { enabled: v });
              }}
            />
            {settings.reminderEnabled && (
              <label className="flex items-center justify-between py-3">
                <span className="text-slate-800 dark:text-slate-200">{t("settings.remindersTime")}</span>
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
                ? t("settings.remindersUnsupported")
                : notifPermission === "denied"
                  ? t("settings.remindersBlocked")
                  : isPushAvailable()
                    ? t("settings.remindersBackground")
                    : t("settings.remindersForeground")}
            </p>
          </div>
        </Collapse>

        <Collapse
          title={t("settings.display")}
          hint={t("settings.displayHint", { theme: themeLabel, motion: motionLabel })}
        >
          <div className="divide-y divide-slate-900/5 dark:divide-white/5">
            <label className="flex items-center justify-between py-3">
              <span className="text-slate-800 dark:text-slate-200">{t("settings.theme")}</span>
              <select
                value={settings.theme}
                onChange={(e) =>
                  update({
                    theme: e.target.value as "auto" | "light" | "dark",
                  })
                }
                className="bg-slate-100 dark:bg-ink-700 border border-slate-900/10 dark:border-white/10 rounded-lg px-2 py-1 text-sm text-slate-800 dark:text-slate-200"
              >
                <option value="auto">{t("settings.themeAuto")}</option>
                <option value="light">{t("settings.themeLight")}</option>
                <option value="dark">{t("settings.themeDark")}</option>
              </select>
            </label>
            <label className="flex items-center justify-between py-3">
              <span className="text-slate-800 dark:text-slate-200">
                {t("settings.motion")}
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
                <option value="auto">{t("settings.motionAuto")}</option>
                <option value="on">{t("settings.motionOn")}</option>
                <option value="off">{t("settings.motionOff")}</option>
              </select>
            </label>
          </div>
        </Collapse>

        <Collapse title={t("settings.testSound")}>
          <div className="py-3">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
              {t("settings.testSoundHint")}
            </p>
            <button
              onClick={runTest}
              disabled={testing}
              className="w-full px-4 py-3 rounded-2xl bg-teal-400/90 text-ink-950 font-medium hover:bg-teal-300 disabled:opacity-60"
            >
              {testing ? t("settings.playingTestSound") : t("settings.testSoundButton")}
            </button>
          </div>
        </Collapse>

        {ANALYTICS_CONFIGURED && (
          <Collapse
            title={t("settings.privacy")}
            hint={settings.analyticsEnabled ? t("settings.analyticsOn") : t("settings.analyticsOff")}
          >
            <div className="divide-y divide-slate-900/5 dark:divide-white/5">
              <Toggle
                label={t("settings.helpImprove")}
                checked={settings.analyticsEnabled}
                onChange={(v) => update({ analyticsEnabled: v })}
              />
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed py-3">
                {t("settings.analyticsNote")}
              </p>
            </div>
          </Collapse>
        )}

        {user && (
          <Collapse title={t("settings.dataAccount")}>
            <div className="divide-y divide-white/5">
              <button
                onClick={exportData}
                disabled={exporting}
                className="w-full flex items-center justify-between py-3 text-sm text-slate-800 dark:text-slate-200 hover:opacity-90 disabled:opacity-50"
              >
                <span>{t("settings.exportData")}</span>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {exporting ? t("settings.exportPreparing") : t("settings.exportDownload")}
                </span>
              </button>
              <button
                onClick={onDeleteAccount}
                disabled={deleting}
                className="w-full flex items-center justify-between py-3 text-sm text-red-300/90 hover:opacity-90 disabled:opacity-50"
              >
                <span>
                  {isGuest ? t("settings.clearLocal") : t("settings.deleteAccount")}
                </span>
                <span className="text-xs text-red-300/70">
                  {deleting ? t("settings.deleting") : t("settings.permanent")}
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
          {t("settings.viewDisclaimer")}
        </button>
        <button
          onClick={() => {
            if (confirm(t("settings.resetConfirm"))) reset();
          }}
          className="px-4 py-3 rounded-2xl border border-slate-900/10 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-900/[0.04] dark:hover:bg-white/5 text-sm"
        >
          {t("settings.resetSettings")}
        </button>
      </section>

      <footer className="text-center text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed pt-2 pb-4">
        <a
          href={SOURCE_URL}
          target="_blank"
          rel="noreferrer"
          className="underline-offset-2 hover:underline"
        >
          {t("settings.footerSource")}
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
        <Link to="/imprint" className="underline-offset-2 hover:underline">
          {t("settings.footerImprint")}
        </Link>
        {" · "}
        <Link to="/privacy" className="underline-offset-2 hover:underline">
          {t("settings.footerPrivacy")}
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
