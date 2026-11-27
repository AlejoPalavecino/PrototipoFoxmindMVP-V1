# Feature: Seguimiento de base de datos de la auditoría (B3, B6, B11, B12, S7, S8)

- **Spec:** #especificacion
- **Design:** #diseno
- **Approval:** approved
- **Evidence mode:** candidate-v1
- **Trace mode:** requirements-v1

El 2026-11-26 la sesión coordinadora encargó resolver B3, B6 y B12 de la [auditoría](../../docs/work-log/2026-11-26-root-full-stack-audit.md) y proponer B11, S7 y S8 sin tocar datos existentes ni comportamiento visible sin decisión del usuario. Autoriza commits en la rama `claude/audit-database-fd9d93`; no push, PR, merge ni despliegue. Registro: [seguimiento de base](../../docs/work-log/2026-11-26-audit-database-followups.md).

## Seguimiento Git

Base `a06c9214`. Commit en la rama `claude/audit-database-fd9d93`; sin push, PR ni merge.

## Especificacion

- **REQ-001:** (B3) Una reserva de presupuesto IA trabada para una cuenta no bloquea la reserva de otra cuenta; bajo concurrencia, el tope global diario de solicitudes y el libro global siguen exactos.
- **REQ-002:** (B6) Las claves foráneas que el SQL de la app lee o que recorre el borrado del padre tienen índice; las demás sin índice forman una lista revisada que falla ante una clave nueva sin decidir.
- **REQ-003:** (B12) Toda referencia a la imagen de Postgres está fijada por un único digest.
- **REQ-004:** (B12) Un backup de una base migrada se restaura en una base vacía de un clúster nuevo con las mismas filas, el historial de migraciones y los permisos del rol de app; restaurar sobre una base con tablas se rechaza.
- **REQ-005:** (B11, S7, S8) Cada uno queda con propuesta, recomendación y decisión pendiente explícita; no se cambian datos ni comportamiento visible.
- **REQ-006:** (B11) Los días de los cupos diarios de IA son días calendario de Buenos Aires y el aviso lo dice.
- **REQ-007:** (S7) Los códigos de aula nuevos se guardan como HMAC con clave; los anteriores siguen funcionando hasta recalcularse; el recálculo de vigentes es idempotente, conserva revocados y no escribe sin `--apply`; en producción la clave es obligatoria.
- **REQ-008:** (S8) Una purga acotada borra credenciales vencidas, avisos leídos viejos, trabajo de IA terminado, idempotencia de Foxy y contadores diarios viejos, y nunca lo vigente.

## Diseno

Lock de presupuesto en forma de dos claves `(78123001, hashtext(owner_id))`; filas de `ai_usage_daily` bloqueadas siempre global primero; barridos multicuenta con try-lock. Migración `202611260002_foreign_key_indexes` con ocho índices simples y `@@index` en Prisma. Backup con `pg_dump` dentro del contenedor y restauración `--no-owner --no-acl` seguida de la migración idempotente del rol de app. Propuestas en el registro.

## Tasks

### TASK-001 — Una cuenta no espera detrás de otra al reservar IA
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-001
- **Verification:** tests/ai-budget-owner-lock-database.test.mjs y pruebas de Foxy/presupuesto existentes
- **Acceptance:** Con la fila del trabajo de A tomada por otra transacción, la reserva de B termina en menos de 3 s y la de A termina al liberar; seis cuentas concurrentes con tope global 3 admiten exactamente 3, el resto recibe `AI_GLOBAL_DAILY_BUDGET_EXCEEDED`, y la liquidación concurrente deja reservado 0 y consumido exacto en la fila global.
- **Scope:** ["apps/api/src/platform/ai/admission.ts", "apps/api/src/platform/ai/text-budget.ts", "apps/api/src/modules/foxy/turns/infrastructure/text-budget.ts", "apps/api/src/modules/foxy/turns/infrastructure/turn-completion.ts", "apps/api/src/modules/foxy/turns/infrastructure/turn-recovery.ts", "apps/api/src/modules/foxy/turns/infrastructure/turn-repository.ts", "apps/api/src/modules/foxy/visuals/infrastructure/visual-budget.ts", "apps/api/src/modules/foxy/visuals/infrastructure/visual-claim-authority.ts", "apps/api/src/modules/foxy/visuals/infrastructure/visual-completion.ts", "apps/api/src/modules/foxy/visuals/infrastructure/visual-queue.ts", "apps/api/src/modules/foxy/visuals/infrastructure/visual-queue-recovery.ts", "apps/api/src/modules/foxy/visuals/infrastructure/visual-repository.ts", "tests/ai-budget-owner-lock-database.test.mjs", "tests/ai-study-reservation-database.test.mjs", "apps/api/src/platform/ai/daily-actor-budget.test.mjs", "docs/engineering/ai/README.md"]
- **Evidence:** {"command":"node --test tests/ai-budget-owner-lock-database.test.mjs; conjunto de 18 archivos de presupuesto/Foxy con flags del runner","result":"RED: owner B waited behind owner A; GREEN: 2/2; conjunto 181/181; suites fast 3225/3225, owned-db 966/966, wrappers 19/19","candidate":"sha256:52ec45acc1acc9286bf3d1759c0417620c0387ddda7ce4cb3734005e3d3c6d11"}
- **Blocker:** none

