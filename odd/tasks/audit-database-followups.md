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
- **State:** BLOCKED
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-005
- **Verification:** revisión del registro y de docs/engineering/data-model.md
- **Acceptance:** El registro explica cada hallazgo, recomienda una opción y lista qué decide el usuario; no hay cambios de datos ni de comportamiento visible.
- **Scope:** ["docs/work-log/2026-11-26-audit-database-followups.md", "docs/engineering/data-model.md"]
- **Evidence:** {"command":"npm run docs:check","result":"0 problemas; propuestas en el registro, sin cambios de datos ni comportamiento visible"}
- **Blocker:** Decisión del usuario: corte diario (B11), clave y migración HMAC de códigos (S7), plazos de retención y borrado de cuenta (S8).
