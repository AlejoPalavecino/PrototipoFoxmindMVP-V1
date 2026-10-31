# Foxy AI — autoridad de lease F5D

- Agent / role: /root/foxy_green, slice_worker
- Session or task ID: /root/foxy_green; sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 64f613f
- Phase and detailed task/spec links: [Foxy AI](../../odd/tasks/foxy-ai-proposal.md), F5D autoridad
- Status: completed

## Request and scope
Crear capacidades privadas revocables ligadas a lease y documentos seleccionados; sin sesiones falsas, modificación de pruebas ni datos retenidos.

## Work performed
Se añadieron claim-authority.ts y claim-authority-check.ts, exportados desde el índice Foxy. WeakMaps privados ligan objetos opacos a copia congelada de lease/snapshot y señal original. Cada autorización comprueba estado, nonce, vencimiento y edad con reloj SQL, titular docente verificado, conversación, aula activa y reconstrucción de currículo/fuentes; devuelve copias. Una transacción inyectada se reutiliza sin anidamiento. Se omiten locks de turno/aula en la comprobación para no invertir locks durante FileAccess.

## Verification
- `node --experimental-transform-types --test --test-reporter=dot apps/api/src/foxy-ai/foxy-claim-authority.test.mjs`: 16 PASS incluyendo test principal, PostgreSQL temporal propio y rollback; sin pruebas editadas.
- `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0.
- El harness usa DB sintética; no demuestra carrera completa de FileAccess/proveedor ni despacho real.

## Commits and outcomes
Sin commit; revisión independiente pendiente.

## Handoff
Integrar con FileAccess privado y actor de worker; mantener revalidación antes y después de IO, y fencing transaccional antes del despacho/aplicación. No se prueban exclusión mutua ni atomicidad de acciones externas a partir de una comprobación sin locks.
