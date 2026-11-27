# Rol de base con permisos mínimos (S1)

Coordinador /root, 2026-11-26, sesión sin identificador expuesto. Rama `main`, worktree principal, commit inicial `a7fcf752`. El usuario eligió remediar S1 de la [auditoría](2026-11-26-root-full-stack-audit.md) con estas decisiones: separar el rol que migra del que usa la app, dejar RLS para un diseño aparte, que la API no arranque en producción con privilegios de más y pasar el entorno local a roles separados. Tablero: [audit-database-role](../../odd/tasks/audit-database-role.md). Sin autorización de commit al abrir este registro; el usuario autorizó después commit y push a `main` si las suites pasaban. No concede despliegue.

## Qué cambió

- **Migración `202611260001_application_role`.** Crea el rol sin login `foxmind_app`: `SELECT`, `INSERT`, `UPDATE` y `DELETE` sobre tablas y vistas de `public`, uso de secuencias y los mismos permisos sobre lo que cree después el rol que migra. Le quita a `PUBLIC` el `CREATE` sobre `public` y al rol de app el acceso a `_prisma_migrations`. Es idempotente. [Migración](../../prisma/migrations/202611260001_application_role/migration.sql).
- **Prisma migra con `MIGRATION_DATABASE_URL`** cuando existe y, si no, con `DATABASE_URL`, así los entornos de prueba que sólo definen `DATABASE_URL` siguen igual. [Configuración](../../prisma.config.ts).
- **Guarda de producción.** Con `NODE_ENV=production`, al crear la app se consulta el rol conectado. Si es superusuario, puede crear roles, bases u objetos en `public`, saltea RLS o es dueño (directo o por membresía) de algún objeto, la API no arranca. [Guarda](../../apps/api/src/platform/database/least-privilege.ts).
- **Entorno local.** `local:up` genera `LOCAL_APP_DATABASE_PASSWORD`, escribe en `DATABASE_URL` el login `foxmind_app_local` y en `MIGRATION_DATABASE_URL` el superusuario, migra y crea o actualiza el login dentro de `foxmind_app`. Un `.env` anterior que apuntaba la app al superusuario de la misma base se actualiza en lugar de rechazarse. [Arranque local](../../scripts/local-app.mjs) · [ayudantes](../../scripts/local-app-environment.mjs).
- Guías: [modelo de datos](../engineering/data-model.md#roles-de-base), que además corrige el conteo a 71 modelos y 71 migraciones, y [desarrollo local](../engineering/local-development/README.md).

## Comprobaciones

| Qué | Prueba | RED | GREEN |
| --- | --- | --- | --- |
| Permisos del rol | `tests/database-roles.test.mjs` (Postgres propio) | `foxmind_app` no existía | 2/2: lee y escribe filas; `CREATE TABLE`, `ALTER TABLE`, `TRUNCATE`, `DROP TABLE`, `CREATE ROLE`, `CREATE FUNCTION` y escribir `_prisma_migrations` devuelven 42501; tablas futuras heredan permisos |
| Guarda | misma prueba y `p33-identity-http.test.mjs` | — | rechaza `postgres` y un login dueño de una tabla; en producción la API arranca con un login de app e inicia sesión con cookie `Secure` (HTTP 23/23) |
| Entorno local | `tests/local-app-environment.test.mjs` | ayudantes inexistentes | 10/10 |

`npm run local:up` sobre el entorno local propio, que estaba detenido: migró, creó el login y levantó la app. `GET /api/v1/auth/session` y la web respondieron 200. En la base, las 5 conexiones de la API son de `foxmind_app_local` (sin superusuario), la migración figura terminada y los 4 usuarios existentes se conservaron. Después `local:stop` dejó el entorno detenido, con volúmenes y datos.

La primera corrida de `fast` y `owned-db` falló en `activity-migration-inventory` y `classroom-ai-migration`, que fijan la lista exacta de migraciones: se agregó la nueva a `tests/helpers/migration-inventory.mjs` y se repitieron ambas suites completas. La segunda corrida de `fast` falló en `audit-architecture`, que compara el objeto de configuración base completo y no esperaba el campo `production`; se actualizó la expectativa con el caso de producción y se repitió `fast` completa.

Suites integradas con `npm run test:complete -- --group <grupo>`: `fast` 3224/3224, `owned-db` 962/962 y `wrappers` 19/19 completos (no informan conteos individuales). `npm run docs:check`: 0 problemas. Tablero: `taskboard.py check` válido, tres tareas DONE.

## Límites

- Las suites de integración siguen conectando la app como `postgres`. Con el rol mínimo se ejercitaron el arranque y el flujo de identidad, y el arranque local; los demás módulos no se recorrieron completos con `foxmind_app`. La búsqueda de SQL en tiempo de ejecución no encontró DDL, `LOCK TABLE`, secuencias manuales ni funciones `SECURITY DEFINER`.
- La guarda sólo actúa con `NODE_ENV=production`. El servidor real necesita crear su login de app antes de desplegar esta versión.
- RLS queda pendiente como diseño aparte.
