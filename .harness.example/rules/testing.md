# Testing — Protocolo obligatorio

## Antes de marcar passing

1. Test unitario del componente/hook/funcion nuevo.
2. Test de integracion si toca mas de un modulo.
3. Test end-to-end si toca UI o audio (con navegador real, no mocks de AudioContext).
4. pnpm run lint sin errores.
5. pnpm run build sin errores.

## features.json formato

```json
{
  "features": [
    {
      "id": "feat-001",
      "type": "feat",
      "name": "Nombre del feature",
      "phase": "F0",
      "priority": 1,
      "status": "archive",
      "package": "paquete",
      "aer": "specs/archive/aer-feat-001.md",
      "test": "packages/paquete/src/__tests__/Feature.test.ts",
      "depends": []
    }
  ]
}
```

## Campos de cada feature

| Campo | Descripcion |
|-------|-------------|
| `id` | Identificador unico (feat-NNN, fix-NNN, refactor-NNN, chore-NNN) |
| `type` | Tipo de tarea: `feat`, `fix`, `refactor`, `chore` |
| `name` | Nombre descriptivo |
| `phase` | Fase a la que pertenece (F0, F1, F2, F3) |
| `priority` | Prioridad dentro de la fase (1 = mas alta) |
| `status` | Estado actual |
| `package` | Paquete donde se implementa |
| `aer` | Ruta al archivo AER en specs/ |
| `test` | Ruta al test si existe |
| `depends` | IDs de features de las que depende |

## Estados permitidos

- pending: aun no empezado
- approved: AER aprobado, listo para implementar
- working: en desarrollo
- failing: tests no pasan
- passing: implementado, build + lint + tests OK
- archive: completado, commit realizado

## Transiciones validas

pending → approved → working → failing → passing → archive
approved y passing pueden volver a working si hay cambios.
passing no puede volver a pending sin evaluador.
