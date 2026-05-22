// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

export function SoughMark({ className }: { className?: string }) {
  return (
    <img
      src="/sough-mark.png"
      alt=""
      aria-hidden
      className={className}
      draggable={false}
    />
  );
}
