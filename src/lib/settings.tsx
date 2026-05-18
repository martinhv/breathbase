// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from "./storage";
import { useAuth } from "./auth";

type SettingsContextValue = {
  settings: Settings;
  /** True until Firestore has returned this user's settings doc at least once. */
  loading: boolean;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Track the latest loaded UID so writes to a previous user's doc can never
  // leak across a sign-out / sign-in.
  const loadedUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      loadedUidRef.current = null;
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loadSettings(user.uid)
      .then((s) => {
        if (cancelled) return;
        loadedUidRef.current = user.uid;
        setSettings(s);
        setLoading(false);
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error("Failed to load settings:", e);
        if (cancelled) return;
        loadedUidRef.current = user.uid;
        setSettings(DEFAULT_SETTINGS);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const update = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        // Fire-and-forget. UI state updates immediately; failure is logged.
        if (user && loadedUidRef.current === user.uid) {
          saveSettings(user.uid, next).catch((e) => {
            // eslint-disable-next-line no-console
            console.error("Failed to save settings:", e);
          });
        }
        return next;
      });
    },
    [user],
  );

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    if (user && loadedUidRef.current === user.uid) {
      saveSettings(user.uid, DEFAULT_SETTINGS).catch((e) => {
        // eslint-disable-next-line no-console
        console.error("Failed to reset settings:", e);
      });
    }
  }, [user]);

  const value = useMemo(
    () => ({ settings, loading, update, reset }),
    [settings, loading, update, reset],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}