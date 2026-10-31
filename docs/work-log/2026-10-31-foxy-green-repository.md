# Foxy AI — repositorio de conversaciones F2

- Agent / role: /root/foxy_green, slice_worker
- Session or task ID: /root/foxy_green; sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 64f613f
- Phase and detailed task/spec links: [Foxy AI](../../odd/tasks/foxy-ai-proposal.md), F2
- Status: completed

## Request and scope
Implementar repositorio de conversaciones, solicitudes idempotentes, migración y schema, sin modificar pruebas ni bases retenidas.

## Work performed
Creados repositorio e índice de apps/api/src/foxy-ai, migración prisma/migrations/202610310002_foxy_conversations/migration.sql y modelos/relaciones en prisma/schema.prisma. Se restringen rol, propietario, contexto fijo, revisiones, borrado lógico y solicitudes por propietario; serialización de creación por bloqueo de usuario. La capa llamadora debe calcular un hash estable y confiable de la solicitud validada y controlar transacciones; el repositorio no autentica la sesión. No se editaron pruebas.

## Verification
El helper tests/agenda-database-helpers.test.mjs fue inspeccionado antes de ejecutarlo: PostgreSQL temporal propio con nombre y etiqueta aleatorios, tmpfs, puerto efímero, DB agenda_test, migraciones y rollback, sin URL/volumen retenido; cleanup valida etiqueta. Primera ejecución `node --test --test-reporter=dot apps/api/src/foxy-ai/foxy-conversation-repository.test.mjs` falló por propiedad de parámetro TypeScript incompatible con strip-only; se corrigió sin relajar pruebas. Dos ejecuciones posteriores terminaron exit 0 con test principal y 4 subtests aprobados. `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0 tras el cambio final.

## Commits and outcomes
Sin commit; coordinador integra y verifica la unidad.

## Handoff
Revisión independiente debe inspeccionar concurrencia real, consistencia schema/migración, autorización por sesión y política de borrado; la prueba no acredita concurrencia ni servicio HTTP. El módulo aún no implementa chat, acceso a fuentes, IA o publicación.

## Corrección de deriva — 2026-10-31
Revisión identificó que cuatro relaciones Foxy no explicitaban `onUpdate: NoAction` en Prisma; se ajustaron para coincidir con las claves SQL. `npm run api:build`: exit 0. Prisma `migrate diff --from-config-datasource --to-schema=prisma/schema.prisma --exit-code`, ejecutado mediante `withAgendaDatabase` sobre una base temporal propia con migraciones aplicadas: «No difference detected», exit 0. Sin acceso a bases retenidas.
