import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { LICENSE_NAME, LICENSE_URL, SOURCE_URL } from "@/lib/about";
import { track } from "@/lib/analytics";

type EmailMode = "signIn" | "signUp";

// Friendly mapping for the Firebase auth error codes we actually expect to
// hit from this form. Anything outside the list falls back to the raw message.
function friendlyAuthError(code: string | undefined, fallback: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/missing-password":
      return "Please enter your password.";
    case "auth/weak-password":
      return "Password is too short. Use at least 6 characters.";
    case "auth/email-already-in-use":
      return "An account with that email already exists. Try signing in instead.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again in a few minutes or reset your password.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return fallback;
  }
}

export function Login() {
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    error: contextError,
  } = useAuth();

  const [googleBusy, setGoogleBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [mode, setMode] = useState<EmailMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [resetInfo, setResetInfo] = useState<string | null>(null);

  const onGoogle = async () => {
    setGoogleBusy(true);
    setFormError(null);
    setResetInfo(null);
    try {
      await signInWithGoogle();
      track("sign_in", { method: "google" });
    } finally {
      setGoogleBusy(false);
    }
  };

  const onEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setResetInfo(null);
    setEmailBusy(true);
    try {
      if (mode === "signIn") {
        await signInWithEmail(email.trim(), password);
        track("sign_in", { method: "email" });
      } else {
        await signUpWithEmail(email.trim(), password);
        track("sign_up", { method: "email" });
      }
    } catch (err) {
      const code = (err as { code?: string }).code;
      setFormError(
        friendlyAuthError(code, (err as Error).message ?? "Something went wrong"),
      );
    } finally {
      setEmailBusy(false);
    }
  };

  const onForgotPassword = async () => {
    setFormError(null);
    setResetInfo(null);
    const target = email.trim();
    if (!target) {
      setFormError("Enter your email above first, then tap 'Forgot password?'.");
      return;
    }
    try {
      await sendPasswordReset(target);
      setResetInfo(`Sent a reset link to ${target}. Check your inbox.`);
    } catch (err) {
      const code = (err as { code?: string }).code;
      setFormError(
        friendlyAuthError(code, (err as Error).message ?? "Couldn't send reset email"),
      );
    }
  };

  const displayError = formError ?? contextError;

  return (
    <div className="min-h-full flex flex-col safe-top safe-bottom px-6 pb-8 max-w-md mx-auto">
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 pt-8">
        <div className="text-6xl">🌬️</div>
        <div>
          <h1 className="text-3xl font-light tracking-tight">BreathBase</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-xs">
            Foundational breathwork, grounded in science.
          </p>
        </div>
        <p className="text-slate-700 dark:text-slate-300 text-sm max-w-xs leading-relaxed">
          Sign in to sync your settings, streak, and practice history across
          devices.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={onGoogle}
          disabled={googleBusy || emailBusy}
          className="w-full px-5 py-3 rounded-2xl bg-white text-ink-950 font-medium hover:bg-slate-100 disabled:opacity-60 flex items-center justify-center gap-3"
        >
          <GoogleMark />
          {googleBusy ? "Signing in…" : "Continue with Google"}
        </button>

        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-slate-900/10 dark:bg-white/10" />
          <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            or
          </span>
          <div className="flex-1 h-px bg-slate-900/10 dark:bg-white/10" />
        </div>

        <form onSubmit={onEmailSubmit} className="flex flex-col gap-2">
          <label className="sr-only" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-ink-700 border border-slate-900/10 dark:border-white/10 text-slate-800 dark:text-slate-200 placeholder:text-slate-500"
          />
          <label className="sr-only" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "signIn" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-ink-700 border border-slate-900/10 dark:border-white/10 text-slate-800 dark:text-slate-200 placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={emailBusy || googleBusy}
            className="w-full px-5 py-3 rounded-2xl bg-teal-400/90 text-ink-950 font-medium hover:bg-teal-300 disabled:opacity-60"
          >
            {emailBusy
              ? mode === "signIn"
                ? "Signing in…"
                : "Creating account…"
              : mode === "signIn"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <div className="flex items-center justify-between text-[12px] text-slate-600 dark:text-slate-400 px-1">
          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === "signIn" ? "signUp" : "signIn"));
              setFormError(null);
              setResetInfo(null);
            }}
            className="hover:underline underline-offset-2"
          >
            {mode === "signIn"
              ? "Need an account? Create one"
              : "Have an account? Sign in"}
          </button>
          {mode === "signIn" && (
            <button
              type="button"
              onClick={onForgotPassword}
              className="hover:underline underline-offset-2"
            >
              Forgot password?
            </button>
          )}
        </div>

        {displayError && (
          <p role="alert" className="text-xs text-red-300 text-center">
            {displayError}
          </p>
        )}
        {resetInfo && (
          <p role="status" className="text-xs text-teal-300 text-center">
            {resetInfo}
          </p>
        )}

        <p className="text-[11px] text-slate-600 dark:text-slate-400 text-center max-w-xs mx-auto leading-relaxed pt-2">
          By continuing you agree to use this app as an educational tool, not
          medical advice. See safety details after sign-in.
        </p>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 text-center pt-2">
          Open source —{" "}
          <a
            href={SOURCE_URL}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:underline"
          >
            view source
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
        </p>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
