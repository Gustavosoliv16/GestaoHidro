/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** JSON serializado de EntradaChangelog[] — injetado pelo changelog-plugin */
  readonly VITE_CHANGELOG: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
