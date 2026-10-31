# Foxy AI — mapeo interno de citas H2b

- Agent / role: /root/foxy_green, slice_worker
- Session or task ID: /root/foxy_green; sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 64f613f
- Phase and detailed task/spec links: [Foxy AI](../../odd/tasks/foxy-ai-proposal.md), H2b citas
- Status: completed

## Request and scope
Reconstruir mapeo privado de citas hacia archivos de snapshot sin adivinar frente a inconsistencias, sin DB, URL ni pruebas editadas.

## Work performed
Añadido citation-mapping.ts y export. Reconstruye numeración global dN por identidad de archivo y sN por orden de fuentes, cruza snapshot/mapa/reporte y consume cola de citas por fuente en orden de respuesta. Verifica integridad de identificadores, tipo/propósito/destino de custodia, descriptores duplicados y cardinalidad; incoherencias se marcan no disponibles sin devolver archivo. Devuelve datos de archivo únicamente al consumidor interno.

## Verification
- `node --experimental-transform-types --test --test-reporter=dot apps/api/src/foxy-ai/foxy-citation-mapping.test.mjs`: 3 PASS, exit 0. Primera ejecución falló por no detectar que faltaba una cita con misma página; se corrigió comprobando cardinalidad por fuente.
- `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0.
- Sin DB, URL, proveedor ni pruebas modificadas.

## Commits and outcomes
Sin commit; revisión independiente pendiente.

## Handoff
Integrar con autorización actual por archivo antes de mostrar enlace o contenido. El mapeo es evidencia histórica interna y no acredita que archivo siga existiendo o accesible, ni vuelve a validar página contra bytes.

## Citas sin archivo e identidad UUID — 2026-10-31
Una cita verificada de texto con `documentKey=null` y `page=null` se marca disponible sin archivo. Fuentes con UUID duplicados ignorando mayúsculas quedan no disponibles; la deduplicación de archivos y asignación global dN se mantiene. `node --experimental-transform-types --test --test-reporter=dot apps/api/src/foxy-ai/foxy-citation-mapping.test.mjs`: 5 PASS, exit 0; `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0. Pruebas sin editar y sin DB.
