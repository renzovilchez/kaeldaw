# .harness — Sistema de desarrollo agéntico

Directorio privado de desarrollo que orquesta el flujo de trabajo entre un agente IA y el desarrollador.
Cada desarrollador tiene el suyo (poner `.harness/` en `.gitignore`).

---

## Estructura

```
.harness/
├── README.md              # Este archivo
├── backlog/
│   ├── index.md           # Estado actual: goals, tickets, progreso
│   └── tickets/           # Tickets individuales (feat, fix, refactor, chore)
├── skills/
│   └── session.md         # Skill para cargar al iniciar sesion (opencode)
├── progress/
│   ├── session-progress.md  # Ultimas sesiones
│   └── session-archive.md   # Historial completo (append-only)
├── context/               # Documentacion del proyecto
├── rules/
│   ├── git-flow.md        # Estrategia de ramas
│   └── supervision.md     # Comandos peligrosos y protocolo de commit
├── features/
│   └── features.json      # (opcional) Roadmap historico
├── specs/
│   └── aer-template.md    # (opcional) Para features complejas
├── prompts/               # Instrucciones de arranque
└── workflows/             # Procedimientos del agente
```

---

## Sistema de trabajo

### Backlog tickets

Los tickets están en `backlog/tickets/`. Cada uno es un `.md` con frontmatter:

```md
---
id: feat-001
type: feat
title: Descripcion corta
status: ready
---
```

Estados: `backlog` → `ready` → `in_progress` → `done`

- Un ticket **no necesita AER**. Si el usuario lo entiende, alcanza.
- Para features complejas, se puede escribir un AER opcional en `specs/`.
- No trabajar más de un ticket `in_progress` a la vez.

### Skills (opencode)

Si usas opencode como agente, copia `skills/session.md` a
`.opencode/skills/<tu-proyecto>/SKILL.md` y adáptalo.

Al empezar cada sesión: `skill <tu-proyecto>`

### Sesión típica

```
1. Agente carga skill → lee backlog + progress
2. Pregunta: "¿Qué hacemos hoy?"
3      . Desarrollador elige ticket
4. Agente implementa, verifica (build + lint), muestra cambios
5. Solo commitea cuando el desarrollador aprueba
6. Al cerrar: actualiza progress
```

### AER (opcional, solo para features complejas)

Para features grandes o ambiguas, se puede escribir un AER en `specs/`
usando `aer-template.md`. No es obligatorio — los tickets describen el *qué*.

---

## Como empezar

1. `cp -r .harness.example .harness`
2. Pon `.harness/` en `.gitignore`
3. Puebla `context/` con la documentacion de tu proyecto
4. Ajusta `rules/git-flow.md` a tu estrategia de ramas
5. Crea `backlog/tickets/` con tu primer ticket
6. Si usas opencode, copia `skills/session.md` a `.opencode/skills/`
