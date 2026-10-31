# Foxy AI — proyección para proveedor textual E1

- Agent / role: /root/foxy_green, slice_worker
- Session or task ID: /root/foxy_green; sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 64f613f
- Phase and detailed task/spec links: [Foxy AI](../../odd/tasks/foxy-ai-proposal.md), E1 proyección
- Status: completed

## Request and scope
Proyectar grounding a campos explícitos del proveedor textual, sin referencias privadas ni ejecución de proveedor; sin editar pruebas.

## Work performed
Añadido provider-input.ts y exportación en índice Foxy. La proyección preserva nombres/estados/selección curricular y claves locales, omite IDs estructurales y mapa privado, copia bytes y estructuras, verifica contexto general y respeta cancelación. El contenido seleccionado y sus bytes se transmiten íntegros: pueden contener datos introducidos por el docente o metadatos inherentes al documento; esta proyección no los anonimiza.

## Verification
- `node --experimental-transform-types --test --test-reporter=dot apps/api/src/foxy-ai/foxy-provider-input.test.mjs`: 4 PASS, exit 0.
- `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0.
- Sin DB, proveedor, datos reales ni pruebas modificadas.

## Commits and outcomes
Sin commit; revisión independiente pendiente.

## Handoff
Integrar con proveedor textual después de verificar consentimiento, límites y fencing. No se afirma eliminación de datos personales o metadatos contenidos en archivos o texto.
