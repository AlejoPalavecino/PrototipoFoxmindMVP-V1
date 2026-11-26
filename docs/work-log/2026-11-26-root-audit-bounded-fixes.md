# Arreglos acotados de la auditoría

Coordinador /root, 2026-11-26, sesión sin identificador expuesto. Rama `main`, worktree principal, commit inicial `b34949b9`. El usuario eligió remediar el bloque «arreglos acotados» de la [auditoría del mismo día](2026-11-26-root-full-stack-audit.md) (B1, B2, S10, S11, D13 y F10) y autorizó commit y push a `main` una vez verificado. No autoriza despliegue ni acceso a datos retenidos. Tablero: [audit-bounded-fixes](../../odd/tasks/audit-bounded-fixes.md).

## Qué cambió

- **B1, subida de adjuntos de Foxy y Mi estudio.** `storage.put` salió de la transacción final, que retenía hasta 25 s el `users … FOR UPDATE` del dueño y una conexión del pool. Ahora la escritura ocurre entre la reserva y una transacción corta que bloquea la fila, revalida y marca READY. Si la reserva quedó revocada o reclamada por la limpieza, la carga borra el objeto que escribió (la limpieza pudo haberlo borrado antes de que la escritura llegara) y responde `CONFLICT`. Sólo se borra cuando la fila no está READY, porque un objeto listo puede estar compartido con una copia en la carpeta. [Servicio](../../apps/api/src/modules/files/custody/infrastructure/chat-attachment-service.ts).
- **B2, pool.** `idle_in_transaction_session_timeout` de 20 s, por encima del mayor tope de transacción del código (15 s), como respaldo del lado de la base si un proceso se traba. No se agregó `lock_timeout` porque `statement_timeout` de 1 s ya acota cada espera de bloqueo. El tamaño del pool (5) no cambió: falta medirlo. [Servicio Prisma](../../apps/api/src/platform/database/prisma.service.ts).
- **S10, recordatorios de repaso.** `list()` ya no ejecuta el barrido global antes de autenticar. Dentro de la transacción autenticada actualiza sólo las filas del estudiante y saltea con `FOR UPDATE SKIP LOCKED` las que tiene tomadas el barrido, para que no se esperen mutuamente. El barrido global sigue cada 30 s. [Runtime](../../apps/api/src/modules/study/reviews/infrastructure/runtime.ts).
- **S11, nombres.** `validateName` rechaza `\p{Cc}` y los controles bidireccionales U+061C, U+200E, U+200F, U+202A–U+202E y U+2066–U+2069, al registrarse y al editar el perfil. Los nombres ya guardados no se migran: editar otros campos del perfil sigue funcionando. [Validación](../../apps/api/src/modules/identity/domain/security/inputs.ts).
- **D13, regla de límites.** Se retiraron las raíces `apps/classrooms-ui` y `apps/agenda-ui`, los barrels `apps/api/src/{files,mail,classrooms,foxy-ai}/public/index.ts` y su lista de enlaces prohibidos, todos inexistentes. La herencia de capacidades se controla en `apps/api/src/modules/classrooms/`. Las pruebas que ejercitaban esos barrels se quitaron o pasaron a rutas vigentes; el contrato `public.ts` de módulos ya tenía cobertura propia. [Script](../../scripts/check-boundaries.mjs) · [Pruebas](../../tests/audit-boundaries-guard.test.mjs).
- **F10.** Se retiraron `apps/web/src/features/files/index.ts`, `apps/web/src/features/identity/controls/account-artwork.tsx` y `apps/shared-ui/BrujulaIcon.tsx`, sin importadores. `application/workflows/classroom-workspace/PlanWorkspace.tsx` sigue: sólo lo cargan seis pruebas, y quitarlo implica reescribirlas.
- Guías actualizadas: [archivos](../engineering/files/README.md), [identidad](../engineering/identity/README.md), [estudio](../engineering/study/README.md) y [especificación funcional](../foxmind-v1-functional-spec.md).

## Comprobaciones

RED por la causa esperada antes de cada corrección, contra el build anterior:

| Hallazgo | Prueba | RED | GREEN |
| --- | --- | --- | --- |
| B1 | `chat-attachment-custody.test.mjs` | escritura con 1 transacción abierta | 2/2; traslado 8/8 |
| B2 | `ai-execution-policy-database.test.mjs` | `idle_in_transaction_session_timeout` = `0` | 14/14 |
| S10 | `folders/infrastructure/tests/integrations.test.mjs` | `list` anónimo escribió | 5/5, incluido el flujo real de recordatorios |
| S11 | `p33-identity-security.test.mjs` | controles aceptados | 14/14 |
| D13 | `audit-boundaries-guard.test.mjs` | herencia no detectada en `modules/classrooms` | 27/27 |

Estáticas: `npm run api:build`, `tsc --noEmit -p apps/web/tsconfig.json`, `npm run web:build`, `npm run lint:boundaries` y `run-complete-suite --check` (746 entradas) pasaron.

Suites integradas con `npm run test:complete -- --group <grupo>`: `fast` 3215/3215 (523 archivos; la única línea «1 failed» del log es la falla intencional dentro de la prueba del ejecutor de suites), `owned-db` 960/960 (158 archivos, Postgres propio por prueba) y `wrappers` 19/19 completos (no informan conteos individuales). `npm run docs:check`: 242 archivos, 0 problemas. Tablero: `taskboard.py check` válido, seis tareas DONE.

## Límites

- Las pruebas de B1 simulan la limpieza con una actualización directa de la fila. No se ejercitó S3 real ni una medición de carga del pool.
- S10 deja abierta una ventana: un aviso que el barrido está procesando puede no aparecer en esa consulta y aparece en la siguiente.

## Pendiente

Primer paso: elegir el siguiente bloque de la auditoría. Los límites globales S2–S5 necesitan definir cupos por cuenta, IP o usuario; S1 necesita la decisión sobre roles de base y RLS.
