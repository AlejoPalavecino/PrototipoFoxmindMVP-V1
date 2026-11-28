# Transporte HTTP propio y colas de trabajo (D3 y D4)

Coordinador /root, sesión en la nube del 2026-11-28, sin identificador expuesto. Rama de trabajo `ccr-9af7730d-b67ekz`, igual a `main` `8f4d860`. No se leyó `.env` ni `.test-artifacts/`.

El 2026-11-28 el usuario eligió la opción A en las dos decisiones de la [auditoría](2026-11-26-root-full-stack-audit.md):

- **D3:** asumir el transporte HTTP propio y extraerlo a `apps/api/src/platform/http`, sin adoptar los controllers de NestJS. Tablero: [audit-api-transport](../../odd/tasks/audit-api-transport.md).
- **D4:** una primitiva de colas propia sobre las tablas existentes, sin dependencias nuevas. Tablero: [audit-job-queues](../../odd/tasks/audit-job-queues.md).

El mismo día, ante el plan de cortes, el usuario autorizó commit y push a `main` corte por corte con `fast`, `owned-db` y `wrappers` en verde, eligió hacer D3 primero y aprobó ampliar la regla de límites para que las capas de presentación importen sólo `apps/api/src/platform/http/`. No concede despliegue.

## Inventario (lectura del código, 2026-11-28)

- Escriben respuestas HTTP 11 archivos: `bootstrap/academic-http`, `ai-quota-http`, `chat-attachment-transport`, `files-host` y las presentaciones de agenda, archivos, Foxy, home, identidad, carpetas de estudio y subidas de estudio. La auditoría había contado 8 escritores.
- Hay 6 lectores de cuerpo propios: `readBody` (aulas), `readIdentityJson`, `body()` de archivos, `body()` de Foxy, `body()` de carpetas de estudio y `readStudyBody`.
- Hay unas 8 tablas de código a estado; la auditoría contó 7.
- La regla de límites (`scripts/migration-boundaries.mjs`) no deja que una capa de presentación importe `apps/api/src/platform/`; sólo la infraestructura puede, y `platform/` no puede importar módulos. Por eso D3 necesita ampliar la regla para `platform/http/` y que cada host pase su tabla de errores.
- `SKIP LOCKED` aparece en 14 archivos: unas 9 colas con reclamo y *lease* y 5 purgas o recuperaciones (detalle en el tablero de D4).

## Entorno

El contenedor de la sesión se reinició: Docker estaba detenido y los envoltorios de `initdb`/`pg_ctl` del scratchpad habían desaparecido. Se recrean antes de correr suites, como en los cortes 7 a 9 de [transporte compartido](2026-11-26-root-audit-shared-transport.md).

## Corrección de agenda encontrada al caracterizar

El mapa de errores de los hosts (agente de sólo lectura, verificado en el código por el coordinador) encontró que el control de `limit` de `GET /agenda/upcoming` quedó como `/^[1-9]d?$/` en el corte 5 de F2. Rechazaba de 10 a 20 y aceptaba `1d`. Se corrige aparte, antes de caracterizar, para no fijar un bug como contrato; la autorización es la de F2. Detalle en el [registro de F2](2026-11-26-root-audit-shared-transport.md#corrección-del-corte-5-2026-11-28).

Suites de la corrección, sobre `main` `9b8963c`: `fast` 3288/3288, `owned-db` 972/972 y `wrappers` 19/19.

## Pendientes del usuario

- Borrar o no la rama `ccr-9af7730d-b67ekz` del remoto, que contiene los mismos commits que `main`. Se preguntó dos veces sin respuesta; queda sin tocar.

## Primer paso pendiente

Con la autorización resuelta, TASK-001 de D3: pruebas de caracterización de las respuestas de error de cada host.
