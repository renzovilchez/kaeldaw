# Lifecycle — Fases de trabajo

Requiere SDD. Ver .harness/rules/sdd.md.
Requiere supervision. Ver .harness/rules/supervision.md.

## Fase 1: AER (1 mensaje)
- Leer features.json. Identificar feature activo (estado pending).
- Crear AER en `.harness/specs/active/`.
- Presentar al usuario. Si aprueba: **mover** (Move-Item, no copiar) a `specs/approved/`.
- Leer architecture.md si el feature toca arquitectura nueva.
- Escribir plan de 3-5 pasos en session-progress.md.

## Fase 2: Implement (N mensajes)
- Ejecutar pasos del plan uno por uno.
- Despues de cada paso, mostrar cambios y preguntar antes de commit.
- Si se pierde el hilo, resumir y re-leer features.json + progress + specs.

## Fase 3: Test (1-2 mensajes)
- Correr tests unitarios del paquete (contra el AER, no contra la impl).
- Correr test end-to-end del feature.
- Si falla, volver a Fase 2. No marcar passing.

## Fase 4: Verificacion y revision
- Correr build + lint.
- **Mover** (Move-Item, no copiar) AER a `specs/passing/` (implementado + verificado).
- Mostrar git status + git diff --stat al usuario.
- Preguntar: "¿Confirmas el commit?"

## Fase 5: Handoff (solo cuando el usuario aprueba el commit)
- **Mover** (Move-Item, no copiar) AER a `.harness/specs/archive/` (completado).
- Actualizar features.json: estado passing.
- Escribir en session-progress.md y session-archive.md.
- Hacer git add + git commit del mensaje acordado.

## Compaction
- Trigger: 10 mensajes o 4000 tokens consumidos.
- Accion: resumir el hilo de la sesion en 200 palabras.
- Re-leer: features.json, session-progress.md, specs/approved/, y el plan actual.
- Continuar desde donde quedo.
