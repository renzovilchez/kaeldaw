# Workflow: Fix Bug

## Pasos

1. Identificar el bug: leer issue, reproducir, aislar el paquete responsable
2. Escribir test que reproduce el bug (debe fallar)
3. Arreglar el codigo en el paquete correspondiente
4. Verificar que el test nuevo pase y los existentes sigan pasando
5. `pnpm run build && pnpm run lint`
6. Commit: `git commit -m "fix(<scope>): <descripcion>"`

## Scope segun el area

| Bug en         | Scope                    |
| -------------- | ------------------------ |
| packages       | `fix(<package>): ...`    |
| apps           | `fix(<app>): ...`        |
| config/ci      | `fix(infra): ...`        |

## Notas

- No saltarse el paso 2 (test reproductor)
