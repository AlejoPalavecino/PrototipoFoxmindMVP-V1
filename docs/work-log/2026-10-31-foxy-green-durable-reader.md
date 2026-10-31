# Foxy AI — lector documental durable

- Agent / role: /root/foxy_visual_green, slice_worker
- Session or task ID: /root/foxy_visual_green; identificador de sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 4966731
- Phase and detailed task/spec links: lector durable, [propuesta](../../odd/tasks/foxy-ai-proposal.md)
- Status: completed

## Request and scope
Leer fuentes para trabajo durable con autoridad derivada de capacidad, sin sesión fingida ni acceso a datos retenidos.

## Work performed
Lector durable con request opaco en WeakMap, descriptor y propietario derivados de authorizeDocument, revalidación transaccional de autoridad y comparación exacta de grant, limitación a aula y propósito/target de plan, material o instrucciones. Reutiliza lector existente para checks de custodia, contenido, digest, cancelación y revalidación. No se editaron pruebas.

## Verification
`node --test --test-reporter=dot apps/api/src/files/foxy-durable-document-reader.test.mjs apps/api/src/files/foxy-document-reader.test.mjs`: exit 0, 9 PASS con PDF/DOCX sintéticos y almacenamiento mock. `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0. No se usó base retenida, secretos ni proveedor real.

## Commits and outcomes
Sin commit propio.

## Handoff
Revisión independiente e integración al worker durable; pruebas de este slice usan autoridad y almacenamiento sintéticos.
