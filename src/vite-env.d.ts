/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HA_TOKEN: string
  readonly VITE_HA_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
