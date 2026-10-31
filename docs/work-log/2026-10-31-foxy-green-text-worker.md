# Foxy AI — worker textual aislado F5F3

- Agent / role: /root/foxy_green, slice_worker
- Session or task ID: /root/foxy_green; sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 64f613f
- Phase and detailed task/spec links: [Foxy AI](../../odd/tasks/foxy-ai-proposal.md), F5F3 worker
- Status: completed

## Request and scope
Worker textual sin scheduler ni proveedor real; respetar preparación, límites, revalidación, reserva, despacho único y finalizador; pruebas intactas.

## Work performed
Creados worker.ts y worker-output.ts, exportación en índice. Reutiliza preparación y proveedor inyectados, adquiere locks de usuario/aula/conversación antes de revalidación y presupuesto, despacha una sola vez tras RESERVED, conserva uso conocido para liquidación, valida y resuelve referencias locales y cierra capacidad. Deadline corta la espera y cancela la señal; después de reserva un fallo incierto se clasifica conservadoramente. El reporte de fuentes persiste metadatos sin texto fuente. No se conectó runtime, scheduler ni proveedor real.

## Verification
- `node --experimental-transform-types --test --test-reporter=dot apps/api/src/foxy-ai/foxy-text-worker.test.mjs`: 7 PASS, exit 0.
- `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0.
- Las pruebas usan dobles; no acreditan camino end-to-end, ejecución real con proveedor, concurrencia SQL de reserva ni comportamiento de cancelación de SDK real.

## Commits and outcomes
Sin commit; revisión independiente pendiente.

## Handoff
Revisar asignación de estados ante pérdida de lease o revocación y validación de referencias; integrar transacción real, lector durable y proveedor con pruebas sintéticas antes de activar cualquier scheduler. Una cancelación tras reserva no demuestra que el proveedor haya detenido I/O o facturación.

## Procedencia de cita — 2026-10-31
La respuesta se conserva compatible con el contrato existente y el reporte privado de cada fuente añade citas verificadas `{sourceId, documentKey, page}`; el documentKey se valida contra el mapa y documento autorizado antes de incluirlo. No se expone información adicional al proveedor ni se modificó el ciclo de vida. `node --experimental-transform-types --test --test-reporter=dot apps/api/src/foxy-ai/foxy-text-worker.test.mjs`: 8 PASS, exit 0; `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0. Pruebas sin editar. La resolución posterior de documentKey a archivo depende del snapshot y de la asignación de claves, por lo que debe probarse en el recorrido de lectura de citas.
