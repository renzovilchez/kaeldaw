# KaelDAW

DAW web. React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4.

## Stack

- UI: React 19 + Web Components vanilla (canvas 2D)
- Audio: Web Audio API + AudioWorklet
- DSP: Rust → WASM (wasm-pack)
- Build: Vite 8 + Turborepo
- Estado: Zustand

## Correr local

```bash
pnpm install
pnpm dev
```

## Desarrollo

Cada desarrollador tiene su propio `.harness/` (ver `.harness.example/`).
Todo feature sigue SDD: Requerimiento → AER → Tests → Implementación.
