# AGENTS.md — KaelDAW

Lee la skill de sesión para comenzar. Contiene todas las reglas activas.

```
skill kaeldaw-session
```

## Deny rules críticas (no negociables)

- No modificar `package.json`, `tsconfig.json`, `vite.config.ts` sin preguntar.
- No borrar archivos de test existentes.
- No commiteear código sin build exitoso.
- No commitear directo a `main`.
- No hacer push, merge, PR sin orden directa.

## Tool scoping

- `file_search`: solo `apps/`, `packages/`, `crates/`, `.harness/`.
- `bash`: solo pnpm, git, node. `rm -rf` requiere confirmación.
- `edit`/`write`: solo archivos existentes o creados en esta sesión.

## Requisitos del proyecto

Para features Rust: `rustc >= 1.80`, `wasm-pack >= 0.13`,
`wasm32-unknown-unknown` instalado, y linker C disponible.
Para TS/JS: solo Node.js + pnpm.
