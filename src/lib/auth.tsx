// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

// AuthContext — wraps Firebase Auth with a tiny status-machine that the
// rest of the app reads via `useAuth()`. The router uses `status` to decide
// what to render (loading shell / login screen / actual app).
//
// Three modes coexist behind the same context:
//   1. Build-time local mode (no Firebase config): always-signed-in synthetic
//      LOCAL_USER, no choice to register. `canRegister` is false.
//   2. Firebase-configured + signed in: real Firebase User, isGuest=false.
//   3. Firebase-configured + runtime guest: user picked "continue without an
//      account" on the Login screen. Same synthetic LOCAL_USER, isGuest=true,
//      `canRegister` is true so the UI can offer a sign-up upgrade.
//
// When a guest signs into Firebase, `migrateGuestData()` copies their local
// settings + sessions into the new Firestore account before status flips to
// the signed-in Firebase user.

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
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider, localMode, LOCAL_UID } from "./firebase";
import { deleteAllUserData, migrateGuestData } from "./storage";

export type AuthStatus = "loading" | "signedOut" | "signedIn";

type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  /** True when the active user is the synthetic LOCAL_USER (build-time local
   *  mode OR runtime guest who picked "continue without an account"). */
  isGuest: boolean;
  /** True when Firebase is configured at build time, so the app can offer
   *  registration as an upgrade path. False in build-time local mode. */
  canRegister: boolean;
  signInWithGoogle: () => Promise<void>;
  /** Email/password sign-in. Throws the original Firebase error so the caller
   *  can map the error code to a friendly message. */
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Email/password account creation. After success the user is signed in.
   *  Throws the Firebase error on failure so the caller can surface it. */
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  /** Trigger a password-reset email. Throws on failure. */
  sendPasswordReset: (email: string) => Promise<void>;
  /** Skip account creation — flip into guest mode using localStorage. */
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
  /**
   * Wipe all of the current user's Firestore data and delete their Firebase
   * Auth account. If Firebase requires a recent login, this transparently
   * re-auths against the provider the user signed in with (Google popup or
   * an email/password prompt) and retries. In local/guest mode this clears
   * the locally-stored data — there's no auth account to delete.
   */
  deleteAccount: () => Promise<void>;
  error: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Synthetic user for local mode + runtime guest. Only the fields the app
 *  actually reads (uid, displayName, email, photoURL) are populated. */
export { LOCAL_UID };
const LOCAL_USER = {
  uid: LOCAL_UID,
  displayName: "Local user",
  email: null,
  photoURL: null,
} as unknown as User;

// localStorage flag remembering that the user picked "continue without an
// account". Survives reloads so they don't see the Login screen every time.
const GUEST_FLAG_KEY = "sough:guestMode";
const readGuestFlag = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(GUEST_FLAG_KEY) === "true";
  } catch {
    return false;
  }
};
const writeGuestFlag = (on: boolean): void => {
  if (typeof window === "undefined") return;
  try {
    if (on) window.localStorage.setItem(GUEST_FLAG_KEY, "true");
    else window.localStorage.removeItem(GUEST_FLAG_KEY);
  } catch {
    /* noop */
  }
};

