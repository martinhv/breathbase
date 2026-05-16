import { useRegisterSW } from "virtual:pwa-register/react";

// Banner shown when a new version of the service worker is waiting. Tapping
// "Reload" calls updateServiceWorker(true) which activates the new SW and
// triggers a full page refresh.
export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(err) {
      // eslint-disable-next-line no-console
      console.error("SW registration failed:", err);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] safe-bottom"
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-ink-800/95 border border-slate-900/10 dark:border-white/10 shadow-xl backdrop-blur-sm">
        <span className="text-sm text-slate-800 dark:text-slate-200">New version available</span>
        <button
          onClick={() => updateServiceWorker(true)}
          className="px-3 py-1.5 rounded-lg bg-teal-400/90 text-ink-950 text-sm font-medium hover:bg-teal-300"
        >
          Reload
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          aria-label="Dismiss"
          className="px-2 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-900/[0.04] dark:hover:bg-white/5"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
