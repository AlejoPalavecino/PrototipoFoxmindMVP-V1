# Foxy AI — repositorio de turnos F5A

- Agent / role: /root/foxy_visual_green, slice_worker
- Session or task ID: /root/foxy_visual_green; identificador de sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: f2cf351
- Phase and detailed task/spec links: F5A, [propuesta](../../odd/tasks/foxy-ai-proposal.md)
- Status: completed

## Request and scope
Persistir turnos privados con idempotencia y control de revisión; sin proveedor ni datos reales.

## Work performed
Migración y modelo Prisma de turnos, índice de un turno activo, asociación al propietario y conversación, y repositorio transaccional que bloquea propietario/conversación, verifica snapshot y selección, evita duplicados, aplica CAS y recupera turnos visibles. No se editaron pruebas.

## Verification
Se inspeccionó `tests/agenda-database-helpers.test.mjs`: crea un contenedor efímero propietario con PostgreSQL `agenda_test` en tmpfs, contraseña aleatoria, sin volúmenes ni URLs retenidas; rollback por caso y eliminación con comprobación de etiqueta. `node --test --test-reporter=dot apps/api/src/foxy-ai/foxy-turn-repository.test.mjs`: exit 0, 8 PASS, repetido tras añadir lock por propietario con el mismo resultado. `npm run api:build`: exit 0; `npm run lint:boundaries -- --quiet`: exit 0. No se usó proveedor ni configuración privada.

## Commits and outcomes
Sin commit propio.

## Handoff
Revisión independiente; aún no hay worker, contabilidad, proveedor, transporte o UI para turnos. El caller debe suministrar hash y snapshot autenticado; la igualdad de selección y contexto se comprueba en repositorio, no reemplaza revalidación de autorización de fuentes.
