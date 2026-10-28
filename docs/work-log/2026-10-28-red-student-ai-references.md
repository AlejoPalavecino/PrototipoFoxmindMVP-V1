# Referencias del análisis — pruebas RED atribuidas

- Agent / role: /root/red, test_runner
- Session or task ID: /root/red
- Persisted by: /root
- Date: 2026-10-28
- Branch / worktree: codex/student-journey-polish / ProtipoFoxMind
- Starting commit: 0f3407daf722eabab9670f66056584e45ddb5d8a (verificado por coordinador)
- Phase and detailed task/spec links: [análisis individual](../student-ai.md)
- Status: in_progress

## Request and scope
Pruebas de vínculo entre referencias anónimas y actividades, sin enviar títulos ni identidades al proveedor.

## Work performed
Creó pruebas de lectura docente con títulos y de permutación de actividades de métricas idénticas en tests/student-ai-integration.test.mjs; añadió tests/student-ai-references.test.mjs para presentación.

## Verification
RED observado por test_runner: filtros `teacher receives titles` y `reordering indistinguishable` fallan por falta de mapa y detección de permutación; prueba UI falla porque muestra A1 sin título. Mantener aserciones al implementar.

## Commits and outcomes
Ninguno.

## Handoff
Ejecutar las pruebas nuevamente contra el mapeo privado persistido y la interfaz; no relajar requisitos de privacidad.
