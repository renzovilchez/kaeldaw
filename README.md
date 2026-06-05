# KaelDAW

DAW web. React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4.

## Stack

- UI: React 19 + Web Components vanilla (canvas 2D)
- Audio: Web Audio API + AudioWorklet
- DSP: Rust → WASM (wasm-pack)
- Build: Vite 8 + Turborepo
- Estado: Zustand

## Requisitos

### Mínimo (correr local)

| Herramienta | Versión |
|---|---|
| Node.js | >= 20 LTS |
| pnpm | >= 10 |

```bash
pnpm install
pnpm dev
```

### Desarrollo (incluye compilar Rust → WASM)

Además de lo mínimo:

| Herramienta | Versión | Windows | macOS | Linux |
|---|---|---|---|---|
| Rust | >= 1.80 | `rustup-init.exe` | `curl ... \| sh` | `curl ... \| sh` |
| wasm-pack | >= 0.13 | binario o `cargo install` | binario o `cargo install` | binario o `cargo install` |
| Target wasm32 | — | `rustup target add wasm32-unknown-unknown` | ídem | ídem |
| C++ linker | — | VS Build Tools (VC++ workload) | Xcode Command Line Tools | `gcc` o `build-essential` |

El script `build:wasm` detecta automáticamente la instalación de Visual Studio via `vswhere.exe` (Windows) o usa el linker del sistema (macOS/Linux).

```bash
# Build WASM + TypeScript + lint
pnpm build:wasm
pnpm build
pnpm lint
pnpm test
```

## Desarrollo

Cada desarrollador tiene su propio `.harness/` (ver `.harness.example/`).
Todo feature sigue SDD: Requerimiento → AER → Tests → Implementación.
