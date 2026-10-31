# Foxy AI — servicio de turnos H2

- Agent / role: /root/foxy_green, slice_worker
- Session or task ID: /root/foxy_green; sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 64f613f
- Phase and detailed task/spec links: [Foxy AI](../../odd/tasks/foxy-ai-proposal.md), H2 turnos
- Status: completed

## Request and scope
Servicio de envío y lectura de turnos con replay previo a configuración/captura y snapshot en la misma transacción; sin editar pruebas ni usar datos retenidos.

## Work performed
Agregado turn-service.ts, export en índice y operación replay en turn-repository.ts. UoW comprueba docente, conversación y propiedad; fuentes curriculares se reconstruyen en la misma tx para turnos nuevos con IA habilitada y aula activa. Replay comprueba hash canónico y precede a disponibilidad/snapshot, incluyendo aula archivada propia. get/list exponen solo id, sequence y state.

## Verification
- `node --experimental-transform-types --test --test-reporter=dot apps/api/src/foxy-ai/foxy-turn-service.test.mjs apps/api/src/foxy-ai/foxy-turn-repository.test.mjs`: 11 PASS, exit 0, PostgreSQL temporal propio.
- `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0.
- Sin pruebas modificadas, datos retenidos, proveedor ni sesión HTTP real.

## Commits and outcomes
Sin commit; revisión independiente pendiente.

## Handoff
El DTO actual solo entrega id/secuencia/estado porque así lo expone el repositorio; para que un docente pueda leer el chat falta diseñar y probar proyección autorizada de mensaje, respuesta y procedencia sin filtrar snapshot/lease. Falta transporte y autenticación real; probar carreras con archivo/aula mutantes.

## Lectura de mensajes y citas H2 — 2026-10-31
Repositorio selecciona columnas explícitas y servicio expone DTO owner-only con propósito, mensaje, estado, respuesta validada, error, fecha y citas proyectadas `{sourceId,documentKey,page}`; sin snapshot, hash, lease ni costos. get/list mantienen filtros de propietario y paginación por secuencia. No se generaron enlaces a archivos ni se presupone acceso a fuentes históricas. `node --experimental-transform-types --test --test-reporter=dot apps/api/src/foxy-ai/foxy-turn-service.test.mjs apps/api/src/foxy-ai/foxy-turn-repository.test.mjs`: 12 PASS, exit 0; PostgreSQL temporal. `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0. Las pruebas permanecieron intactas; transporte/sesión reales y autorización de apertura de archivos quedan pendientes.
