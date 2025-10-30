/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_BACKEND?: 'MOCK' | 'FIREBASE'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
