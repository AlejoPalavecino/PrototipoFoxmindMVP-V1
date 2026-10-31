# Foxy AI — contratos de recursos GREEN

- Agent / role: /root/foxy_green, slice_worker
- Session or task ID: /root/foxy_green; sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 64f613f
- Phase and detailed task/spec links: [Foxy AI](../../odd/tasks/foxy-ai-proposal.md), F1 contratos de recursos
- Status: completed

## Request and scope
Implementar contratos puros de respuesta, edición y preparación/confirmación de publicación, sin editar pruebas.

## Work performed
Se añadieron tipos y validadores para respuesta versionada, referencias, edición de texto y publicación con confirmación y revisiones. Se actualizó index.ts. Los validadores comprueban forma y consistencia sintáctica, no autorización ni pertenencia real de referencias o temas a un aula. No se añadieron máximos de longitud no especificados para contenido o listas.

## Verification
- `node --test --test-reporter=dot src/core/domain/foxy-ai-resource.test.mjs src/core/domain/foxy-ai-contract.test.mjs`: 10 PASS, exit 0.
- `npm run api:build`: generación Prisma y compilación TypeScript exit 0.
- `npm run lint:boundaries -- --quiet`: fronteras AST aprobadas, exit 0.

## Commits and outcomes
Sin commit; coordinador integra la unidad.

## Handoff
La comprobación de propiedad, fuentes reales, permisos, almacenamiento y publicación efectiva corresponde a slices posteriores; estos contratos no completan la funcionalidad.

## Corrección posterior a revisión — 2026-10-31
Solicitud de /root: rechazar duplicados de UUID que difieren solo en mayúsculas en temas y fuentes. Se comparan claves en minúscula conservando el valor original de las entradas válidas. Se rechazan también saltos de línea y tabuladores en título de publicación para concordar con Biblioteca; se mantienen en contenidos multilínea. No se editaron pruebas. `node --test --test-reporter=dot src/core/domain/foxy-ai-contract.test.mjs src/core/domain/foxy-ai-resource.test.mjs`: 13 PASS, exit 0. `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0. Los nuevos casos RED corresponden al test runner, no a este agente.
