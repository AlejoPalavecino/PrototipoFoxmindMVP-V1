# Foxy AI — lector documental F4C

- Agent / role: /root/foxy_green, slice_worker
- Session or task ID: /root/foxy_green; sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 64f613f
- Phase and detailed task/spec links: [Foxy AI](../../odd/tasks/foxy-ai-proposal.md), F4C lector
- Status: completed

## Request and scope
Leer PDF/DOCX de aula con solicitud real, validar custodia e integridad y reutilizar parser existente; sin editar pruebas ni usar bases retenidas.

## Work performed
Se creó apps/api/src/files/foxy-document-reader.ts y se exportó desde files/index.ts. El lector autoriza y valida ámbito y custodia antes y después de leer/procesar, comprueba digest y tamaño de bytes antes y después del parser, usa el parser seguro de actividades y respeta abort. No usa credenciales ni bases ni proveedores en estas pruebas.

## Verification
- `node --test --test-reporter=dot apps/api/src/files/foxy-document-reader.test.mjs`: 5 PASS, exit 0; ejecutado dos veces.
- `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0.
- Las pruebas usan dobles de FileService y bytes sintéticos; no demuestran autorización real ni viaje HTTP ni storage real. El parser real sí procesó PDF/DOCX sintéticos en worker.

## Commits and outcomes
Sin commit; revisión independiente pendiente.

## Handoff
Integrar con snapshot y revalidación al despacho; falta integración real de FileService/session y prueba de carrera completa entre snapshot, lectura y proveedor.
