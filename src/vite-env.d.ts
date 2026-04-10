/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// uuid@10 ships no TypeScript declarations — declare the subset we use
declare module 'uuid' {
  export function v7(): string
}

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
