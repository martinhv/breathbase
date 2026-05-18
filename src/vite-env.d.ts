/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;

  // Legal / Impressum / GDPR contact info. Filled in at build time from
  // the build environment (.env / .env.local — both gitignored). Pages
  // render placeholder text when unset.
  readonly VITE_LEGAL_COMPANY?: string;
  readonly VITE_LEGAL_ADDRESS_STREET?: string;
  readonly VITE_LEGAL_ADDRESS_CITY?: string;
  readonly VITE_LEGAL_ADDRESS_COUNTRY?: string;
  readonly VITE_LEGAL_EMAIL?: string;
  readonly VITE_LEGAL_MANAGING_DIRECTOR?: string;
  readonly VITE_LEGAL_REGISTER_COURT?: string;
  readonly VITE_LEGAL_REGISTER_NUMBER?: string;
  readonly VITE_LEGAL_VAT_ID?: string;
  readonly VITE_LEGAL_SUPERVISORY_AUTHORITY?: string;
  readonly VITE_LEGAL_SUPERVISORY_ADDRESS?: string;
  readonly VITE_LEGAL_SUPERVISORY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
