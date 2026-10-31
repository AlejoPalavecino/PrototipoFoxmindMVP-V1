# Foxy AI — revalidación durable D2

- Agent / role: /root/foxy_green, slice_worker
- Session or task ID: /root/foxy_green; sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 64f613f
- Phase and detailed task/spec links: [Foxy AI](../../odd/tasks/foxy-ai-proposal.md), D2 grounding durable
- Status: completed

## Request and scope
Revalidar fuentes durables bajo autoridad de lease y compartir la reconstrucción con camino HTTP, sin cambiar pruebas ni datos retenidos.

## Work performed
Se extrajo reconstrucción de contexto/currículo/fuentes a grounding-rebuild.ts usada por grounding-snapshot.ts y claim-authority-check.ts. Autoridad expone revalidateGrounding: deniega lease/señal/propietario/aula inválidos y devuelve false ante cambios de fuente/currículo o pruebas no disponibles; aprovecha transacción inyectada. Se mantienen authorizeClaim/Document estrictos ante snapshot obsoleto.

## Verification
- `node --experimental-transform-types --test --test-reporter=dot apps/api/src/foxy-ai/foxy-durable-grounding.test.mjs apps/api/src/foxy-ai/foxy-claim-authority.test.mjs apps/api/src/foxy-ai/foxy-grounding-snapshot.test.mjs`: 39 PASS, exit 0; DB sintética temporal con rollback.
- `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0.
- Sin pruebas modificadas, proveedores ni datos retenidos.

## Commits and outcomes
Sin commit; revisión independiente pendiente.

## Handoff
Los controles revalidan en el momento de consulta; fencing de despacho y revalidación alrededor de IO siguen necesarios. Falta integración real de proveedor y FileAccess.
