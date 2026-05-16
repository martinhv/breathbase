// AuthContext — wraps Firebase Auth with a tiny status-machine that the
// rest of the app reads via `useAuth()`. The router uses `status` to decide
// what to render (loading shell / login screen / actual app).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

export type AuthStatus = "loading" | "signedOut" | "signedIn";

type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (next) => {
      setUser(next);
      setStatus(next ? "signedIn" : "signedOut");
    });
    return unsub;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      const code = (e as { code?: string }).code;
      // Popup-closed-by-user is the normal "cancel" path; don't shout about it.
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        return;
      }
      setError((e as Error).message ?? "Sign-in failed");
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    await fbSignOut(auth);
  }, []);

  const value = useMemo(
    () => ({ user, status, signInWithGoogle, signOut, error }),
    [user, status, signInWithGoogle, signOut, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
