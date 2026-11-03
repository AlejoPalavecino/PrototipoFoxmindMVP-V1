# Recuperación de IA por lotes

- Agent / role: root, implementación
- Session or task ID: unavailable
- Date: 2026-11-03
- Branch: main
- Starting commit: 8f93285
- Phase: ARQ-08, recuperación de Extracción y Generación
- Status: completed

Alcance autorizado: acotar el trabajo de recuperación bajo el lock de admisión y comparar la espera con acumulación sintética. Se conserva la política de presupuesto y admisión.


## Work performed
Extracción y Generación usan la misma rutina y conservan prioridad de tabla de la cola invocante, selección del vencimiento más antiguo, SKIP LOCKED, liquidación y resultado por despacho. Cada pasada admite hasta 25 recuperaciones por tabla (50 en total).

## Verification
- RED: node --import ./scripts/register-api-test-build.mjs --test --test-name-pattern 'generation recovery bounds' apps/api/src/foxy-ai/foxy-shared-admission.test.mjs. El worker anterior recuperó 50 donde se esperaban 25.
- GREEN: npm run api:build y node --import ./scripts/register-api-test-build.mjs --test apps/api/src/foxy-ai/foxy-shared-admission.test.mjs (29/29). Se drenaron 1000 reservas, sin saldo reservado y con 300000 micróUSD consumidos por ámbito.
- El caso adicional activity claim recovers, en el mismo archivo, pasó 1/1: ambas tablas avanzan y el trabajo sin despacho vuelve a QUEUED.
- npm run lint:boundaries y git diff --check pasaron.
- PostgreSQL desechable, tres repeticiones por tamaño y por versión. Medianas de espera del lock en ms, antes/después: 0 filas 3,6/3,9; 50 filas 122,7/77,4; 250 filas 566,9/73,7; 1000 filas 2648,2/76,2. La segunda conexión ejecuta solo la adquisición del lock compartido. La medición no incluye tiempo de espera entre polls ni tiempos de proveedores.

## Commits and outcomes
Cambio local sobre 8f93285.

## Handoff
Si se necesita dimensionar el drenaje en otro entorno, repetir la prueba con el volumen y la concurrencia esperados.
