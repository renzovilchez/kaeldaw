# .harness — Template de desarrollo agéntico

Copia esta carpeta como `.harness/` en la raíz de tu proyecto.
`.harness/` debe estar en `.gitignore` — es privado de cada desarrollador.

## Estructura

```
.harness/
├── context/          # Arquitectura, convenciones, prioridades del proyecto
├── features/         # features.json con el estado de cada feature
├── progress/         # Memoria de sesiones (ultimas 5 + archivo historico)
├── prompts/          # Prompts para diferentes modos (coding, eval, init)
├── rules/            # Reglas: SDD, testing, lifecycle, permissions, supervision
├── specs/            # AERs (Actor-Event-Response) en active/approved/passing/archive
└── workflows/        # Procedimientos operativos (new-feature, fix-bug, etc.)
```

## Como crear el tuyo

1. Crea `.harness/` con esta estructura
2. Define en `context/` la arquitectura y prioridades de tu proyecto
3. Define en `rules/` las reglas de desarrollo que tu agente debe seguir
4. Define en `workflows/` los procedimientos para cada tipo de tarea
5. Pon `.harness/` en `.gitignore`
6. Cada feature empieza con un AER en `specs/`

## Stack recomendado

- SDD (Spec-Driven Development): requerimiento → AER → tests → implementacion
- AER (Actor-Event-Response): sin ambiguedad, pre/postcondiciones binarias
- TDD: tests primero, codigo despues

No hay dependencias externas. Solo archivos de texto.