### TASK-002 — Las claves foráneas que se usan tienen índice
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-002
- **Verification:** tests/foreign-key-indexes-database.test.mjs
- **Acceptance:** Las ocho FKs elegidas tienen un índice no parcial que empieza por su primera columna; las FKs sin índice son exactamente las 56 de la lista; `prisma migrate diff` entre la base migrada y el esquema es vacío.
- **Scope:** ["prisma/migrations/202611260002_foreign_key_indexes/migration.sql", "prisma/schema.prisma", "tests/foreign-key-indexes-database.test.mjs", "tests/helpers/migration-inventory.mjs", "docs/engineering/data-model.md"]
- **Evidence:** {"command":"node --test tests/foreign-key-indexes-database.test.mjs tests/database-roles.test.mjs tests/activity-migration-inventory.test.mjs; prisma migrate diff","result":"RED: ocho FKs sin indice; GREEN: 5/5; diff vacio; suites fast 3225/3225, owned-db 966/966, wrappers 19/19","candidate":"sha256:5310c1c252de5f8434775b8a32edd477ed3e1523329efd9cb4a4e3f94380ee9e"}
- **Blocker:** none

### TASK-003 — Postgres corre con una imagen fijada y la base se puede restaurar
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-003, REQ-004
- **Verification:** tests/postgres-image-pin.test.mjs y tests/database-backup-restore.test.mjs
- **Acceptance:** Ninguna referencia a `postgres:<versión>` sin el digest fijado; compose y CI usan la imagen fijada; la restauración en un clúster nuevo reproduce filas por tabla, historial y permisos de `foxmind_app` (sin acceso a `_prisma_migrations`) y una segunda restauración falla con `RESTORE_TARGET_NOT_EMPTY`.
- **Scope:** ["compose.yaml", "compose.p4.yaml", ".github/workflows/issue2-ci.yml", "tests/agenda-database-helpers.test.mjs", "tests/classroom-ai-database.test.mjs", "tests/issue2-ci-workflow.test.mjs", "tests/postgres-image-pin.test.mjs", "tests/database-backup-restore.test.mjs", "scripts/database-backup.mjs", "docs/engineering/database-backup.md"]
- **Evidence:** {"command":"node --test tests/postgres-image-pin.test.mjs tests/issue2-ci-workflow.test.mjs; node --test tests/database-backup-restore.test.mjs","result":"RED: 17 referencias sin digest sobre copia de HEAD; script inexistente; GREEN: 17/17 y 1/1; suites fast 3225/3225, owned-db 966/966, wrappers 19/19","candidate":"sha256:f437da996d80827498d434ed70deea45b66438dd265e64a42b6ff2a7d189ebb2"}
- **Blocker:** none

### TASK-004 — B11, S7 y S8 quedan con propuesta y decisión pendiente
- **State:** VERIFYING
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-005
- **Verification:** revisión del registro y de docs/engineering/data-model.md
- **Acceptance:** El registro explica cada hallazgo, recomienda una opción y lista qué decide el usuario; no hay cambios de datos ni de comportamiento visible.
- **Scope:** ["docs/work-log/2026-11-26-audit-database-followups.md", "docs/engineering/data-model.md"]
- **Evidence:** {"command":"npm run docs:check","result":"0 problemas; propuestas entregadas; el usuario eligió lo recomendado (TASK-005 a TASK-007)"}
- **Blocker:** none

