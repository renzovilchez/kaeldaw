# Git Flow — Estrategia de ramas

## Ramas permanentes

| Rama | Proposito | Origen | Destino |
|------|-----------|--------|---------|
| `main` | Releases estables y usables | `develop` | — |
| `develop` | Integracion diaria, features chicos directo | `main` | `main` |

## Ramas temporales

| Rama | Proposito | Origen | Destino |
|------|-----------|--------|---------|
| `feat-<id>/<desc>` | Features grandes y complejos | `develop` | `develop` |
| `fix-<id>/<desc>` | Fixes que requieren aislamiento | `develop` | `develop` |
| `refactor-<id>/<desc>` | Refactors estructurales | `develop` | `develop` |
| `chore-<id>/<desc>` | Tooling, CI, configs | `develop` | `develop` |

### Convencion de nombres

- `feat-004/ci-github-actions`
- `feat-012/envelopes-adsr-wasm`
- `fix-001/playwright-timeout`
- `refactor-001/crates-restructure`
- `chore-001/update-eslint`

Usar kebab-case despues del ID. El formato es `{tipo}-{NNN}/{descripcion}` donde el ID
corresponde al campo `id` en features.json (ej: `feat-012`, `fix-001`).

### Tipos de tarea y contadores independientes

Cada tipo tiene su propia secuencia numerica:

| Tipo | Contador | Ejemplos |
|------|----------|----------|
| `feat` | feat-001, feat-002, ... | Nuevas funcionalidades |
| `fix`  | fix-001, fix-002, ... | Correccion de bugs |
| `refactor` | refactor-001, ... | Cambios estructurales sin cambio funcional |
| `chore` | chore-001, ... | Tooling, CI, configuracion |

El numero NNN es solo un **ID unico del tipo**, no indica orden de ejecucion.
El orden real lo determinan `priority` y `depends` en features.json.

## Reglas

### Que va donde

| Tamano | Ejemplo | Va en |
|--------|---------|-------|
| Chico (< 5 archivos, 1 sesion) | CI workflow, config, typo fix | `develop` directo |
| Mediano (5-15 archivos, 2-3 sesiones) | Componente UI, store, package nuevo | Rama `feat-*` |
| Grande (> 15 archivos, 3+ sesiones) | Motor audio, WASM, frontend complete | Rama `feat-*` |

### Política de merges

1. **develop → main**: solo cuando develop esta estable, usable, y tested. Requiere aprobacion del usuario.
2. **feat-* → develop**: via merge simple (no fast-forward). Requiere que build + lint + tests pasen.
3. **NUNCA** commitear directo a `main` (excepto el primer commit inicial).

### CI triggers

- Push a `main` → CI
- Push a `develop` → CI
- PR contra `main` → CI
- PR contra `develop` → CI
- Push a ramas `feat-*` / `fix-*` → CI (opcional, segun config)
