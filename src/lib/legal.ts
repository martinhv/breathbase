// SPDX-FileCopyrightText: 2026 Martin Hirschvogel <https://github.com/martinhv>
// SPDX-License-Identifier: AGPL-3.0-or-later

// Legal contact info read from VITE_LEGAL_* env vars at build time.
// Values live in the build environment (.env / .env.local — both gitignored)
// so personal/company details stay out of the source repo. Pages render a
// clear placeholder when a value is unset.

const env = import.meta.env;

const fallback = (value: string | undefined, label: string): string =>
  value && value.trim() ? value : `[${label} — VITE_LEGAL_* not configured]`;

export const LEGAL = {
  company: fallback(env.VITE_LEGAL_COMPANY, "company"),
  street: fallback(env.VITE_LEGAL_ADDRESS_STREET, "street"),
  city: fallback(env.VITE_LEGAL_ADDRESS_CITY, "city"),
  country: env.VITE_LEGAL_ADDRESS_COUNTRY ?? "Germany",
  email: fallback(env.VITE_LEGAL_EMAIL, "email"),
  managingDirector: fallback(env.VITE_LEGAL_MANAGING_DIRECTOR, "Geschäftsführer"),
  registerCourt: fallback(env.VITE_LEGAL_REGISTER_COURT, "Amtsgericht"),
  registerNumber: fallback(env.VITE_LEGAL_REGISTER_NUMBER, "HRB"),
  /** Empty string = no VAT ID; the page hides the section. */
  vatId: env.VITE_LEGAL_VAT_ID ?? "",
  supervisoryAuthority: env.VITE_LEGAL_SUPERVISORY_AUTHORITY ??
    "Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)",
  supervisoryAddress: env.VITE_LEGAL_SUPERVISORY_ADDRESS ??
    "Promenade 18, 91522 Ansbach",
  supervisoryUrl: env.VITE_LEGAL_SUPERVISORY_URL ?? "https://www.lda.bayern.de/",
};
