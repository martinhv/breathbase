import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { SettingsProvider, useSettings } from "@/lib/settings";
import { DisclaimerModal } from "@/components/DisclaimerModal";
import { Home } from "@/pages/Home";
import { Category } from "@/pages/Category";
import { Session } from "@/pages/Session";
import { Settings } from "@/pages/Settings";
import { Onboarding } from "@/pages/Onboarding";

function FirstLaunchGate({ children }: { children: React.ReactNode }) {
  const { settings, update } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Skip the gate until the settings provider has loaded from storage.
    // We approximate "hydrated" by waiting one tick.
    const id = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!settings.onboarded && location.pathname !== "/onboarding") {
      navigate("/onboarding", { replace: true });
    }
  }, [hydrated, settings.onboarded, location.pathname, navigate]);

  const showDisclaimer =
    hydrated && settings.onboarded && !settings.disclaimerAcknowledged;

  return (
    <>
      {children}
      <DisclaimerModal
        open={showDisclaimer}
        required
        onAcknowledge={() => update({ disclaimerAcknowledged: true })}
      />
    </>
  );
}

function AppRoutes() {
  return (
    <FirstLaunchGate>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/category/:id" element={<Category />} />
        <Route path="/session/:id" element={<Session />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </FirstLaunchGate>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </SettingsProvider>
  );
}
