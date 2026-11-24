# Socket del PostgreSQL nativo de las pruebas en CI (24/11/2026)

- **Alcance autorizado:** el 24/11 el usuario pidió arreglar la falla de `pg_ctl` del job `owned-db`, que apareció en la corrida manual completa 45449025234 sobre `c864f500`. Commit y push, sólo si los pide. No incluye despliegue.
- **Rol:** coordinador, único escritor. Rama `main`, worktree raíz, commit inicial `c864f500`. La sesión no expone su identificador.

## Causa

En CI, `tests/study-shared-strategy-db.test.mjs` falló con `pg_ctl failed (1): pg_ctl: could not start server` (946 pasan, 1 falla, 3 archivos sin correr). `scripts/teacher-support-test-runtime.mjs` (desde `e37244c9`, 19/11) levanta un PostgreSQL nativo con `pg_ctl` y sólo le pasaba `-h 127.0.0.1 -p <puerto>`. En Ubuntu, el PostgreSQL de Debian crea su socket Unix en `/var/run/postgresql`, que el usuario del runner no puede escribir. En Windows no hay socket Unix, por eso localmente pasaba. El log del cluster, que explicaba la causa, no se mostraba.

## Cambios

- `scripts/teacher-support-test-runtime.mjs`: la nueva función `postgresServerOptions` agrega `-k "<carpeta temporal del cluster>"` fuera de Windows. Si `pg_ctl start` falla, el error incluye las últimas 20 líneas del log de PostgreSQL.
- `tests/teacher-support-postgres-options.test.mjs` (nuevo), registrado en `complete-suite-inventory.json`, en la ruta `fast` de `complete-suite-routes.json` y en la lista `pure` de `ci-suites.mjs`, así que también corre en `verify`.
- `docs/engineering/testing/README.md`: párrafo sobre el runtime nativo.

## Verificación

| Comprobación | Resultado |
|---|---|
| Test nuevo antes de implementar | RED: el módulo no exportaba `postgresServerOptions`. |
| Test nuevo después | GREEN 2/2. |
| `audit-complete-suite`, `architecture-test-discovery`, `audit-ci-runner`, `issue2-ci-workflow` | 38/0. |
| Contenedor descartable `postgres:17.10-bookworm`, con `/var/run/postgresql` en 755 y un usuario sin privilegios (como el runner) | Con las opciones anteriores: `pg_ctl` sale con 1 y el log dice `could not create lock file "/var/run/postgresql/.s.PGSQL.55432.lock": Permission denied`. Con `-k` a la carpeta temporal arranca y `select 1` responde. |
| Windows, PostgreSQL nativo: `study-shared-strategy-db`, `teacher-support-backend-db`, `teacher-writing-backend-db` | 9/0. |
| Windows: `teacher-support-flow`, `teacher-support-sharing-flow` (usan el mismo runtime; están en `owned-browser`) | 12/0. |

## Límites

- La reproducción en Linux usó `pg_ctl` directo con las mismas opciones que arma `postgresServerOptions`, no el runtime completo con Node. La confirmación final es volver a correr `owned-db` en CI.
- Las otras fallas de esa corrida (429 en `p6-wall-integration`, Inicio ausente en `brujula-browser`, cuelgue de `p3-browser`) siguen abiertas.

**Primer paso pendiente:** con push autorizado, lanzar `workflow_dispatch` y confirmar `complete-suite (owned-db)`.
