# Workflow: New Feature

Este workflow sigue SDD (Spec-Driven Development).
Ningún feature comienza sin un AER aprobado.

## Fase 0: Descomposición (solo para requerimientos grandes)

Cuando el usuario da un requerimiento grande (ej: "construye un DAW"):

1. El agente analiza el requerimiento y lo descompone en mini-tareas atómicas
2. Cada mini-tarea se registra en features.json con:
   - `id` autoincremental (feat-001, feat-002...)
   - `phase` según la fase (F0, F1, F2, F3)
   - `priority` dentro de la fase
   - `status: "pending"`
   - `package` donde se implementará
   - `depends` con las features necesarias antes
3. Se crea un AER borrador por cada mini-tarea en `specs/active/`
4. El usuario revisa y aprueba la descomposición **antes de empezar**

Criterios de atomicidad:
- Una mini-tarea hace UNA sola cosa
- Se puede testear de forma aislada
- Dependencias explicitas en `depends`

## Fase 1: AER — Especificación

1. El usuario escribe un requerimiento o se toma la mini-tarea descompuesta
2. El agente produce un AER en `.harness/specs/active/aer-XXX.md`
3. El usuario revisa, corrige y **aprueba** el AER
4. El AER se mueve a `.harness/specs/approved/`
5. Checklist:
   - [ ] Actor definido sin ambigüedad
   - [ ] Precondiciones binarias y medibles
   - [ ] Evento en formato `<Actor> <verbo> <objeto>`
   - [ ] Respuesta lista de afirmaciones exactas
   - [ ] Postcondiciones binarias y medibles
   - [ ] Escenarios de test (happy path + edge cases)

## Fase 2: Tests (TDD — Red)

1. Leer el AER aprobado
2. Escribir tests que cubren los escenarios del AER
3. Los tests deben **fallar** (red) — si pasan, algo está mal
4. Ubicación del test según el paquete:

| Paquete | Tests en |
|---------|----------|
| packages/*/ | packages/*/src/__tests__/ (Vitest) |
| apps/*/ | apps/*/e2e/ (Playwright) |

## Fase 3: Implementación (TDD — Green)

1. Implementar el código mínimo para que los tests pasen
2. No optimizar antes de tiempo — primero que pase
3. Ubicación según tipo (ver tabla en Fase 2)

## Fase 4: Verificación

- [ ] Tests unitarios del paquete pasan
- [ ] Tests e2e pasan (si aplica)
- [ ] `pnpm run build` sin errores
- [ ] `pnpm run lint` sin errores

## Fase 5: Revision y commit

1. Mostrar `git status` + `git diff --stat` al usuario
2. Proponer mensaje: `feat(<ambito>): <descripcion>`
3. Preguntar: "¿Confirmas el commit?"
4. Solo si el usuario dice que si:
   - Mover AER a `.harness/specs/passing/aer-XXX.md`
   - Actualizar features.json: `pending -> working -> passing`
   - Actualizar session-progress.md y session-archive.md
   - `git add` + `git commit -m "feat(<ambito>): <descripcion>"`
