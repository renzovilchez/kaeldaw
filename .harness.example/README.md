# .harness — Sistema de desarrollo agéntico

Directorio privado de desarrollo que orquesta el flujo de trabajo entre un agente IA y el desarrollador. Cada desarrollador tiene el suyo (`.harness/` está en `.gitignore`).

## Estructura

```
.harness/
├── README.md              # Este archivo
├── features/
│   └── features.json      # Roadmap del proyecto (tareas, fases, estados)
├── specs/
│   ├── aer-template.md    # Template para escribir AERs
│   ├── active/            # AERs en escritura (borrador)
│   ├── approved/          # AERs aprobados, listos para implementar
│   ├── passing/           # AERs implementados y verificados
│   └── archive/           # AERs completados (historial)
├── rules/
│   ├── sdd.md             # Spec-Driven Development — ciclo completo
│   ├── git-flow.md        # Estrategia de ramas
│   ├── lifecycle.md       # Fases de trabajo por sesion
│   ├── supervision.md     # Control humano obligatorio
│   ├── permissions.md     # Permisos del agente por modo
│   └── testing.md         # Convenciones de testing
├── progress/
│   ├── session-progress.md  # Ultimas sesiones (carga rapida del agente)
│   └── session-archive.md   # Historial completo de sesiones (append-only)
├── context/               # Documentos del proyecto: arquitectura, convenciones, prioridades
├── prompts/               # Instrucciones para el agente (coding, eval, init)
└── workflows/             # Procedimientos operativos del agente
```

## Cada carpeta

### features/ — Roadmap

`features.json` contiene la lista de tareas del proyecto. Cada tarea tiene:

| Campo | Descripcion |
|-------|-------------|
| `id` | Identificador unico (feat-001, fix-001, chore-001) |
| `type` | Tipo: feat, fix, refactor, chore |
| `name` | Nombre descriptivo |
| `phase` | Fase (F0, F1, ...) |
| `priority` | Prioridad dentro de la fase (1 = mas alta) |
| `status` | pending, approved, working, failing, passing, archive |
| `package` | Paquete donde se implementa |
| `aer` | Ruta al AER en specs/ |
| `test` | Ruta al archivo de test principal |
| `depends` | IDs de tareas de las que depende |

Las fases son libres. Cada proyecto define las suyas. Si no tienes un roadmap definido, `features.json` puede estar vacio y crear tareas sobre la marcha.

### specs/ — AERs (Actor-Event-Response)

Cada tarea tiene un AER que especifica el comportamiento exacto sin ambigüedad. Viajan por 4 estados:

- `active/` → borrador, escribiendo
- `approved/` → listo para implementar
- `passing/` → implementado, tests pasan
- `archive/` → completado, commit hecho

Siempre se mueve el archivo (MOVE, no copy). El template `aer-template.md` tiene el formato completo.

### rules/ — Reglas del agente

- **sdd.md** — ciclo SDD: requerimiento → AER → tests → implementación → verificación
- **lifecycle.md** — fases de cada sesión de trabajo
- **supervision.md** — comandos peligrosos, modos de falla, protocolo de commit
- **permissions.md** — permisos de lectura/escritura por modo
- **testing.md** — estados y transiciones de features.json
- **git-flow.md** — estrategia de ramas (main, develop, feat-*, fix-*)

Son modificables. Si tu proyecto usa otro flujo, ajustalos.

### progress/ — Memoria del agente

El agente usa estos archivos para recordar el contexto entre sesiones:

- `session-progress.md` — resumen de las ultimas 5 sesiones (carga rapida al iniciar)
- `session-archive.md` — historial completo, append-only, busca por ID de sesion

Cada entrada incluye: fecha, feature trabajado, archivos modificados, decisiones técnicas, bloqueos, commits, siguiente paso.

Sin estos archivos el agente empieza cada sesion sin contexto.

### context/ — Documentación del proyecto

El agente lee esta carpeta para entender el proyecto. Tipico contenido:

- `architecture.md` — estructura del monorepo, stack tecnologico, dependencias entre paquetes
- `conventions.md` — naming, estructura de archivos, reglas de codigo

Sin estos archivos el agente no conoce la arquitectura ni las convenciones.

### prompts/ — Instrucciones de arranque

Archivos de texto que el agente lee al iniciar cada modo:

- `coding.txt` — flujo de trabajo para desarrollo normal
- `init.txt` — configuración inicial del proyecto
- `eval.txt` — lectura y evaluacion, sin modificar codigo

### workflows/ — Procedimientos

Archivos markdown con el paso a paso para cada tipo de tarea:

- `new-feature.md` — ciclo completo SDD para una feature nueva
- `fix-bug.md` — correccion de bugs
- `add-package.md` — agregar un nuevo paquete al monorepo
- `fix-bug.md` — correccion de bugs

Cada workflow describe fases, criterios y outputs esperados.

## Como empezar

1. `cp -r .harness.example .harness`
2. Pobla `context/` con la documentacion de tu proyecto
3. Pon `.harness/` en `.gitignore`
4. Ajusta `rules/` si tu flujo es diferente
5. Crea tu primer feature: escribe un AER en `specs/active/`, presentalo al agente

No hay dependencias externas. Solo archivos de texto.
