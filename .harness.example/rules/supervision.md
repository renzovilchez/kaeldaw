# Supervision — Control humano obligatorio

## Principio

Todo cambio esta bajo supervision del usuario.
El agente propone, el usuario dispone.
Si hay duda, preguntar.

## 1. Comandos peligrosos — requieren aprobacion explicita

### Git destructivo
| Comando | Riesgo |
|---------|--------|
| `git reset --hard` | Descarta commits y cambios locales |
| `git checkout -- <file>` | Descarta cambios no commiteados |
| `git branch -D <name>` | Borra rama sin confirmacion |
| `git revert HEAD~N` | Revierte commits historicos |
| `git merge --no-ff` | Merge manual, puede crear conflictos |
| `git push --force` | Reescribe historial remoto |
| `git merge develop main` | Merge a main sin revision — requiere aprobacion |
| `git merge feat-* develop` | Merge de feature branch sin revision — requiere aprobacion |

### Archivos
| Comando | Riesgo |
|---------|--------|
| `rm -rf` / `Remove-Item -Recurse` | Borrado irreversible |
| `mv` / `Move-Item` a destino existente | Sobrescritura silenciosa |
| `npx create-*` | Instalacion global implicita |

### Publicacion
| Comando | Riesgo |
|---------|--------|
| `pnpm publish` | Publica al registro público |
| `gh pr create` | Crea PR sin revision |
| `gh pr merge` | Merge automatico |
| `gh repo delete` | Borra el repo remoto |

### Dependencias
| Comando | Riesgo |
|---------|--------|
| `pnpm remove` / `pnpm uninstall` | Elimina paquetes usados |
| `pnpm store prune` | Borra cache de paquetes |
| Editar `package.json` a mano | Puede romper dependencias |

**Regla**: Si el comando puede perder datos, romper el build, o afectar a otros, preguntar antes.

## 2. Protocolo de commit — siempre mostrar antes

Todo commit requiere aprobacion explicita del usuario.
Nunca hacer `git add` + `git commit` sin permiso.

Cuando una tarea esta lista para commit:
1. Mostrar `git status` — que archivos se tocaron
2. Mostrar `git diff --stat` — resumen de cambios por archivo
3. Si hay cambios inesperados, señalarlos
4. Proponer mensaje de commit: `<tipo>(<ambito>): <descripcion>`
5. Preguntar: "¿Confirmas el commit?"
6. Solo ejecutar commit cuando el usuario dice explicitamente que si

## 3. Ciclo supervisado

```
Usuario: "haz X"
  → Agente: plan (que, donde, como)
  → Usuario: aprueba, ajusta, o rechaza
  → Agente: ejecuta dentro de lo aprobado
  → Agente: verifica (build + lint + tests)
  → Agente: reporta cambios (git diff --stat) y propone commit
  → Usuario: revisa, pide cambios, o aprueba commit
  → Solo si el usuario dice "si", se hace el commit
```

## 3. Supervisión asincrona

Si el usuario hace cambios manuales entre mensajes del agente:
1. `git status` + `git diff` para leer el estado actual
2. Verificar que tests sigan pasando
3. Si hay conflicto, preguntar antes de continuar

## 4. Modos de falla — deteccion y recuperacion

| Falla | Síntoma | Recuperación |
|-------|---------|-------------|
| **AER bypass** | Se escribe código sin AER en approved/ | Parar. Preguntar: "No hay AER para esto. ¿Escribo uno?" |
| **AER huerfano** | AER en approved/ sin cambios en 2+ sesiones | Preguntar: "Este AER sigue vigente?" |
| **Tests sin AER** | Tests escritos que no referencian AER-ID | Preguntar: "Estos tests validan qué AER?" |
| **Spec drift** | Implementacion no coincide con el AER | Re-leer AER. Preguntar: "Cambio la spec o la impl?" |
| **Contexto stale** | Se pide algo que contradice architecture.md | Señalar la contradiccion. Preguntar como resolver |
| **Commit sin passing** | Codigo commiteado sin tests pasando | No marcar passing. Pedir tests primero |
| **Parallel features** | Dos features activos en la misma sesion | Rechazar. Terminar uno antes de empezar otro |
| **Config change** | Usuario pide cambiar package.json/tsconfig | Leer regla deny de AGENTS.md. Preguntar confirmacion |

## 5. Rollback

Si el usuario rechaza un cambio:
- `git checkout -- <file>` para cambios no commiteados (solo si el usuario confirma)
- `git revert <hash>` para cambios commiteados (preguntar antes)
- No hacer revert sin permiso explicito
