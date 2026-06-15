---
name: session
description: Cargar al inicio de cada sesion de desarrollo. Lee backlog y progress, aplica reglas del harness, y pregunta que hacer hoy.
---

# Session Skill

## On load

1. Leer `backlog/index.md`
2. Leer `progress/session-progress.md`
3. Preguntar: *"¿Que hacemos hoy?"*

## Reglas

- No modificar `package.json`, `tsconfig.json` sin preguntar.
- No borrar tests existentes.
- No commitear codigo que no compila.
- No trabajar mas de un ticket a la vez.
- No hacer `git push`, `git merge`, `gh pr create` sin orden directa.
- No hacer `git commit` sin mostrar cambios y preguntar primero.
- Commits: `<tipo>(<ambito>): <descripcion>`. Tipos: feat, fix, refactor, chore.
- Mostrar `git diff --stat` antes de commitear.
- Al cerrar sesion: actualizar `progress/session-progress.md`.

## Supervision

Comandos que requieren aprobacion explicita:
- `git reset --hard`, `git checkout -- <file>`, `git branch -D`
- `git revert`, `git push --force`, `git merge`
- `rm -rf` / `Remove-Item -Recurse`
- Instalar/remover dependencias
