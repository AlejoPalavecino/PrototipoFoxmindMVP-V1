# Foxy AI — lectura segura de citas H2b3

- Agent / role: /root/foxy_green, slice_worker
- Session or task ID: /root/foxy_green; sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 64f613f
- Phase and detailed task/spec links: [Foxy AI](../../odd/tasks/foxy-ai-proposal.md), H2b3 citas
- Status: completed

## Request and scope
Resolver cita cN bajo sesión real, leer archivo autorizado fuera de UoW, revalidar y proteger bytes; también presentar cita textual publicada sin enlace. Sin pruebas editadas ni datos retenidos.

## Work performed
Añadido citation-read.ts y readFile en citation-service.ts. Resuelve fuente/custodia actuales dentro UoW antes y después de FileService.read, pasa request auténtico, comprueba tamaño/digest histórico dos veces y devuelve bytes copiados con headers conservadores y sin Location. Citas de texto de actividad publicada se indican TEXT_ONLY sin href y pasan a UNAVAILABLE al retirarla. Títulos presentados sustituyen UUID visibles por marcador para evitar exponer identificadores internos.

## Verification
- Primera ejecución: lectura de archivo aprobada, test TEXT_ONLY falló al no estar implementado; tras ajuste pasó estado pero detectó UUID en título sintético, corregido mediante sanitización del título.
- `node --experimental-transform-types --test --test-reporter=dot apps/api/src/foxy-ai/foxy-citation-file.test.mjs apps/api/src/foxy-ai/foxy-citation-service.test.mjs`: 6 PASS, exit 0, PostgreSQL temporal propio y FileService simulado.
- `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0. No DB retenida ni proveedor.

## Commits and outcomes
Sin commit; revisión independiente pendiente.

## Handoff
La prueba usa FileService doble; verificar integración real con sesión, almacenamiento y ruta HTTP, así como carrera de revocación concurrente real. La sustitución de UUID no anonimiza datos personales en nombres o contenido.
