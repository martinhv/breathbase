// AuthContext — wraps Firebase Auth with a tiny status-machine that the
// rest of the app reads via `useAuth()`. The router uses `status` to decide
// what to render (loading shell / login screen / actual app).
//
// In local mode (see firebase.ts) the FirebaseAuthProvider is swapped for a
// LocalAuthProvider that synthesizes a signed-in "local user" so there's no
// login flow and all per-user data is namespaced under that synthetic uid.

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
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider, localMode } from "./firebase";
import { deleteAllUserData } from "./storage";

export type AuthStatus = "loading" | "signedOut" | "signedIn";

type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Wipe all of the current user's Firestore data and delete their Firebase
   * Auth account. If Firebase requires a recent login, this transparently
   * triggers a re-auth popup and retries. In local mode this clears the
   * locally-stored data — there's no auth account to delete.
   */
  deleteAccount: () => Promise<void>;
  error: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Synthetic user for local mode. Only the fields the app actually reads
 *  (uid, displayName, email, photoURL) are populated; the rest of the
 *  Firebase User shape is unused and cast away. */
export const LOCAL_UID = "local-user";
const LOCAL_USER = {
  uid: LOCAL_UID,
  displayName: "Local user",
  email: null,
  photoURL: null,
} as unknown as User;

function FirebaseAuthProvider({ children }: { children: ReactNode }) {
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

  const deleteAccount = useCallback(async () => {
    setError(null);
    const current = auth.currentUser;
    if (!current) return;
    // Wipe Firestore first. If the auth deletion fails, the user can sign
    // in again on a fresh slate. If we deleted auth first and the Firestore
    // wipe then failed, orphaned data would be stranded under an unauth'd
    // uid path (and the security rules would block it forever).
    await deleteAllUserData(current.uid);
    try {
      await deleteUser(current);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "auth/requires-recent-login") {
        await reauthenticateWithPopup(current, googleProvider);
        await deleteUser(current);
      } else {
        throw e;
      }
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      signInWithGoogle,
      signOut,
      deleteAccount,
      error,
    }),
    [user, status, signInWithGoogle, signOut, deleteAccount, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function LocalAuthProvider({ children }: { children: ReactNode }) {
  const deleteAccount = useCallback(async () => {
    await deleteAllUserData(LOCAL_UID);
    // No auth account to remove; just reload so the in-memory state resets.
    if (typeof window !== "undefined") window.location.reload();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: LOCAL_USER,
      status: "signedIn",
      signInWithGoogle: async () => {
        /* no-op in local mode */
      },
      signOut: async () => {
        /* no-op in local mode */
      },
      deleteAccount,
      error: null,
    }),
    [deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return localMode ? (
    <LocalAuthProvider>{children}</LocalAuthProvider>
  ) : (
    <FirebaseAuthProvider>{children}</FirebaseAuthProvider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
