# SDD — Spec-Driven Development con AER

SDD (Spec-Driven Development) es el ciclo de desarrollo del proyecto.
Todo feature empieza con una especificación AER, no con código.

## Ciclo completo SDD

```
Requerimiento (texto libre, grande, ambigüo)
    ↓  F0. Descomponer
Mini-tareas organizadas por fase y prioridad
    ↓  F1. AER (por cada mini-tarea)
AER preciso, sin ambigüedad
    ↓  F2. Aprobar
Tests derivados del AER (TDD red)
    ↓  F3. Tests
Implementación (TDD green)
    ↓  F4. Código
Verificación (build + lint + tests)
    ↓  F5. Handoff
features.json actualizado + AER a passing/
```

## Fase 0: Descomposición

Cuando el usuario da un requerimiento grande (ej: "construye un DAW"):
1. El agente descompone en mini-tareas atómicas
2. Cada mini-tarea se registra en features.json con su fase y prioridad
3. Se crea un AER borrador para cada una en specs/active/
4. El usuario revisa la descomposición antes de empezar

Criterios de atomicidad:
- Una mini-tarea implementa UNA sola cosa
- Se puede testear de forma aislada
- No depende de otras mini-tareas sin implementar (si depende, se ordena primero)

## Formato AER (ver .harness/specs/aer-template.md)

Cada especificación tiene:

| Campo | Qué define |
|-------|-----------|
| **Actor** | Quién inicia: User, System, AudioEngine, External |
| **Precondiciones** | Estado exacto antes del evento (binario, medible) |
| **Evento** | Acción atómica: `<Actor> <verbo> <objeto>` |
| **Respuesta** | Comportamiento observable, lista de afirmaciones |
| **Postcondiciones** | Estado exacto después (binario, medible) |
| **Escenarios** | Happy path + edge cases + errores |

## Tipos de tarea

Toda tarea en features.json tiene un campo `type` que define su naturaleza:

| `type` | ID | Uso |
|--------|----|-----|
| `feat` | feat-NNN | Nueva funcionalidad |
| `fix` | fix-NNN | Correccion de bug |
| `refactor` | refactor-NNN | Cambio estructural sin cambio funcional |
| `chore` | chore-NNN | Tooling, CI, configuracion |

Cada tipo tiene contador independiente (feat-001, fix-001, etc.).
El numero NNN **no indica orden de prioridad** — el orden lo definen
`priority` (dentro de fase) y `depends` (dependencias entre tareas).
Esto permite insertar tareas nuevas sin renumerar las existentes.

Los AERs se nombran `aer-{tipo}-{NNN}.md`: `aer-feat-012.md`, `aer-fix-001.md`.

## Reglas SDD

1. **Spec first**: No se escribe código sin AER aprobado
2. **Descomposición**: Un requerimiento grande se descompone antes de escribir AERs
3. **Tests from spec**: Cada escenario del AER genera al menos un test
4. **Test primero**: Los tests se escriben antes que la implementación (TDD)
5. **Red → Green**: Tests fallan primero, luego se implementa para que pasen
6. **Ambigüedad cero**: Si el AER tiene términos vagos, pedir clarificación
7. **Requerimiento original**: Se preserva en el AER para trazabilidad
8. **Una cosa a la vez**: Nunca implementar dos mini-tareas en paralelo

## Jerarquía

```
.harness/specs/
├── aer-template.md       # Template que todo AER debe seguir
├── active/               # AER en escritura (borrador)
├── approved/             # AER aprobado por el usuario, listo para implementar
├── passing/              # AER implementado y verificado (build + tests OK)
└── archive/              # AER completado — destino final, historico
```

## Transición de estados

```
borrador (requerimiento raw)
  → active/ (AER escrito, no revisado)
    → approved/ (usuario aprobó, listo para implementar)
      → passing/ (implementado, tests pasan, build OK)
        → archive/ (completado, feature marcado archive en features.json)
```

Cada transición requiere accion del agente:
- `active/ → approved/`: cuando el usuario dice "aprobado" o "empieza"
- `approved/ → passing/`: cuando la implementacion pasa build + lint + tests. El campo `test` en features.json se actualiza con la ruta al archivo de test principal.
- `passing/ → archive/`: cuando se hace el commit y se cierra la tarea

Cuando un AER llega a `archive/`, el feature en features.json debe estar en `archive`.

