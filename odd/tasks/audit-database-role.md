# Feature: La app usa un rol de base con sólo los permisos que necesita (S1)

- **Spec:** #especificacion
- **Design:** #diseno
- **Approval:** approved
- **Evidence mode:** candidate-v1
- **Trace mode:** requirements-v1

El 2026-11-26 el usuario eligió remediar S1 de la [auditoría](../../docs/work-log/2026-11-26-root-full-stack-audit.md) y decidió: separar el rol que migra del que usa la app; dejar RLS para un diseño aparte; que la API no arranque en producción con privilegios de superusuario o de dueño; y pasar el entorno local a roles separados en el próximo `local:up`. Después autorizó commit y push a `main` si las suites pasaban. No concede despliegue.

## Seguimiento Git

Base `main` en `a7fcf752`. Commit directo en `main` y push, autorizados.

## Especificacion

- **REQ-001:** Las migraciones crean el rol sin login `foxmind_app`, con `SELECT`, `INSERT`, `UPDATE` y `DELETE` sobre todas las tablas y vistas del esquema `public` (salvo el registro de migraciones), uso de sus secuencias, y los mismos permisos sobre los objetos que cree en el futuro el rol que migra. No puede crear objetos en el esquema, truncar ni alterar tablas.
- **REQ-002:** Prisma migra con `MIGRATION_DATABASE_URL` cuando existe y, si no, con `DATABASE_URL`.
- **REQ-003:** Con `NODE_ENV=production`, la API no arranca si su conexión es superusuario, puede crear roles o bases, saltea RLS, puede crear objetos en `public` o es dueña de alguna tabla.
- **REQ-004:** `npm run local:up` crea un usuario de app miembro de `foxmind_app`, escribe su URL en `DATABASE_URL` y migra con el superusuario por `MIGRATION_DATABASE_URL`, sin tocar los datos.

## Diseno

Migración `202611260001_application_role` idempotente (`DO` con `IF NOT EXISTS`). La guarda vive en `platform/database` y la llama la composición después de crear la app. El login local se crea o actualiza en cada `local:up` con la contraseña guardada en `.env`. RLS queda fuera.

## Tasks

### TASK-001 — El rol de la app sólo lee y escribe filas
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-002
- **Verification:** tests/database-roles.test.mjs
- **Acceptance:** Un usuario miembro de `foxmind_app` lee y escribe filas de cada tabla; no puede `CREATE TABLE`, `ALTER TABLE`, `TRUNCATE` ni escribir `_prisma_migrations`; toda tabla de `public` (salvo `_prisma_migrations`) tiene los cuatro permisos; una tabla creada después por el rol que migra también.
- **Scope:** ["prisma/migrations/202611260001_application_role/migration.sql", "prisma.config.ts", "tests/database-roles.test.mjs", "scripts/ci-suites.mjs", "scripts/complete-suite-inventory.json", "scripts/complete-suite-routes.json", "tests/helpers/migration-inventory.mjs", "docs/engineering/data-model.md"]
- **Evidence:** {"command":"node --test tests/database-roles.test.mjs; migration inventory tests","result":"RED: rol foxmind_app inexistente; GREEN: 2/2 (DML ok; DDL, TRUNCATE, roles, funciones y _prisma_migrations 42501; tablas futuras heredan); run-complete-suite --group fast 3224/3224 (tercera corrida), --group owned-db 962/962 (segunda corrida), --group wrappers 19/19 completos","candidate":"sha256:a4e6e1d58bbd5244759b804cb48cb1effb9502cf91159f6378b5acbbdebe13e6"}
- **Blocker:** none

### TASK-002 — La API no arranca en producción con privilegios de más
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** orchestrator
- **Requirements:** REQ-003
- **Verification:** tests/database-roles.test.mjs y tests/p33-identity-http.test.mjs
- **Acceptance:** Con `NODE_ENV=production`, conectada como `postgres` la API no arranca y como miembro de `foxmind_app` sí; fuera de producción arranca con cualquiera de los dos.
- **Scope:** ["apps/api/src/platform/database/least-privilege.ts", "apps/api/src/platform/configuration.ts", "apps/api/src/bootstrap/application.ts", "tests/p33-identity-http.test.mjs", "tests/audit-architecture.test.mjs"]
- **Evidence:** {"command":"node --test tests/database-roles.test.mjs; node scripts/test-p33-identity-http.mjs; tests/audit-architecture.test.mjs","result":"GREEN: rechaza postgres y login duenio; produccion arranca con login de app e inicia sesion (HTTP 23/23); audit-architecture 4/4; run-complete-suite --group fast 3224/3224 (tercera corrida), --group owned-db 962/962 (segunda corrida), --group wrappers 19/19 completos","candidate":"sha256:04472a71ec89d572a5b2d141fb74003792bb5a271bf64e615c11e921c053a241"}
- **Blocker:** none

### TASK-003 — El entorno local usa roles separados
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** orchestrator
- **Requirements:** REQ-004
- **Verification:** tests/local-app-environment.test.mjs y `npm run local:up` en el entorno propio
- **Acceptance:** El `.env` queda con `DATABASE_URL` del usuario de app y `MIGRATION_DATABASE_URL` del superusuario; un `.env` anterior con la URL del superusuario se migra en vez de rechazarse; otra base distinta se sigue rechazando; la app local arranca y responde.
- **Scope:** ["scripts/local-app.mjs", "scripts/local-app-environment.mjs", "tests/local-app-environment.test.mjs", "docs/engineering/local-development/README.md"]
- **Evidence:** {"command":"node --test tests/local-app-environment.test.mjs; npm run local:up y local:stop en el entorno propio","result":"RED: ayudantes inexistentes; GREEN: 10/10; local:up migro, API como foxmind_app_local (5 conexiones), session y web 200, 4 usuarios conservados; run-complete-suite --group fast 3224/3224 (tercera corrida), --group owned-db 962/962 (segunda corrida), --group wrappers 19/19 completos","candidate":"sha256:0f9e0a735209cc44ba869fff581b6580389a9f8e36b1353c9f69b8fbe15675ff"}
- **Blocker:** none
