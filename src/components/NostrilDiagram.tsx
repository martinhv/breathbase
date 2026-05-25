// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useTranslation } from "react-i18next";

type Props = { nostril: "left" | "right" | null };

export function NostrilDiagram({ nostril }: Props) {
  const { t } = useTranslation();
  if (!nostril) return null;
  const closeRight = nostril === "left";
  const sideLabel = nostril === "left" ? t("session.nostrilLeft") : t("session.nostrilRight");
  return (
    <div
      aria-label={t("session.nostrilOpen", { side: sideLabel })}
      role="img"
      className="flex flex-col items-center gap-2"
    >
      <svg
        viewBox="0 0 120 120"
        width="96"
        height="96"
        className="text-slate-800 dark:text-slate-200"
      >
        <circle
          cx="60"
          cy="60"
          r="42"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.4"
          strokeWidth="2"
        />
        <path
          d="M60 50 L60 72"
          stroke="currentColor"
          strokeOpacity="0.6"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle
          cx="54"
          cy="76"
          r="3"
          fill={closeRight ? "currentColor" : "#5eead4"}
          opacity={closeRight ? 0.3 : 1}
        />
        <circle
          cx="66"
          cy="76"
          r="3"
          fill={closeRight ? "#5eead4" : "currentColor"}
          opacity={closeRight ? 1 : 0.3}
        />
        <rect
          x={closeRight ? "44" : "68"}
          y="68"
          width="10"
          height="20"
          rx="5"
          fill="#fbbf24"
          opacity="0.85"
        />
      </svg>
      <div className="text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400">
        {t("session.open", { side: sideLabel })}
      </div>
    </div>
  );
}
