# KaelDAW — Arquitectura

## Estado actual

La app arranca con Vite + React. Estructura mínima funcional:

```
apps/studio/
  src/
    main.tsx        # Entry point
    App.tsx         # Componente raíz
    index.css       # Estilos globales
```

---

## Stack

| Capa                 | Tecnología                          | Notas                                                 |
| -------------------- | ----------------------------------- | ----------------------------------------------------- |
| App shell            | Vite + React 19 + TypeScript strict | Entry point en apps/studio/                           |
| Estado               | Zustand                             | Un store por dominio, no un god store                 |
| Componentes críticos | Web Components vanilla              | Sin framework, canvas 2D                              |
| Componentes React    | React wrapping Web Components       | En packages/ui-kit/                                   |
| Rendering            | Canvas 2D                           | Migración a WebGL cuando el dolor sea real — no antes |
| Audio runtime        | Web Audio API + AudioWorklet        | Hilo de audio separado del main thread                |
| DSP engine           | Rust → WebAssembly (wasm-pack)      | En crates/dsp/, cero conocimiento de JS               |
| Concurrencia         | SharedArrayBuffer + Atomics         | Comunicación main thread ↔ audio thread               |
| Monorepo             | pnpm workspaces + Turborepo         | Solo pnpm. Prohibido npm. Nunca yarn                  |
| Backend              | NestJS + PostgreSQL + Prisma        | Repo separado: kaeldaw-server                         |

---

## Estructura del monorepo — estado actual y planeado

```
kaeldaw/                          # repo principal
│
├── apps/
│   └── studio/                   # ← EXISTE AHORA — la app web
│       └── src/
│           ├── shell/            # providers raíz, layout base       [PLANEADO]
│           ├── workspace/        # área de trabajo — ensambla paneles [PLANEADO]
│           └── main.tsx          # ← EXISTE AHORA
│
├── packages/                     # todo lo de abajo es PLANEADO
│   │
│   ├── shared/                   # SOLO tipos y constantes — sin lógica
│   │   └── src/
│   │       ├── types/            # tipos que cruzan paquetes
│   │       └── constants/        # SAMPLE_RATE, BUFFER_SIZE, MIDI constants
│   │
│   ├── audio-engine/             # Web Audio API, AudioWorklet, clock, bridge
│   │   └── src/
│   │       ├── worklet/          # AudioWorkletProcessor — corre en hilo de audio
│   │       ├── graph/            # nodos y conexiones Web Audio
│   │       ├── clock/            # BPM, transport, PPQN
│   │       └── bridge/           # SharedArrayBuffer + Atomics
│   │
│   ├── sequencer/                # timeline, piano roll, patrones, automation
│   ├── mixer/                    # canales, sends, routing de mezcla
│   │
│   ├── instruments/              # synths y samplers
│   │   └── src/
│   │       ├── _template/        # copiar esto para crear un instrumento nuevo
│   │       ├── synth-poly/       # sintetizador polifónico básico
│   │       └── sampler/          # sampler básico con SFZ
│   │
│   ├── plugin-system/            # WAM 2.0, registry, sandbox
│   │   └── src/
│   │       ├── protocol/         # contrato que todo plugin debe cumplir
│   │       ├── wam/              # adaptador Web Audio Modules 2.0
│   │       ├── registry/         # plugins instalados
│   │       └── sandbox/          # aislamiento via iframe + postMessage
│   │
│   ├── project/                  # estado de verdad del proyecto abierto
│   │   └── src/
│   │       ├── stores/           # Zustand — transport, tracks, mixer, project
│   │       ├── history/          # undo/redo con Command Pattern
│   │       │   └── commands/     # un archivo por acción (add-track, move-clip...)
│   │       ├── schema/           # definición versionada del formato .kaeldaw
│   │       ├── migrations/       # migración entre versiones del schema
│   │       ├── serialization/    # proyecto ↔ archivo .kaeldaw
│   │       └── interop/          # estándares externos
│   │           ├── midi/         # import/export .mid (MIDI 1.0)
│   │           ├── dawproject/   # import/export .dawproject
│   │           └── stems/        # export WAV multitrack
│   │
│   ├── ui-controls/              # Web Components vanilla — framework-agnostic
│   │   └── src/
│   │       ├── knob/             # <daw-knob>
│   │       ├── fader/            # <daw-fader>
│   │       ├── waveform/         # <daw-waveform> — Canvas 2D
│   │       ├── piano-keys/       # <daw-piano-keys>
│   │       ├── meter/            # <daw-meter> — lee SharedArrayBuffer en rAF
│   │       └── spectrum/         # <daw-spectrum> — Canvas 2D, datos FFT
│   │
│   └── ui-kit/                   # React — compone ui-controls, conecta stores
│       └── src/
│           ├── panels/           # TrackPanel, MixerPanel, PianoRollPanel...
│           ├── theme/            # tokens CSS, variables, dark/light
│           └── hooks/            # useTransport, useTracks, useMeter
│
├── crates/                       # Rust workspace
│   └── dsp/                      # Rust → WASM — cero deps JS
│       └── src/
│           ├── oscillators/      # sine, saw, square, wavetable
│           ├── filters/          # biquad, ladder (Moog)
│           ├── envelopes/        # ADSR
│           └── effects/          # delay, reverb
│
├── scripts/
│   ├── build-wasm.mjs            # compila crates/dsp con wasm-pack
│   └── set-feature-status.mjs    # actualiza estado en features.json
│
├── .harness/                     # GITIGNORED — sistema agéntico privado
├── .harness.example/             # público — template + paso a paso
├── AGENTS.md                     # contexto para agentes y contribuidores
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## Dirección de dependencias — nunca violar esto

```
shared
  ↑
