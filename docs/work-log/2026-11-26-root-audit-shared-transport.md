# Un solo transporte web y una sola admisión en la API (F1, F2, D2)

Coordinador /root, 2026-11-26, sesión sin identificador expuesto. Rama `main`, worktree principal, commit inicial `a06c9214`. El usuario eligió remediar F1/D2 de la [auditoría](2026-11-26-root-full-stack-audit.md) con estas decisiones: reglas de dominio sólo en la API; sólo identidad reenvía todas las cookies; forma de error común sin renombrar códigos; commit y push a `main` por corte con `fast`, `owned-db` y `wrappers` en verde. Tablero: [audit-shared-transport](../../odd/tasks/audit-shared-transport.md).

Dos exploraciones de sólo lectura mapearon los 8 proxies web (18 divergencias, entre ellas cinco modos distintos de tratar cuerpos rechazados, cinco proxies que reenvían cualquier `Set-Cookie` y el límite de 50 MB escrito de dos formas) y los 9 hosts de la API (5 copias de `writeGuard`, `Retry-After` sólo en 4, drenaje distinto en cada uno, acceso directo a `IdentityRuntime.store`). El coordinador revisó en el código los puntos de cada corte antes de cambiarlos.

## Corte 1 — núcleo web, home, agenda y cupo de IA

