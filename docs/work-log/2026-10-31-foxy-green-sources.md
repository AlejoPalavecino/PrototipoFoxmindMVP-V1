# Foxy AI — catálogo de fuentes F3

- Agent / role: /root/foxy_green, slice_worker
- Session or task ID: /root/foxy_green; sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 64f613f
- Phase and detailed task/spec links: [Foxy AI](../../odd/tasks/foxy-ai-proposal.md), F3 fuentes
- Status: completed

## Request and scope
Añadir catálogo docente de metadatos de planes, materiales y actividades publicadas con paginación, disponibilidad y restricciones de custodia. Sin editar pruebas ni datos retenidos.

## Work performed
Implementado contexto de fuentes en context-sources.ts y método sources en context-catalog.ts. Selector utiliza sesión/rol y aula revalidados, limita página, muestra recursos de esa aula, detecta formato/estado/tamaño y examina adjuntos de actividades sin exportar claves o rúbricas. No lee contenido ni ejecuta IA. El selector solo informa elegibilidad inicial; generación futura debe revalidar fuentes, permisos y bytes.

## Verification
- Primera ejecución del test SQL falló en seedMaterial PENDING antes de alcanzar el catálogo: trigger require_ready_p4_file rechazó el fixture. El test_runner reparó el fixture por separado; no se editaron pruebas por este agente.
- `node --test --test-reporter=dot apps/api/src/foxy-ai/foxy-context-sources.test.mjs apps/api/src/foxy-ai/foxy-context-catalog.test.mjs`: 8 PASS, exit 0, PostgreSQL temporal propio `agenda_test` y transacción con rollback.
- `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0.

## Commits and outcomes
Sin commit; revisión y coordinación pendientes.

## Handoff
Revisar consistencia de paginación y límites con el contrato técnico, más pruebas de autorización HTTP y condiciones de carrera al revalidar uso. La ejecución de generación y lectura segura aún no existen.

## Corrección de contrato y cursor — 2026-10-31
Se adoptó `parseFoxySourceQuery` común (límite 1..50) y cursor `{createdAt,id}` descendente; la ordenación SQL trunca timestamps a milisegundos y desempata por UUID para no perder registros con precisión submilisegundo al serializar. Los resultados exponen metadatos acordados, fallback de tema histórico y `EMPTY_CONTENT`. La primera ejecución SQL falló con 42703 por referencia a `questions.classroom_id` inexistente; se corrigió usando la FK de activity. Nueva ejecución `node --test --test-reporter=dot apps/api/src/foxy-ai/foxy-context-sources.test.mjs apps/api/src/foxy-ai/foxy-context-catalog.test.mjs`: 14 PASS, exit 0, en PostgreSQL temporal aislado. `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0. Pruebas sin modificar por este agente; falta probar HTTP y revalidación en generación.