crates/dsp  (Rust → WASM)
  ↑
audio-engine
  ↑
sequencer / mixer / instruments / plugin-system
  ↑
project  (stores + history + serialization)
  ↑
ui-controls  (Web Components, vanilla)
  ↑
ui-kit  (React)
  ↑
apps/studio
```

Si un paquete necesita importar desde algo que está encima en esta cadena,
la arquitectura está mal. Parar y rediseñar antes de continuar.

---

## Formato de proyecto — .kaeldaw

Los proyectos se guardan como archivos `.kaeldaw`.
Internamente es un ZIP que contiene:

```
proyecto.kaeldaw (ZIP)
├── project.json      # estado del proyecto, schema versionado
└── assets/
    └── samples/      # archivos de audio referenciados
```

`project.json` siempre tiene un campo `version` (semver).
Cualquier cambio al schema requiere una migration en `packages/project/src/migrations/`.
Romper proyectos de versiones anteriores no es aceptable.

---

## Estándares de audio implementados

| Estándar                      | Estado   | Paquete                    |
| ----------------------------- | -------- | -------------------------- |
| MIDI 1.0 import/export (.mid) | planeado | project/interop/midi       |
| MIDI 2.0 interno              | planeado | audio-engine, sequencer    |
| DAWproject (.dawproject)      | planeado | project/interop/dawproject |
| WAV stems export              | planeado | project/interop/stems      |
| Web Audio Modules 2.0 (WAM)   | planeado | plugin-system/wam          |
| SFZ presets (samplers)        | planeado | instruments/sampler        |
| Ableton Link (sync de tempo)  | futuro   | audio-engine/clock         |
| OSC (control externo)         | futuro   | TBD                        |

Actualizar estado a medida que se implementa: `planeado → en progreso → hecho`

---

## Reglas críticas de audio — no son opcionales

- El AudioWorklet **nunca aloca memoria** en el callback `process()`
- La comunicación main thread → audio thread es via SharedArrayBuffer, no postMessage
- Los meters y el playhead **nunca pasan por React state** — leen SharedArrayBuffer en `requestAnimationFrame`
- Los mocks de AudioContext no cuentan como verificación de features de audio

---

## Fases de construcción

### Fase 0 — Fundación (ahora)

Motor de audio funcionando, un oscilador que suena desde Rust/WASM,
formato `.kaeldaw` básico guardando y cargando.
Sin esto nada lo demás tiene sentido.

### Fase 1 — DAW básico usable

Timeline con clips, piano roll básico, mixer con volumen y pan,
un synth en WASM, Canvas 2D para waveform y piano roll, export WAV.

### Fase 2 — Plataforma

Import/export MIDI y DAWproject, sistema de presets,
WAM para plugins de terceros, Ableton Link.

### Fase 3 — Ecosistema

Marketplace de plugins, colaboración en tiempo real,
versioning de proyectos en nube (requiere kaeldaw-server).

---

_Este archivo describe la arquitectura destino. El estado actual es un scaffold Vite+React mínimo en apps/studio/src/._
_Para el detalle de convenciones de código, ver .harness/context/conventions.md_
_Para el backend, ver el repo kaeldaw-server_
