import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { LICENSE_NAME, LICENSE_URL, SOURCE_URL } from "@/lib/about";

export function Login() {
  const { signInWithGoogle, error } = useAuth();
  const [busy, setBusy] = useState(false);

  const onSignIn = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col safe-top safe-bottom px-6 pb-8 max-w-md mx-auto">
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
        <div className="text-6xl">🌬️</div>
        <div>
          <h1 className="text-3xl font-light tracking-tight">BreathBase</h1>
          <p className="text-sm text-slate-400 mt-2 max-w-xs">
            Foundational breathwork, grounded in science.
          </p>
        </div>
        <p className="text-slate-300 text-sm max-w-xs leading-relaxed">
          Sign in to sync your settings, streak, and practice history across
          devices.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={onSignIn}
          disabled={busy}
          className="w-full px-5 py-3 rounded-2xl bg-white text-ink-950 font-medium hover:bg-slate-100 disabled:opacity-60 flex items-center justify-center gap-3"
        >
          <GoogleMark />
          {busy ? "Signing in…" : "Continue with Google"}
        </button>
        {error && (
          <p role="alert" className="text-xs text-red-300 text-center">
            {error}
          </p>
        )}
        <p className="text-[11px] text-slate-400 text-center max-w-xs mx-auto leading-relaxed">
          By continuing you agree to use this app as an educational tool, not
          medical advice. See safety details after sign-in.
        </p>
        <p className="text-[11px] text-slate-400 text-center pt-2">
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
