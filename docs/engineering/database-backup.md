# Backup y restauración de la base

FoxMind guarda todo su estado durable en PostgreSQL; los bytes de archivos viven aparte, en el almacenamiento de objetos. Esta guía cubre sólo la base. Un backup de base sin el almacenamiento correspondiente restaura filas que apuntan a archivos que pueden faltar; para una recuperación completa, copiá ambos en el mismo momento.

## Imagen fijada

Todos los contenedores de Postgres (compose local, CI y bases propias de las pruebas) usan `postgres:17.10-bookworm@sha256:9b18b78397054fce88a9552e9d5a3ad5bb7fd258c5b3cc1c5028e46373d6ea8f`. La [prueba de imagen](../../tests/postgres-image-pin.test.mjs) falla si aparece otra referencia. Para actualizar Postgres, cambiá el digest en todas las referencias a la vez y repetí las suites y una restauración de prueba.

El primer `local:up` o `docker compose up` después de fijar el digest recrea el contenedor de Postgres porque cambió el nombre de la imagen. El volumen y los datos se conservan.

## Hacer un backup

```powershell
node scripts/database-backup.mjs backup --container=<contenedor> --database=<base> --user=<rol dueño> --file=<ruta.dump>
```

- `pg_dump` corre dentro del contenedor por su socket local: no hace falta pasar contraseñas ni URLs, y la versión de la herramienta es la del servidor.
- El resultado tiene formato personalizado y comprimido. Se escribe primero como `.partial` y sólo se renombra cuando `pg_restore --list` lo lee completo y encuentra el historial `_prisma_migrations`.
- Usá el rol dueño (el que migra), no el login de la app: `foxmind_app` no puede leer `_prisma_migrations`.
- El archivo contiene datos personales. Guardalo cifrado, fuera del repositorio y de `.test-artifacts/`, con la misma retención que la base.

## Restaurar

```powershell
node scripts/database-backup.mjs restore --container=<contenedor> --database=<base vacía> --user=<rol dueño> --file=<ruta.dump>
```

1. La base de destino tiene que existir y estar vacía: si `public` tiene alguna tabla, el comando se niega con `RESTORE_TARGET_NOT_EMPTY`. Nunca escribe sobre una base en uso.
2. `pg_restore` carga el volcado en una sola transacción, sin dueños ni permisos (`--no-owner --no-acl`). Los objetos quedan a nombre del rol que restaura, que pasa a ser el rol dueño.
3. Después reaplica la [migración del rol de app](../../prisma/migrations/202611260001_application_role/migration.sql), que es idempotente: crea `foxmind_app` si el clúster no lo tenía y recupera sus permisos y los permisos por defecto.
4. Informa cuántas tablas y migraciones terminadas quedaron. Los logins de la app no viajan en el volcado (son del clúster): creálos de nuevo como indica el [modelo de datos](data-model.md#roles-de-base). En local, `npm run local:up` lo hace solo.

## Prueba de restauración

La [prueba de backup y restauración](../../tests/database-backup-restore.test.mjs) migra una base propia con datos sintéticos y el historial de Prisma, hace el backup, lo restaura en un clúster nuevo sin el rol `foxmind_app` y compara la cantidad de filas de cada tabla, el historial y los permisos del rol. También comprueba que una segunda restauración sobre la misma base se rechace. Corre en el grupo `owned-db`.

## Límites

- No hay backups programados ni retención automática: el comando se ejecuta a mano. Programarlo y elegir dónde guardar las copias depende del entorno de despliegue, que todavía no está definido.
- No cubre recuperación a un punto en el tiempo (WAL) ni el almacenamiento de objetos.
- No se probó sobre el entorno local persistente ni sobre datos retenidos; sólo sobre bases propias de prueba.
