import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { SettingsProvider, useSettings } from "@/lib/settings";
import { HistoryProvider } from "@/lib/history";
import { applyTheme, subscribeSystemTheme } from "@/lib/theme";
import { cancelReminder, scheduleReminder } from "@/lib/notifications";
import { initAnalytics, trackPageView } from "@/lib/analytics";
import { DisclaimerModal } from "@/components/DisclaimerModal";
import { ReloadPrompt } from "@/components/ReloadPrompt";
import { Home } from "@/pages/Home";
import { Category } from "@/pages/Category";
import { Session } from "@/pages/Session";
import { Settings } from "@/pages/Settings";
import { Onboarding } from "@/pages/Onboarding";
import { Login } from "@/pages/Login";
import { History } from "@/pages/History";
import { Program } from "@/pages/Program";
import { Theme } from "@/pages/Theme";
import { Library } from "@/pages/Library";

function LoadingShell() {
  return (
    <div className="min-h-full flex items-center justify-center safe-top safe-bottom">
      <div className="text-slate-600 dark:text-slate-400 text-sm">Loading…</div>
    </div>
  );
}

function SignedInApp() {
  const { settings, loading, update } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (loading) return;
    const id = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(id);
  }, [loading]);

  // Keep the html.dark class in sync with settings.theme. The inline script
  // in index.html handles the first paint; this hook handles changes after
  // settings load from Firestore + system theme changes while in 'auto'.
  useEffect(() => {
    applyTheme(settings.theme);
    if (settings.theme !== "auto") return;
    return subscribeSystemTheme(() => applyTheme(settings.theme));
  }, [settings.theme]);

  // Daily practice reminder. Re-arms whenever the toggle or time changes.
  useEffect(() => {
    if (settings.reminderEnabled) {
      scheduleReminder(settings.reminderTime);
    } else {
      cancelReminder();
    }
    return cancelReminder;
  }, [settings.reminderEnabled, settings.reminderTime]);

  // Analytics: (re)evaluate opt-in whenever the setting changes. No-op when
  // the build wasn't configured with VITE_UMAMI_*.
  useEffect(() => {
    if (loading) return;
    initAnalytics(settings.analyticsEnabled);
  }, [loading, settings.analyticsEnabled]);

  // Fire SPA pageviews on route change. Umami's auto-tracking is disabled in
  // analytics.ts so we get one event per logical route, not per hard navigation.
  useEffect(() => {
    if (loading) return;
    trackPageView(location.pathname);
  }, [loading, location.pathname]);

  useEffect(() => {
    if (!hydrated) return;
    if (!settings.onboarded && location.pathname !== "/onboarding") {
      navigate("/onboarding", { replace: true });
    }
  }, [hydrated, settings.onboarded, location.pathname, navigate]);

  if (loading) return <LoadingShell />;

  const showDisclaimer =
    hydrated && settings.onboarded && !settings.disclaimerAcknowledged;

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/theme/:id" element={<Theme />} />
        <Route path="/library" element={<Library />} />
        <Route path="/category/:id" element={<Category />} />
        <Route path="/session/:id" element={<Session />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/history" element={<History />} />
        <Route path="/program" element={<Program />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <DisclaimerModal
        open={showDisclaimer}
        required
        onAcknowledge={() => update({ disclaimerAcknowledged: true })}
      />
    </>
  );
}

function AuthGate() {
  const { status } = useAuth();

  if (status === "loading") return <LoadingShell />;
  if (status === "signedOut") {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }
  return (
    <SettingsProvider>
      <HistoryProvider>
        <SignedInApp />
      </HistoryProvider>
    </SettingsProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AuthGate />
      </BrowserRouter>
      <ReloadPrompt />
    </AuthProvider>
  );
}
