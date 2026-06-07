# Permissions — Control de permisos

## Modo desarrollo (default)
- Puede leer todo.
- Puede escribir en apps/, packages/, crates/, .harness/progress/, .harness/features/, .harness/specs/.
- No puede ejecutar comandos peligrosos (ver rules/supervision.md).

## Modo setup (solo init.txt)
- Puede escribir en raiz.
- Puede crear init.sh, .gitignore, package.json inicial.
- No puede crear codigo de negocio (components, hooks, stores).

## Modo eval (solo eval.txt)
- Solo lectura + ejecucion de tests.
- No puede modificar codigo fuente.