- [Núcleo](../../apps/web/src/application/server/transport/api-transport.ts): `apiDestination`, `strictPath`, `sendError`, `rejectRequest` (con el `discardRejectedBody` existente), `upstreamHeaders`, `relayHeaders` con la política de cookies, `readBounded`, `forward` y `relayJson`.
- [Home](../../apps/web/src/application/server/home-proxy.ts), [agenda](../../apps/web/src/application/server/agenda-proxy.ts) y [cupo de IA](../../apps/web/src/application/server/ai-quota-proxy.ts) pasaron al núcleo. Conservan sus rutas, métodos, límites y validaciones de dominio (F2 se trata en el corte 3). Cambios de comportamiento: errores con `requestId`, `X-Request-Id` y `Retry-After` en 503; home y agenda dejan de reenviar cookies que no sean el borrado de sesión; agenda descarta el cuerpo rechazado con presupuesto y plazo en vez de leerlo sin límite.
- [Guía del frontend](../engineering/frontend/README.md#transporte-común-de-los-proxies).

| Prueba | RED | GREEN |
| --- | --- | --- |
| `tests/web-proxy-transport.test.mjs` (nueva) | forma de error sin `requestId`; `Set-Cookie` arbitrario reenviado por agenda | 3/3 |
| `agenda-proxy`, `foxmind-3d-http`, `monthly-ai-quota-transport`, `proxy-client-address` | — | 2/2, 3/3, 2/2, 12/12 |

La prueba de cuerpo rechazado ya pasaba con el código anterior: queda como red de seguridad del cambio de drenaje, no como RED.

`npx tsc --noEmit -p apps/web/tsconfig.json`, `npm run web:build`, `npm run lint:boundaries`, `run-complete-suite --check` (748 entradas) y `npm run docs:check` pasaron.

La primera corrida de `fast` falló en `home-order`, que exigía el error del proxy sin `requestId`. Se ajustó para distinguir el proxy (con `requestId`) de la API (sin cambios en este corte) y se repitió `fast` completa.

Suites integradas del corte 1: `fast` 3227/3227 (segunda corrida), `owned-db` 962/962 y `wrappers` 19/19 completos.

## Corte 2 — identidad, archivos, estudio y Foxy

- El núcleo adoptó el orden de rechazo que ya tenían Foxy y aulas, documentado y fijado por `proxy-rejection-lifecycle`: descartar con presupuesto y después responder, o cortar si se excede. Se agregó el modo «responder y cerrar» para cuerpos cuyo tamaño declarado ya excede el límite, que conserva la respuesta 413 inmediata de las subidas binarias.
- [Archivos](../../apps/web/src/application/server/file-proxy.ts): destino, error y rechazo del núcleo; chequeo estricto de ruta; deja de reenviar cookies que no sean el borrado de sesión; el binario sólo conserva los tipos que sirve la API, y otro tipo pasa a `application/octet-stream`.
- [Estudio y adjuntos de chat](../../apps/web/src/application/server/study-proxy.ts): destino, error, cookies y rechazo del núcleo; deja de drenar sin límite; el binario pasa de `50*1024*1024` a `FILE_MAX_BYTES` (50.000.000, el valor de la API) y el adjunto usa `DOCUMENT_MAX_BYTES`.
- [Foxy](../../apps/web/src/application/server/foxy-proxy.ts): destino, error, cookies y rechazo del núcleo, mismo comportamiento.
- [Identidad](../../apps/web/src/application/server/identity-proxy.ts): conserva su transporte con `fetch`, porque sus pruebas le inyectan el `fetch` de la API; usa el destino del núcleo y rechaza `content-encoding` distinto de `identity` en vez de reenviarlo.
- Se confirmó en la API que, fuera de identidad, sólo se emite `clearSessionCookie`; la rotación de sesión vive en el transporte de identidad. Por eso `p4-web-proxy` pasó de exigir una cookie rotada por archivos a exigir que no llegue.

| Prueba | RED | GREEN |
| --- | --- | --- |
| `web-proxy-transport` (caso de archivos) | el proxy anterior reenviaba `text/html` | 4/4 |
| `p4-web-proxy`, `p3-web-proxy`, `identity-composition` | — | 7/7, 11/11, 2/2 |
| `study-proxy-upload-streaming`, `foxy-exact-attachment-transport`, `study-client`, `study-image-database` | — | 3/3, 3/3, 8/8, 1/1 |
| `foxy-proxy`, `proxy-rejection-lifecycle`, `brujula-foxy-handoff-proxy`, `proxy-client-address` | — | 17/17, 14/14, 1/1, 12/12 |

Suites integradas del corte 2: `fast` 3228/3228, `owned-db` 962/962 y `wrappers` 19/19 completos.

## Corte 3a — aulas sobre el núcleo

[Aulas](../../apps/web/src/application/server/classroom-proxy.ts) usa el destino, el error, el rechazo (mismo orden de descarte que ya tenía) y la política de cookies del núcleo. Deja de reenviar cookies que no sean el borrado de sesión, por eso `p5-web-proxy` pasó de exigir una cookie rotada a exigir que no llegue. Sus reglas de dominio no cambian en este corte.

F2 se separó en una tarea propia (TASK-005): el proxy de aulas valida en el web borradores, actividades, preguntas, calificación, muro, notificaciones y participación, y unas 20 pruebas fijan esos rechazos del lado web. Retirar cada regla exige antes probar que la API la rechaza, así que va en subcortes por dominio.

| Prueba | Resultado |
| --- | --- |
| Las 25 pruebas que usan el proxy de aulas | todas en verde; `p5-web-proxy` 9/9 tras ajustar la cookie |

Suites integradas del corte 3a: `fast` 3228/3228, `owned-db` 962/962 y `wrappers` 19/19 completos.

## Corte 4 — una sola admisión en la API (D2)

- [http-admission](../../apps/api/src/bootstrap/http-admission.ts) reemplaza la secuencia copiada en los 9 hosts y las 5 copias de `writeGuard`. Home, agenda, Foxy, cupo de IA, estudio y archivos usan `admitRequest`; aulas usa `identifyRequest` y conserva sus cupos propios con `admitBuckets`; las autenticaciones dentro de transacción usan `authenticateInTransaction`.
- `IdentityRuntime.store` pasó a privado; `authenticateVerifier` y `admitBuckets` lo reemplazan.
- Cambios de comportamiento: todo 429 lleva `Retry-After` (antes faltaba en home, agenda, Foxy y estudio); origen y CSRF en todo método que no sea GET ni HEAD (antes cada host usaba su propio criterio; por ejemplo, archivos sólo en POST y PUT); archivos exige correo verificado al ingresar (antes sólo lo chequeaba la custodia, con el mismo código); la admisión anónima de estudio ahora también borra una cookie inválida.
- Se probó cerrar la conexión de los cuerpos rechazados en la admisión común, pero cortaba escrituras JSON chicas que llegan por el proxy web antes de que el proxy leyera el 403, y respondía 503. Ese cierre queda en archivos y aulas, que reciben cuerpos grandes.
- Pruebas ajustadas: los dobles de `IdentityRuntime` en `p4-host`, `p5-host`, `foxy-host`, `agenda-client-http` y `study-runtime` suman `authenticateVerifier` y `admitBuckets`; el usuario de `p4-host` pasa a estar verificado; `agenda-client-http` comparte `http-admission` con sus clases de error; `study-runtime` verifica el código del error.

| Prueba | RED | GREEN |
| --- | --- | --- |
| `tests/http-admission.test.mjs` (nueva) | el módulo no existía | 3/3 |
| `p4-host`, `p5-host`, `p5-session-bridge`, `foxy-host`, `agenda-client-http`, `study-runtime` | — | 6/6, 7/7, 5/5, 2/2, 4/4, 8/8 |
| `architecture-host`, `technical-backend-modules`, `exclusive-account-role`, `monthly-ai-quota-transport`, `backend-academic-routes`, `foxmind-3d-http`, `home-order`, `study http` | — | 5/5, 4/4, 6/6, 2/2, 83/83, 3/3, 4/4, 1/1 |

2026-11-27: el corte 4 se rebasó sobre `main` con las PR #29 y #32 (`1065eff2`); el único conflicto, en `scripts/ci-suites.mjs`, fue una línea donde ambas partes agregaron una prueba y se conservaron las dos. Docker no había arrancado tras reiniciar la PC y una prueba de Foxy falló por eso; con Docker en marcha pasó. La primera corrida de `owned-db` falló en `p5-codes-invitation-batches`: dos dobles de `IdentityRuntime` sin `authenticateVerifier` ni `admitBuckets` respondían 500 (no era S7). Se adaptaron (11/11) y ya no queda ningún doble sin adaptar.

Suites integradas del corte 4, sobre `main` `1065eff2`: `fast` 3238/3238, `owned-db` 969/969 (segunda corrida) y `wrappers` 19/19.

## Tren de merges (2026-11-27)

Después del corte 4 (`6dc90926`) entraron a `main`, en este orden y con el CI en verde sobre la cabeza exacta de cada PR: #29 (`0ceab161`), #32 (`1065eff2`), #30 (`5c50ab14`) y #31 (`7bea3829`). La #31 no compilaba al combinarse con el corte 4 porque el cupo de invitaciones leía `IdentityRuntime.store`; su sesión lo pasó a `admitBuckets`.

## Corte 5 — F2, agenda

Decisiones del usuario al abrir F2: la API decide el orden (sesión y permisos antes que la forma), la validación de la respuesta de Home se conserva en el proxy por ahora, y cada subcorte se sube con las tres suites en verde.

- El [proxy de agenda](../../apps/web/src/application/server/agenda-proxy.ts) ya no valida claves ni valores de la consulta, ni la forma de los cuerpos (evento, revisión, apertura académica). Conserva rutas, métodos, tamaño (32 KiB), `content-encoding`, `content-type` JSON y GET sin cuerpo.
- Divergencia encontrada: el proxy exigía `limit` en decimal canónico (`^[1-9]d?$`) y la API aceptaba `01` o `1e1`. Como todo el tráfico pasaba por el proxy, la conducta observable era la estricta, y se llevó a la [API](../../apps/api/src/modules/agenda/events/presentation/http-routes.ts).
- Cambio observable: un pedido mal formado sin sesión recibe ahora 401 (antes 400 del proxy).

| Prueba | RED | GREEN |
| --- | --- | --- |
| `agenda-http`: 17 formas que el proxy dejó de revisar responden exactamente 400 `INVALID_INPUT` sin llegar al servicio | `limit=01` respondía 200 | 4/4 |
| `agenda-proxy`: esas formas se reenvían intactas; rutas, métodos, tipo de contenido y tamaño se siguen cortando antes de la API | el proxy respondía 400 | 3/3 |
| `agenda-feature`, `proxy-client-address`, `web-proxy-transport` | — | en verde |

Suites integradas del corte 5, sobre `main` `7bea3829`: `fast` 3273/3273, `wrappers` en verde y `owned-db` 969/969 (segunda corrida; la primera cortó en la prueba 421 por un `docker run` de Foxy que pasó los 20 s con la máquina cargada, y esa prueba pasó 2/2 aislada). Como los merges y este corte cambiaron archivos del alcance de TASK-001 a TASK-004, esas tareas se volvieron a verificar sobre el candidato actual con sus pruebas declaradas (26/26, 24/24, 89/89 y 44/44) antes de cerrar TASK-005.

## Corte 6 — F2, Home

- El [proxy de Home](../../apps/web/src/application/server/home-proxy.ts) ya no valida la consulta (claves repetidas, `module`, orden, zona horaria, cursor). Conserva rutas, GET sin cuerpo y, por decisión del usuario, la validación de la respuesta 200 de la API.
- La API usa los mismos parsers y los mismos chequeos de claves repetidas y de `module`, así que no hubo divergencia.

| Prueba | RED | GREEN |
| --- | --- | --- |
| `home-order`: las 5 consultas inválidas dan 400 `INVALID_INPUT` en la API y, por el web, el cuerpo es el de la API | el proxy respondía con su propio error (con `requestId`) | 4/4 |
| `foxmind-3d-http`, `proxy-client-address`, `web-proxy-transport` | — | 3/3, 12/12, 4/4 |

Suites integradas del corte 6, sobre `main` `0b1c897a`: `fast` 3273/3273, `owned-db` 969/969 y `wrappers` 19/19.

## Estado al pausar (2026-11-27)

- En `main`: cortes 5 (agenda, `0b1c897a`) y 6 (Home). Quedan los tres subcortes de aulas (TASK-007 a TASK-009).
- Mapa de aulas (lectura del código, sin ejecutar): consultas sin divergencias; en cuerpos, la API no rechaza como el proxy un `confirmation` no textual en `codes/confirm` (da 409) ni los temas repetidos con distinta mayúscula en la ruta sin `unitIds` (`activities/domain/topic-selection.ts`, termina en 503 por clave duplicada); en participación, `GET .../ai-summary` ignora las cabeceras `x-attempt-*` que el proxy rechaza. Esas tres se llevan a la API antes de quitar la regla del proxy. El 409 antes que el 400 en actividades iniciadas o no publicadas quedó aceptado.
- Primer paso al retomar: TASK-007 (consultas de aulas). Primero, pruebas HTTP de la API con el arnés de `tests/backend-academic-routes.test.mjs` para `parseWallQuery`, `parseNotificationQuery`, `parseBrujulaSearchQuery` y `parseTeacherSupportQuery`; después, RED en el proxy y retiro.

## Límites

- Algunas pruebas cargan los `.ts` con *strip-only*, que no admite propiedades en los parámetros del constructor; el núcleo las evita.