function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Whether the *current* sign-in attempt is upgrading a guest. Used by the
  // onAuthStateChanged effect to decide whether to run the migration.
  const upgradingFromGuestRef = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (next) => {
      if (next) {
        // A real Firebase user just arrived. If they were a guest a moment
        // ago, migrate their local data into the new account, then clear
        // the guest flag so future reloads don't re-trigger this path.
        const wasGuest = upgradingFromGuestRef.current || readGuestFlag();
        upgradingFromGuestRef.current = false;
        if (wasGuest) {
          try {
            await migrateGuestData(next.uid);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error("[auth] guest migration failed:", e);
          }
          writeGuestFlag(false);
        }
        setUser(next);
        setIsGuest(false);
        setStatus("signedIn");
      } else if (readGuestFlag()) {
        // No Firebase user but the guest flag is set — present as signed
        // in with the synthetic LOCAL_USER.
        setUser(LOCAL_USER);
        setIsGuest(true);
        setStatus("signedIn");
      } else {
        setUser(null);
        setIsGuest(false);
        setStatus("signedOut");
      }
    });
    return unsub;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    upgradingFromGuestRef.current = isGuest;
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      upgradingFromGuestRef.current = false;
      const code = (e as { code?: string }).code;
      // Popup-closed-by-user is the normal "cancel" path; don't shout about it.
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        return;
      }
      setError((e as Error).message ?? "Sign-in failed");
    }
  }, [isGuest]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      setError(null);
      upgradingFromGuestRef.current = isGuest;
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (e) {
        upgradingFromGuestRef.current = false;
        setError((e as Error).message ?? "Sign-in failed");
        throw e;
      }
    },
    [isGuest],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      setError(null);
      upgradingFromGuestRef.current = isGuest;
      try {
        await createUserWithEmailAndPassword(auth, email, password);
      } catch (e) {
        upgradingFromGuestRef.current = false;
        setError((e as Error).message ?? "Sign-up failed");
        throw e;
      }
    },
    [isGuest],
  );

  const sendPasswordReset = useCallback(async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (e) {
      setError((e as Error).message ?? "Reset email failed");
      throw e;
    }
  }, []);

  const continueAsGuest = useCallback(() => {
    writeGuestFlag(true);
    setUser(LOCAL_USER);
    setIsGuest(true);
    setStatus("signedIn");
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    if (isGuest) {
      // No Firebase session — just clear the flag. Local data stays put so
      // the user can come back as a guest later and pick up where they left.
      writeGuestFlag(false);
      setUser(null);
      setIsGuest(false);
      setStatus("signedOut");
      return;
    }
    // Clear any leftover guest flag too, so signing out always lands at
    // the Login screen rather than auto-falling-back into guest mode.
    writeGuestFlag(false);
    await fbSignOut(auth);
  }, [isGuest]);

  const deleteAccount = useCallback(async () => {
    setError(null);
    if (isGuest) {
      await deleteAllUserData(LOCAL_UID);
      writeGuestFlag(false);
      setUser(null);
      setIsGuest(false);
      setStatus("signedOut");
      return;
    }
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
        // Re-auth against whichever provider the user signed in with.
        // window.prompt is functional but ugly — a proper modal would be
        // nicer but adds significant UI scope; the prompt only appears in
        // the edge case of a long-running session where Firebase has aged
        // the session past its re-auth threshold.
        const provider = current.providerData[0]?.providerId;
        if (provider === "password") {
          const email = current.email;
          if (!email) throw e;
          const password = typeof window !== "undefined"
            ? window.prompt("For security, re-enter your password to delete your account:")
            : null;
          if (!password) throw e;
          const cred = EmailAuthProvider.credential(email, password);
          await reauthenticateWithCredential(current, cred);
        } else {
          await reauthenticateWithPopup(current, googleProvider);
        }
        await deleteUser(current);
      } else {
        throw e;
      }
    }
  }, [isGuest]);

  const value = useMemo(
    () => ({
      user,
      status,
      isGuest,
      canRegister: true,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      sendPasswordReset,
      continueAsGuest,
      signOut,
      deleteAccount,
      error,
    }),
    [
      user,
      status,
      isGuest,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      sendPasswordReset,
      continueAsGuest,
      signOut,
      deleteAccount,
      error,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function LocalAuthProvider({ children }: { children: ReactNode }) {
  // Build-time local mode (no Firebase configured): there is no sign-in /
  // sign-out concept. The synthetic LOCAL_USER is always signed in; the
  // only data operation that makes sense is "clear local data".
  const deleteAccount = useCallback(async () => {
    await deleteAllUserData(LOCAL_UID);
    // No auth account to remove; just reload so the in-memory state resets.
    if (typeof window !== "undefined") window.location.reload();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: LOCAL_USER,
      status: "signedIn",
      isGuest: true,
      canRegister: false,
      signInWithGoogle: async () => {},
      signInWithEmail: async () => {},
      signUpWithEmail: async () => {},
      sendPasswordReset: async () => {},
      continueAsGuest: () => {},
      signOut: async () => {},
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
