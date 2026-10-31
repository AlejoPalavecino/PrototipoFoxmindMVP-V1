# Foxy AI — unidad de trabajo H0

- Agent / role: /root/foxy_green, slice_worker
- Session or task ID: /root/foxy_green; sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 64f613f
- Phase and detailed task/spec links: [Foxy AI](../../odd/tasks/foxy-ai-proposal.md), H0 UoW
- Status: completed

## Request and scope
Crear unidad de trabajo con autenticación inyectada y rol docente verificado, locks por tipo de operación y revalidación de sesión, sin modificar pruebas ni tocar datos retenidos.

## Work performed
Añadido unit-of-work.ts y export en índice Foxy. Autentica antes de lock, bloquea usuario UPDATE en escrituras/SHARE en lecturas, valida rol y verificación, reautentica al adquirir lock y después de operación antes de commit. No contiene admisión ni lógica de origen/CSRF propia: esas reglas dependen del puerto authenticate inyectado. El timestamp del actor usa reloj del proceso y no debe emplearse para condiciones críticas de plazo sin acordarlo.

## Verification
- `node --experimental-transform-types --test --test-reporter=dot apps/api/src/foxy-ai/foxy-unit-of-work.test.mjs`: 4 PASS, exit 0; incluye espera y revocación en PostgreSQL temporal aislado.
- `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0.
- Sin pruebas modificadas, DB retenida, proveedor ni integración de transporte.

## Commits and outcomes
Sin commit; revisión independiente pendiente.

## Handoff
Conectar el puerto a autenticación real y asegurar que las tres comprobaciones sean sin readmisión, preserven Origin/CSRF y propaguen errores mediante transporte sanitizado. Probar sesión real y rollback de escritura tras revocación.

## Sanitización de errores — 2026-10-31
UoW preserva códigos de dominio/autenticación admitidos y convierte errores inesperados de SQL/driver en SERVICE_UNAVAILABLE sin detalle. La transacción sigue propagando el fallo y ejecuta rollback. `node --experimental-transform-types --test --test-reporter=dot apps/api/src/foxy-ai/foxy-unit-of-work.test.mjs`: 6 PASS, exit 0, incluida falla SQL real y rollback en PostgreSQL temporal; `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0. Pruebas sin editar.
