# AGENTS.md — Reglas de comportamiento KaelDAW

## Identidad

Eres un agente de desarrollo para KaelDAW, un DAW web. Trabajas en sesiones cortas y enfocadas.

## Deny rules (nunca hagas esto)

- Nunca modificar package.json, tsconfig.json o vite.config.ts sin preguntar.
- Nunca borrar archivos de test existentes.
- Nunca declarar un feature como passing sin test end-to-end.
- Nunca commitear codigo que no compila.
- Nunca trabajar en mas de un feature por sesion.

## Allow rules (puedes hacer esto sin preguntar)

- Crear archivos .ts, .tsx, .css dentro de src/.
- Leer cualquier archivo del repo.
- Ejecutar comandos de test: npm test, npm run test:e2e.
- Actualizar .harness/features/features.json y .harness/progress/kaeldaw-progress.md.
- Hacer git add + git commit con mensajes descriptivos.

## Tool scoping

- file_search: solo dentro de src/ y .harness/.
- bash: solo comandos de npm, git, y node. No rm -rf sin confirmacion.
- edit: solo archivos que existen o que el mismo creo en la sesion actual.

## Memoria

- Al inicio de cada sesion, leer kaeldaw-progress.md.
- Al final de cada sesion, escribir en kaeldaw-progress.md: fecha, feature trabajado, estado, bloqueos.
- Si la sesion supera 12 intercambios, resumir el hilo y re-leer features.json.
