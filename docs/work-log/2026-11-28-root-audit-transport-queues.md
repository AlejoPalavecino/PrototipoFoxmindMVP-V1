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

## D3, corte 1 (TASK-001): caracterización de los errores

Un agente de sólo lectura mapeó las rutas de error de los 9 hosts; el coordinador verificó en el código los casos que se fijan. [api-error-characterization](../../tests/api-error-characterization.test.mjs) fija estado, código, cabeceras (`Cache-Control`, `X-Content-Type-Options`, `Content-Type`, `Allow`, `Retry-After`, `X-Request-Id`, `Cross-Origin-Resource-Policy`) y forma del cuerpo de las rutas de error que todavía no estaban fijadas. Cubre home, agenda, cupo de IA, archivos, carpetas de estudio, subidas y recordatorios de estudio, adjuntos de chat, Foxy y aulas. Identidad ya está caracterizada por `p33-identity-http` (`wrappers`). Sin cambios de producción: pasa 9/9 con el código actual.

Diferencias entre hosts que quedan fijadas, y que la extracción tiene que conservar:

- requestId en el cuerpo sólo en identidad, archivos y errores de identidad de aulas;
- respaldo ante un error desconocido: 503 en la mayoría, 500 `INTERNAL_ERROR` en identidad, cupo de IA y la admisión de los hosts de archivos y aulas;
- ruta desconocida y método incorrecto: aulas responde 404 y 405 con `INVALID_INPUT`, carpetas de estudio 400, agenda, archivos y Foxy 404 `NOT_FOUND` sin 405, home y cupo de IA 405 con `Allow`, y subidas, recordatorios y adjuntos 405 sin `Allow`;
- cuerpo demasiado grande: 400 en aulas, agenda, subidas y adjuntos, 413 en estudio, Foxy, archivos e identidad, cada uno con su código.

Posible bug, informado y no fijado: en las subidas de estudio, `POST .../uploads` con JSON mal formado respondía 503 `SERVICE_UNAVAILABLE` (el `SyntaxError` no trae código) en vez de 400. El usuario pidió corregirlo; ver abajo.

Suites integradas del corte 1, sobre `main` `9173aca`: `fast` 3297/3297, `owned-db` 972/972 y `wrappers` 19/19.

## Corrección: JSON mal formado en las subidas de estudio

A pedido del usuario, `POST /study-folders/:id/uploads` responde ahora 400 `INVALID_INPUT` ante un JSON mal formado (antes 503). La caracterización lo fija: RED con el código anterior (503), GREEN 9/9. [Subidas](../../apps/api/src/modules/study/folders/presentation/uploads/http.ts).

Suites, sobre `main` `5b61b29`: `fast` 3297/3297, `owned-db` 972/972 y `wrappers` 19/19.

## Pendientes del usuario

- Borrar o no la rama `ccr-9af7730d-b67ekz` del remoto, que contiene los mismos commits que `main`. Se preguntó dos veces sin respuesta; queda sin tocar.

## Primer paso pendiente

Con la autorización resuelta, TASK-001 de D3: pruebas de caracterización de las respuestas de error de cada host.
