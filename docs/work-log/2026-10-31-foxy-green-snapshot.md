# Foxy AI — snapshot de grounding F4B

- Agent / role: /root/foxy_green, slice_worker
- Session or task ID: /root/foxy_green; sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 64f613f
- Phase and detailed task/spec links: [Foxy AI](../../odd/tasks/foxy-ai-proposal.md), F4B snapshot
- Status: completed

## Request and scope
Capturar y revalidar currículo y fuentes seleccionadas por docente; sin editar pruebas ni usar datos retenidos.

## Work performed
Se agregaron grounding-snapshot.ts, grounding-sources.ts y export en índice. Se verifican sesión/rol por servicio de aula, conversación propia, aula activa, pertenencia de temas y fuentes, disponibilidad y custodia de archivos. Se proyectan consignas, preguntas y opciones sin respuestas, notas ni rúbricas. Revalidación reconstruye snapshot y compara sin usar revisión general del aula. Este corte solo captura metadatos y texto autorizado; no lee blobs ni llama proveedor.

## Verification
- `node --test --test-reporter=dot apps/api/src/foxy-ai/foxy-grounding-snapshot.test.mjs apps/api/src/foxy-ai/foxy-grounding.test.mjs`: 17 PASS, exit 0, PostgreSQL temporal propio con rollback para integración SQL.
- `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0.
- Sin pruebas modificadas ni acceso a DB retenida. No hay verificación de transporte o proveedor real.

## Commits and outcomes
Sin commit; revisión independiente pendiente.

## Handoff
Revisar concurrencia y atar revalidación al instante de lectura/despacho; verificar permisos y digest al leer blobs. La consulta de preguntas/opciones lee los datos de actividad antes de aplicar el límite agregado de 100.000 caracteres: evaluar protección en SQL ante datos heredados grandes. El mapa incluye metadatos privados para procesamiento interno; sanear el payload al proveedor.

## Actividad vacía — 2026-10-31
Captura rechaza actividad sin texto no blanco, preguntas ni adjuntos con código `EMPTY_CONTENT`, también mezclada con fuentes válidas; no devuelve un snapshot parcial. Revalidación considera el estado obsoleto. `node --test --test-reporter=dot apps/api/src/foxy-ai/foxy-grounding-snapshot.test.mjs`: 8 PASS, exit 0 en PostgreSQL temporal; `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0. Pruebas sin editar.
