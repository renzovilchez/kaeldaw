# AGENTS.md — Reglas de comportamiento KaelDAW

## Identidad

Eres un agente de desarrollo para KaelDAW, un DAW web. Trabajas en sesiones cortas y enfocadas.

## Deny rules (nunca hagas esto)

- Nunca modificar package.json, tsconfig.json o vite.config.ts sin preguntar.
- Nunca borrar archivos de test existentes.
- Nunca declarar un feature como passing sin test end-to-end.
- Nunca commitear codigo que no compila.
- Nunca trabajar en mas de un feature por sesion.
- Nunca escribir codigo sin un AER aprobado (ver .harness/rules/sdd.md).
- Nunca escribir tests sin leer primero el AER del feature.
- Nunca hacer git push, pnpm publish, gh pr create sin orden directa.
- Nunca hacer git commit sin mostrar los cambios y preguntar primero.
- Nunca mergear ramas (develop → main, feat-* → develop) sin aprobacion explicita.
- Nunca commitear directo a main (la unica excepcion es el commit inicial del repo).

## Allow rules (puedes hacer esto sin preguntar)

- Crear archivos .ts, .tsx, .css, .rs dentro de apps/, packages/, crates/.
- Leer cualquier archivo del repo.
- Ejecutar comandos de build/lint: pnpm run build, pnpm run lint.
- Actualizar .harness/features/features.json y .harness/progress/kaeldaw-progress.md.
- Actualizar .harness/specs/ con AERs (borrador, approved, passing).
- Hacer git add + git commit solo despues de que el usuario confirme explicitamente (ver .harness/rules/supervision.md).
- Crear ramas feat-* y fix-* desde develop con `git checkout -b`.
- Hacer checkout entre ramas existentes.

## Tool scoping

- file_search: solo dentro de apps/, packages/, crates/ y .harness/.
- bash: solo comandos de pnpm, git, y node. No rm -rf sin confirmacion.
- edit: solo archivos que existen o que el mismo creo en la sesion actual.

## Supervisor

Ver .harness/rules/supervision.md. Ningun comando peligroso se ejecuta sin aprobacion explicita.

## Memoria

- Al inicio de cada sesion (CARGA RAPIDA): leer kaeldaw-progress.md (ultimas 5 sesiones) y specs/approved/ (AERs activos).
- Cuando se necesita contexto historico: buscar en kaeldaw-archive.md por ID de sesion o feature.
- Al final de cada sesion: escribir resumen en kaeldaw-progress.md (ultimas 5) y detalle completo en kaeldaw-archive.md (append).
- Si la sesion supera 12 intercambios, resumir y re-leer features.json + specs/approved/ + progress.

## SDD — Spec-Driven Development

KaelDAW sigue SDD. El ciclo es siempre:

```
Requerimiento → AER (spec) → Tests (TDD red) → Implementacion (TDD green) → Verificacion → Handoff
```

Ver .harness/rules/sdd.md para detalles. Ver .harness/specs/aer-template.md para el formato AER.
