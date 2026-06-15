# Workflow: Fix Bug

## Pasos

1. Crear ticket en `backlog/tickets/` con estado `in_progress`
2. Identificar el bug, aislar el paquete responsable
3. (Recomendado) Escribir test que reproduce el bug
4. Arreglar el codigo
5. Verificar: build + lint + tests
6. Mostrar `git diff --stat` y proponer commit
7. Solo commitear cuando el usuario aprueba
8. Mover ticket a `done` y actualizar `progress/`
