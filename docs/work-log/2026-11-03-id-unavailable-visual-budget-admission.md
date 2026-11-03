# Admisión visual durante contención de presupuesto

- Agent / role: root, implementación
- Session or task ID: unavailable
- Date: 2026-11-03
- Branch: main
- Starting commit: 3150bf2
- Phase: ARQ-08, coordinación de admisión
- Status: completed

Alcance: evitar esperar presupuesto mientras se retiene admisión visual, preservar liquidación y exclusividad.


## Work performed
Claim y recuperación identifican trabajo antes de intentar adquirir presupuesto. Para un trabajo ya despachado, pg_try_advisory_xact_lock permite diferirlo sin espera, antes de bloquear filas. Se preservan el orden de locks y la atomicidad de la liquidación y el cambio de lease/estado.

## Verification
- RED: node --import ./scripts/register-api-test-build.mjs --test --test-name-pattern 'empty visual' apps/api/src/foxy-ai/foxy-visual-cross-admission.test.mjs falló por lock timeout en PostgreSQL desechable.
- GREEN: npm run api:build, npm run lint:boundaries y git diff --check pasaron.
- node --import ./scripts/register-api-test-build.mjs --test --test-concurrency=1 apps/api/src/foxy-ai/foxy-visual-cross-admission.test.mjs apps/api/src/foxy-ai/foxy-visual-authority-recovery.test.mjs: 31/31. Incluye un claim real de Extracción con presupuesto ocupado y cola visual vacía, y dos claims visuales concurrentes con un solo ganador y una sola liquidación.
- Reejecución focal del caso 'expired dispatched job settles full budget': 1/1 con contención y dos recuperadores terminales concurrentes. Consumo exacto 139264 micróUSD en cada ámbito y cero reserva final.
- Se usaron fixtures desechables. Sin matriz CI integral ni revisión independiente.

## Commits and outcomes
Cambio local sobre 3150bf2.

## Handoff
Casos focales verificados. La contención de otros flujos de presupuesto y la observabilidad se evalúan por separado.