### TASK-005 — El cupo diario de IA se renueva a la medianoche de Buenos Aires
- **State:** VERIFYING
- **Depends on:** TASK-001
- **Owner:** orchestrator
- **Requirements:** REQ-006
- **Verification:** apps/api/src/platform/ai/daily-actor-budget.test.mjs y apps/web/src/features/study/api/study-client.test.mjs
- **Acceptance:** Toda sentencia que fija el día de `ai_usage_daily`, `usage_day` u `operational_day` usa `AT TIME ZONE 'America/Argentina/Buenos_Aires'` y ninguna UTC; el aviso de cupo de Estudio dice «medianoche, hora de Buenos Aires».
- **Scope:** ["apps/api/src/platform/ai/operational-day.ts", "apps/api/src/platform/ai/text-budget.ts", "apps/api/src/platform/ai/monthly-budget.ts", "apps/web/src/features/study/api/study-error.ts", "apps/api/src/platform/ai/daily-actor-budget.test.mjs", "apps/web/src/features/study/api/study-client.test.mjs", "tests/grading-ai-sql.test.mjs", "apps/api/src/modules/foxy/turns/infrastructure/tests/foxy-text-budget.test.mjs"]
- **Evidence:** {"command":"node --test apps/api/src/platform/ai/daily-actor-budget.test.mjs apps/web/src/features/study/api/study-client.test.mjs","result":"RED: AT TIME ZONE 'UTC' y aviso 00:00 UTC; GREEN: 12/12"}
- **Blocker:** none

### TASK-006 — Los códigos de aula no se recuperan con una copia de la base
- **State:** VERIFYING
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-007
- **Verification:** tests/classroom-code-digest-database.test.mjs y tests/p5-host.test.mjs
- **Acceptance:** Un código nuevo queda como `h1:` + 64 hex y distinto de su SHA-256; la vista previa encuentra uno nuevo y uno anterior; el recálculo pasa el vigente a HMAC, deja el revocado con SHA-256, una segunda corrida no cambia nada y un sobre que no coincide queda como `skipped`; el comando sin `--apply` no escribe; en producción sin `CLASSROOMS_CODE_DIGEST_KEY` la configuración es inválida.
- **Scope:** ["apps/api/src/platform/crypto/classroom-code-digest.ts", "apps/api/src/modules/classrooms/memberships/infrastructure/code-digest-migration.ts", "apps/api/src/modules/classrooms/memberships/infrastructure/classroom-codes.ts", "apps/api/src/modules/classrooms/memberships/infrastructure/membership-code-operations-repository.ts", "apps/api/src/modules/classrooms/memberships/application/membership-code-operations.ts", "apps/api/src/modules/classrooms/memberships/application/membership-code-operations-repository.ts", "apps/api/src/modules/classrooms/memberships/application/memberships.ts", "apps/api/src/modules/classrooms/application/management-operations.ts", "apps/api/src/modules/classrooms/drafts/application/drafts-operations.ts", "apps/api/src/modules/classrooms/catalog/application/classroom-queries.ts", "apps/api/src/modules/classrooms/access/infrastructure/configuration.ts", "apps/api/src/modules/classrooms/access/application/runtime-ports.ts", "apps/api/src/bootstrap/academic-management-composition.ts", "apps/api/src/bootstrap/academic-composition.ts", "scripts/rehash-classroom-codes.mjs", "tests/classroom-code-digest-database.test.mjs", "tests/brujula-data-database.test.mjs", "tests/p5-host.test.mjs", "apps/api/src/modules/classrooms/memberships/application/membership-behavior.test.ts", "docs/engineering/classrooms/README.md"]
- **Evidence:** {"command":"tests/classroom-code-digest-database.test.mjs, brujula-data-database, exclusive-account-role, membership-behavior, p5-host","result":"RED: modulos inexistentes; GREEN: 16/16 y 2/2; configuracion sin RED observado"}
- **Blocker:** none

### TASK-007 — Lo que ya no sirve se purga sin tocar lo vigente
- **State:** VERIFYING
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-008
- **Verification:** tests/data-retention-database.test.mjs y apps/api/src/modules/identity/accounts/application/runtime-lifecycle.test.mjs
- **Acceptance:** Se borran la sesión vencida y la revocada hace más de 30 días, el token consumido, el aviso leído hace 200 días, el despacho DONE, el trabajo COMPLETED y el contador de hace 14 meses; se conservan la sesión vigente, la vencida hace 5 días, el token vigente, el aviso sin leer y el leído hace 5 días, el despacho RUNNING, el trabajo PENDING y el contador de hace 11 meses; ninguna tabla borra más de un lote por pasada; la purga periódica ejecuta la retención después de los controles y para ante un lote corto.
- **Scope:** ["apps/api/src/platform/database/retention.ts", "apps/api/src/bootstrap/identity-controls-purge.ts", "apps/api/src/modules/identity/accounts/infrastructure/persistence.ts", "tests/data-retention-database.test.mjs", "apps/api/src/modules/identity/accounts/application/runtime-lifecycle.test.mjs", "docs/engineering/data-model.md"]
- **Evidence:** {"command":"tests/data-retention-database.test.mjs y runtime-lifecycle.test.mjs con flags del runner","result":"RED: modulo inexistente; retencion no invocada; GREEN: 10/10 junto con S7"}
- **Blocker:** none
