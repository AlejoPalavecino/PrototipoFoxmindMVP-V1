# Biblioteca — reintentos de limpieza

- Agent / role: root, implementación
- Session or task ID: unavailable
- Date: 2026-11-03
- Branch / worktree: main, checkout existente
- Starting commit: 51e277c
- Phase: Biblioteca P6, conservación y eliminación explícita
- Status: completed

## Request and scope
Corregir el bloqueo por un borrado fallido con espera progresiva persistente y comprobar que el segundo material se limpia.

## Handoff
La regresión focal quedó verde. Para usar el cambio en otro entorno, aplicar primero la migración mediante el procedimiento de ese entorno.


## Work performed
- Separé el lease activo de la fecha y el escalón de reintento, persistidos por material en la migración 202611030001_library_cleanup_retry.
- La selección y la revalidación bajo lock omiten reintentos aún no vencidos. La confirmación de borrado y la liberación de cuota siguen juntas.
- Extendí la prueba existente de P6 con dos materiales, dos fallos, esperas de 10 y 20 segundos y recuperación con otra instancia.

## Verification
- RED: npm run api:build pasó y node --test tests/p6-library.test.mjs falló en la aserción esperada (el primero se intentó dos veces). Hubo fallos en cascada posteriores dentro del mismo fixture.
- GREEN: npm run api:build y node --test tests/p6-library.test.mjs pasaron (9/9). PostgreSQL desechable aplicó las migraciones y el fixture confirmó su limpieza. Almacenamiento simulado.
- node --test tests/activity-migration-inventory.test.mjs tests/p8-migration-inventory.test.mjs pasó (6/6).
- npm run lint:boundaries y git diff --check pasaron. Sin regresión integral ni revisión independiente.
- Docker Desktop se inició para levantar el fixture desechable.

## Commits and outcomes
Cambio local sobre 51e277c.
