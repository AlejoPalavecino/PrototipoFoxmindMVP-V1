# Home: accesibilidad por rol — completado

- Agent / role: home_fix / slice worker
- Session or task ID: /root/home_fix
- Date: 2026-10-31
- Branch / worktree: codex/exclusive-account-roles / ProtipoFoxMind
- Starting commit: 5d9fbc74095ae73c7ccf67bbe785df00ab5c12fa
- Phase and detailed task/spec links: roles exclusivos; [especificación](../foxmind-v1-functional-spec.md)
- Status: completed

## Request and scope
Corregir el mensaje accesible de Inicio vacío por rol, manteniendo historial y participación; no modificar pruebas.

## Work performed
En apps/classrooms-ui/home-labels.ts el mensaje de participación vacía orienta a docentes a crear un aula y a estudiantes a unirse. En apps/classrooms-ui/Home.tsx se pasa el rol a HomeGreeting y al generador del mensaje. Se preservaron las ramas de historial y participación y los cambios previos compartidos.

## Verification
- `node --test --test-reporter=dot tests/home-reference-dashboard.test.mjs`: salida 0; ocho puntos, pruebas focales aprobadas.
- `npx tsc --noEmit -p apps/web/tsconfig.json --pretty false`: salida 0.
- `npm run --silent lint:boundaries`: salida 0, `Architecture AST boundaries passed`.

## Commits and outcomes
Sin commit propio; cambios entregados al coordinador en el árbol compartido.

## Handoff
El coordinador debe integrar este resultado con las demás verificaciones del trabajo de roles exclusivos.
