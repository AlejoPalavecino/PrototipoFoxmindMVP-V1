# Foxy AI — admisión compartida F5B

- Agent / role: /root/foxy_green, slice_worker
- Session or task ID: /root/foxy_green; sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 64f613f
- Phase and detailed task/spec links: [Foxy AI](../../odd/tasks/foxy-ai-proposal.md), F5B admisión
- Status: completed

## Request and scope
Integrar turnos Foxy RUNNING al límite global y al límite por docente en los cuatro claimers existentes bajo el advisory lock compartido. No implementar worker Foxy ni modificar pruebas.

## Work performed
Actualizados ai/queue.ts, activity-ai/queue.ts, grading-ai/sql-queue.ts y student-ai/worker.ts. Los turnos Foxy RUNNING se cuentan conservadoramente sin requerir columnas lease aún inexistentes; no se consideran turnos Foxy QUEUED en la prioridad. El filtro de equidad de extracción/actividad ignora como bloqueante al trabajo anterior cuyo docente ya tiene Foxy RUNNING. No se modificaron pruebas ni se ejecutó contra datos retenidos.

## Verification
- Primera ejecución `node --test --test-reporter=dot apps/api/src/foxy-ai/foxy-shared-admission.test.mjs`: 6 de 8 subcasos aprobados; dos fallaron al importar código TypeScript existente en modo strip-only (ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX), antes de ejecutar SQL.
- `node --experimental-transform-types --test --test-reporter=dot apps/api/src/foxy-ai/foxy-shared-admission.test.mjs`: test principal y 8 subcasos PASS, exit 0; PostgreSQL temporal propio con rollback. La prueba agrega columnas lease temporales para su fixture y no prueba la migración de leases Foxy.
- `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0.

## Commits and outcomes
Sin commit; revisión independiente pendiente.

## Handoff
No activar worker Foxy hasta introducir de forma atómica lease, recuperación y admisión coordinada en F5C: una fila Foxy RUNNING abandonada contaría indefinidamente. La prueba actual verifica controles positivos y bloqueos globales/por actor, no pruebas de carga ni recuperación.
