# Foxy AI — cola y leases F5C

- Agent / role: /root/foxy_visual_green, slice_worker
- Session or task ID: /root/foxy_visual_green; identificador de sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: c6e7bb6
- Phase and detailed task/spec links: F5C, [propuesta](../../odd/tasks/foxy-ai-proposal.md)
- Status: completed

## Request and scope
Cola transaccional con límites compartidos, nonce fencing y recuperación de lease; sin worker activo ni proveedor real.

## Work performed
Nueva migración y modelo Prisma para lease y estado; claim serializado con advisory lock 78123002 y controles globales/propietario de cinco capacidades, autorización en claim y current, expiración previa a dispatch reenfila y posterior falla con resultado incierto. Revisión por tercero y conexión al presupuesto quedan al coordinador.

## Verification
Se inspeccionó helper de base `tests/agenda-database-helpers.test.mjs`: PostgreSQL efímero en tmpfs, agenda_test, credenciales sintéticas y rollback, limpieza por etiqueta. Primera ejecución: 16 subcasos OK y 2 fallos por fixtures que intentaban mutar rol y titular de aula inmutables; test_runner los corrigió preservando triggers y añadió revocación posterior al claim. Repetición `node --test --test-reporter=dot apps/api/src/foxy-ai/foxy-turn-queue.test.mjs`: exit 0, 20 PASS. Primer lint falló por import privado; corregido. `npm run api:build` y `npm run lint:boundaries -- --quiet` posteriores: exit 0. No se usó proveedor ni configuración privada.

## Commits and outcomes
Sin commit propio.

## Handoff
Antes de habilitar worker/dispatch, integrar liquidación conservadora de reserva en `recoverExpired` con el ledger de IA compartido; la cola aún no tiene campos de presupuesto. Definir limpieza/estado de trabajos QUEUED que superan maxJobAgeMs: claim los excluye pero no los finaliza. Verificar carreras y los límites de capacidad mediante revisión independiente.

## Corrección de expiración F5C
El coordinador solicitó corregir RED de trabajos en cola caducados y leases vencidos antes de admisión. `recover` ahora marca QUEUED caducos como FAILED/AI_TIMEOUT; `claim` ejecuta recuperación bajo el mismo advisory lock antes de contar capacidad. Un lease vencido anterior al despacho se reenfila y uno posterior queda FAILED/PROVIDER_OUTCOME_UNKNOWN. Se preservó el límite de lotes de 50; no se editaron pruebas.

`node --test --test-reporter=dot apps/api/src/foxy-ai/foxy-turn-queue.test.mjs`: exit 0, 23 PASS en base efímera aislada. `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0. Antes de activar worker/despacho sigue pendiente liquidar reservas conservadoramente. Las demás colas dependen del scheduler de recuperación de Foxy aún no integrado: la recuperación anticipada solo ocurre cuando se invoca `claim` o `recoverExpired` de Foxy.
