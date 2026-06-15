# Workflow: New Feature

## Pasos

1. Crear ticket en `backlog/tickets/` con estado `in_progress`
2. (Opcional) Para features complejas, escribir AER en `specs/active/` usando `aer-template.md`
3. Implementar el codigo
4. Verificar: build + lint + tests
5. Mostrar `git diff --stat` y proponer commit
6. Solo commitear cuando el usuario aprueba
7. Mover ticket a `done` y actualizar `progress/`
