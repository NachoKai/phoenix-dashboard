/// <reference types="vite/client" />/// <reference types="vite-plugin-pwa/client" />
interface ImportMetaEnv {
  readonly VITE_DASHBOARD_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
