# Workflow: Add Package

## Evaluacion

1. `¿Se puede implementar sin dependencia?` — si la respuesta es si, no agregar
2. Investigar alternativas: bundle size, licencia, mantenimiento, alternativas nativas
3. Preferir dependencias del ecosistema (React, Vite) sobre alternativas externas

## Instalacion

```bash
# Paquete de runtime en un package especifico
pnpm --filter @proyecto/package add <paquete>

# Paquete dev en un package especifico
pnpm --filter @proyecto/package add -D <paquete>

# Paquete en la raiz del monorepo (herramientas globales)
pnpm add -w -D <paquete>
```

## Verificacion

- `pnpm run build` no se rompe
- Si el paquete requiere modificar vite.config.ts, tsconfig.json o turbo.json, preguntar antes

## Commit

`git commit -m "chore(<scope>): add <paquete>"`

## Documentacion

Si la dependencia es estructural (cambia la arquitectura), actualizar .harness/context/architecture.md
