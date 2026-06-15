---
name: kaeldaw-session
description: Use ONLY at the start of every KaelDAW development session. Loads the current backlog, progress, and all session rules (deny/allow, commit conventions, git flow, supervision). After loading, always ask "¿Qué hacemos hoy?"
---

# KaelDAW Session Skill

Carga esta skill al inicio de cada sesión.

---

## 1. On load (al cargar esta skill)

Leer automáticamente:

1. `.harness/backlog/index.md` — qué hay pendiente, qué se está haciendo
2. `.harness/progress/kaeldaw-progress.md` — últimas 5 sesiones

Contexto adicional disponible (buscar si aplica):
- `.harness/context/architecture.md` — arquitectura del monorepo
- `.harness/context/conventions.md` — convenciones de código
- `.harness/progress/kaeldaw-archive.md` — historial completo por SES-ID

Después de leer, preguntar: *"¿Qué hacemos hoy?"*

---

## 2. Backlog system

### Formato de ticket

Cada ticket es un `.md` en `.harness/backlog/tickets/`:

```md
---
id: fix-002
type: fix
title: Descripción corta
status: done
---
```

### Estados

| Estado | Significado |
|--------|-------------|
| `backlog` | Idea anotada, sin decidir |
| `ready` | Listo para empezar |
| `in_progress` | Se está trabajando |
| `done` | Implementado y commiteado |

### Reglas

- Un ticket **no necesita AER**. Si el usuario lo entiende, alcanza.
- Para features grandes, el ticket describe el *qué*, no el *cómo detallado*.
- Si surge algo no previsto, se ajusta el ticket o se crea uno nuevo.
- No trabajar más de un ticket `in_progress` a la vez.

---

## 3. Session flow

```
1. Cargo skill → leo backlog + progress
2. Pregunto: "¿Qué hacemos hoy?"
3. Usuario elige ticket o pide crear uno nuevo
4. Si es nuevo: creo ticket en .harness/backlog/tickets/ con estado in_progress
5. Implemento el cambio
6. Verifico: build + lint + tests
7. Muestro git diff --stat y propongo commit
8. Solo commiteo cuando el usuario dice "sí"
9. Al cerrar: actualizo progress.md + archive.md
```

---

## 4. Deny rules (nunca hacer esto)

- Modificar `package.json`, `tsconfig.json`, `vite.config.ts` sin preguntar.
- Borrar archivos de test existentes.
- Commiteear código que no compila.
- Trabajar en más de un ticket por sesión.
- Hacer `git push`, `pnpm publish`, `gh pr create`, `gh pr merge` sin orden directa.
- Hacer `git commit` sin mostrar los cambios y preguntar primero.
- Mergear ramas (`develop → main`, `feat-* → develop`) sin aprobación explícita.
- Commiteear directo a `main`.
- Mover/renombrar archivos existentes sin preguntar.
- Borrar archivos con `rm -rf` / `Remove-Item -Recurse` sin confirmación.

---

## 5. Allow rules (puedo hacer esto sin preguntar)

- Leer cualquier archivo del repo.
- Crear archivos `.ts`, `.tsx`, `.css`, `.rs` dentro de `apps/`, `packages/`, `crates/`.
- Crear archivos `.md` dentro de `.harness/backlog/tickets/`.
- Ejecutar `pnpm run build`, `pnpm run lint`, `pnpm run test`.
- Hacer `git checkout -b` para ramas `feat-*`, `fix-*`, `refactor-*`, `chore-*`.
- Hacer checkout entre ramas existentes.
- Actualizar `.harness/progress/kaeldaw-progress.md` y `kaeldaw-archive.md`.

---

## 6. Commit conventions

### Formato

```
<tipo>(<ámbito>): <descripción en español>
```

| Tipo | Uso |
|------|-----|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `refactor` | Cambio estructural sin cambio funcional |
| `chore` | Tooling, CI, config, lint |

### Ámbito (paquete → nombre)

| Paquete | Ámbito |
|---------|--------|
| apps/studio | `studio` |
| packages/audio-engine | `audio-engine` |
| packages/sequencer | `sequencer` |
| packages/mixer | `mixer` |
| packages/instruments | `instruments` |
| packages/plugin-system | `plugin-system` |
| packages/project | `project` |
| packages/shared | `shared` |
| packages/ui-controls | `ui-controls` |
| packages/ui-kit | `ui-kit` |
| crates/dsp | `dsp` |
| root (varios paquetes) | separar con coma: `audio-engine,project` |

### Reglas

- Mostrar `git diff --stat` antes de cada commit.
- Esperar aprobación explícita del usuario.
- Descripción en español, presente, imperativo.

---

## 7. Git flow resumen

| Rama | Propósito |
|------|-----------|
| `main` | Releases estables |
| `develop` | Integración diaria, cambios chicos directo |
| `feat-*` / `fix-*` / `refactor-*` / `chore-*` | Cambios grandes |

- Ramas temporales desde `develop`, destino `develop`.
- `develop → main` solo cuando está estable y tú lo apruebas.

---

## 8. Supervisión

### Comandos que requieren aprobación explícita

- `git reset --hard`, `git checkout -- <file>`, `git branch -D`
- `git revert`, `git push --force`, `git merge`
- `rm -rf` / `Remove-Item -Recurse`
- `pnpm publish`, `gh pr create`, `gh pr merge`
- Instalar/remover dependencias

### Protocolo de commit

1. Muestro `git status` + `git diff --stat`
2. Propongo mensaje de commit
3. Pregunto: "¿Confirmas el commit?"
4. Solo ejecuto si dices que sí

---

## 9. Arquitectura rápida

### Dirección de dependencias (nunca violar)

```
shared → crates/dsp → audio-engine → sequencer/mixer/instruments/plugin-system → project → ui-controls → ui-kit → apps/studio
```

### Stack

| Capa | Tecnología |
|------|-----------|
| App shell | Vite + React 19 + TypeScript strict |
| Estado | Zustand (un store por dominio) |
| Componentes críticos | Web Components vanilla + Canvas 2D |
| Audio runtime | Web Audio API + AudioWorklet |
| DSP engine | Rust → WASM (wasm-pack) |
| Concurrencia | SharedArrayBuffer + Atomics |
| Monorepo | pnpm workspaces + Turborepo |

### Convenciones

- Comillas dobles siempre (`"`), no simples.
- Tipado explícito en exports, inferido en locals.
- Tests con Vitest, en `__tests__/` al lado del source.
- Sin comentarios en código (ni JSDoc, ni inline).

---

## 10. Tool scoping

| Tool | Alcance |
|------|---------|
| `file_search` | `apps/`, `packages/`, `crates/`, `.harness/` |
| `bash` | Solo pnpm, git, node. `rm -rf` requiere confirmación |
| `edit` / `write` | Solo archivos existentes o creados en la sesión actual |

---

## 11. Memoria y cierre de sesión

- Buscar contexto histórico por SES-ID en `.harness/progress/kaeldaw-archive.md`.
- Si la sesión supera 12 intercambios, re-leer backlog/index.md y progress.md.
- Al final:
  1. Mover tickets `in_progress` a `done` si corresponde.
  2. Escribir resumen en `.harness/progress/kaeldaw-progress.md`.
  3. Append del detalle en `.harness/progress/kaeldaw-archive.md`.

---

## 12. Requisitos del proyecto

Para features Rust: `rustc >= 1.80`, `wasm-pack >= 0.13`,
`wasm32-unknown-unknown` instalado, y linker C disponible.
Para TS/JS: solo Node.js + pnpm.
