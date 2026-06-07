# KaelDAW — Convenciones

## Monorepo (pnpm workspaces)

- Cada package en packages/ tiene su propio package.json, tsconfig.json
- shared/ solo tiene types y constants — jamas logica
- Dependencias entre paquetes: `"@kaeldaw/audio-engine": "workspace:*"`
- Un paquete no puede importar desde otro que este mas arriba en la cadena de dependencias (ver architecture.md)
- src/__tests__/ dentro de cada package (unit, Vitest), e2e/ en apps/studio (Playwright)

## Nombrado

- **Archivos TS/TSX**: kebab-case (audio-engine.ts, transport-controls.tsx)
- **Componentes React**: PascalCase (TransportControls.tsx)
- **Web Components**: kebab-case con prefijo daw- (<daw-knob>, <daw-fader>)
- **Hooks**: camelCase con prefijo use (useTransport.ts)
- **Funciones**: camelCase
- **Tipos/interfaces**: PascalCase, prefijo T para tipos, I para interfaces (TAudioNode, IAudioNode)
- **Constantes**: UPPER_SNAKE_CASE (DEFAULT_BPM, SAMPLE_RATE)
- **Rust**: snake_case para funciones, PascalCase para tipos (oscillator::render())

## Componentes React

- Un componente por archivo
- Props tipadas con interface exportada
- Preferir funciones puras — evitar useMemo/useCallback hasta que sea necesario
- Componentes de UI sin logica de negocio (llaman a hooks)

## Web Components

- Atributos para configuracion, propiedades para estado reactivo
- Events personalizados con prefijo daw- (daw-change, daw-mousedrag)
- Sin dependencies — vanilla JS, cero frameworks
- Accesibilidad: aria-\* attributes y keyboard navigation

## Rust (crates/dsp)

- Cargo workspace en crates/
- Modulos por dominio (oscillators/, filters/, envelopes/)
- zero-cost abstractions: preferir iterators, generics, const generics
- No panico en hot path (process() callback)
- WASM: export con #[wasm_bindgen], tipos planos (f32, i32), sin Strings en hot path

## Audio Engine (packages/audio-engine)

- AudioContext es singleton: AudioContextManager.lazy()
- worklet/ nunca aloca memoria en process()
- Bridge via SharedArrayBuffer + Atomics — nunca postMessage en hot path
- Los meters leen SharedArrayBuffer en rAF — nunca React state para audio en tiempo real

## Estados

- Toda feature debe modelar: idle, loading, ready, error
- Errores con Result<T, E> (nunca throw)
- Loading con skeleton o placeholder

## Testing

- Unit: Vitest en cada package
- E2E: Playwright en apps/studio
- Audio: tests manuales en navegador + mocks de AudioContext para logica
- Nombre: `describe('Package/Feature')` + `it('should...')` en ingles

## Git

- Commits en español, formato: `<tipo>(<ambito>): mensaje`
- Tipos: `feat` (nueva feature), `fix` (correccion), `chore` (mantenimiento), `refactor` (refactorizacion), `docs` (documentacion), `style` (formato), `test` (tests), `perf` (rendimiento)
- Ambitos: `harness`, `audio-engine`, `ui`, `dsp`, `project`, `docs`, `config`
- Ejemplos:
  - `feat(audio-engine): transporte play/stop`
  - `fix(ui): knob no responde al click`
  - `chore(harness): actualizar reglas de supervision`
  - `refactor(dsp): optimizar ADSR`
  - `docs(readme): instrucciones de instalacion`
- Un feature por sesion, commit por paso significativo
- .harness/ se limpia del staging antes de push (.gitignore lo maneja automaticamente)
