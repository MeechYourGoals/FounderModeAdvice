// Ambient shim for `deno test` only (referenced from deno.json compilerOptions).
//
// Client modules under test reach Vite's `import.meta.env`, whose types come
// from `vite/client` via src/vite-env.d.ts — a triple-slash reference Deno
// cannot resolve. This file lives outside `src/` on purpose so tsc never loads
// it and never sees a competing ImportMeta declaration.

interface ImportMetaEnv {
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
