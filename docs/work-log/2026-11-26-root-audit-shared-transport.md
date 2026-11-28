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

## Corte 7 — F2, consultas de aulas

Sesión en la nube del 2026-11-27, rama de trabajo `ccr-9af7730d-b67ekz` igual a `main` `0700d8d`, contenedor efímero con dependencias instaladas por `npm ci` y Docker propio (imagen de Postgres fijada por digest). No se leyó `.env` ni `.test-artifacts/`.

- El [proxy de aulas](../../apps/web/src/application/server/classroom-proxy.ts) ya no valida consultas: retira `parseBrujulaSearchQuery`, `parseWallQuery`, `parseNotificationQuery` y `parseTeacherSupportQuery`, y también el rechazo de una consulta en rutas o métodos que no la admiten. Conserva rutas, métodos, el chequeo de ortografía cruda de la ruta (`%`, `\\`, `#`, `..`), tamaño, codificación, tipo de contenido, GET sin cuerpo, las reglas de cuerpos (TASK-008) y las de cabeceras de intento (TASK-009).
- La API ya aplicaba los mismos parsers y la misma lista de rutas con consulta ([host de aulas](../../apps/api/src/bootstrap/academic-http.ts)), con 400 `INVALID_INPUT`: no hubo divergencia.
- Orden: en aulas la API revisa la forma de la consulta antes que la sesión (la admisión no exige sesión y los servicios autentican dentro de la transacción), así que una consulta mal formada sin sesión sigue recibiendo 400. Lo único observable que cambia es el cuerpo del error: ahora es el de la API, sin el `requestId` que agregaba el proxy.
- Pruebas ajustadas: diez pruebas del proxy exigían que la consulta no llegara a la API (`activity-ai-proxy`, `audit-wall-proxy`, `classroom-ai-proxy`, `p5-web-proxy`, `p7-questionnaire-proxy`, `p8-corrections-proxy`, `p8-grading-proxy`, `p8-progress-proxy`, `p8-publication-proxy` y `teacher-support-transport`). Esos casos pasaron a la prueba nueva, que comprueba el rechazo en la API y el reenvío en el proxy; `audit-wall-proxy` y `teacher-support-transport` ahora exigen el reenvío intacto. Las demás aserciones de esas pruebas no cambiaron.

| Prueba | RED | GREEN |
| --- | --- | --- |
| `tests/classroom-query-forwarding.test.mjs` (nueva): 45 consultas (búsqueda, muro, notificaciones, apoyo docente y consultas en rutas sin consulta) | la parte de la API pasó ya con el código anterior (sin divergencia); por el web, el error lo armaba el proxy (con `requestId`) y la consulta no llegaba a la API | 2/2 |
| las 10 pruebas de proxy ajustadas, más `brujula-search-transport` y `brujula-notifications-batch` | — | en verde |

`npx tsc --noEmit -p apps/web/tsconfig.json`, `npm run lint:boundaries`, `run-complete-suite --check` (762 entradas) y `npm run docs:check` pasaron.

Entorno de las suites: el contenedor traía Node 22 y el proyecto exige Node 24 (`engines`, CI). Con Node 22, `fast` cortó dos veces en `foxy-text-adapter` (5 subpruebas canceladas por «Promise resolution is still pending»; aislada, también falló una de cuatro corridas sin este cambio) y `api-build-pipeline` no reconoce `--test-isolation=none`. Se instaló Node 24.22.3 en el scratchpad, verificado con el `SHASUMS256.txt` oficial; con él `foxy-text-adapter` pasó 10/10. También se resolvieron tres faltantes del contenedor, sin tocar el repositorio: `initdb` se niega a correr como root, así que `initdb` y `pg_ctl` se envolvieron para correr con un usuario sin privilegios (con un `pg_config` que los apunta, porque el ejecutor sólo conserva `PATH`); la primera descarga de Mailpit falló y la segunda bajó; y el Playwright fijado (1.64.1) buscaba `chromium_headless_shell-1248`, que se enlazó al Chromium 1243 preinstalado.

Suites integradas del corte 7, sobre `main` `0700d8d`: `fast` 3275/3275, `owned-db` 969/969 (las primeras corridas cortaron por `initdb` como root) y `wrappers` 19/19 (las dos primeras cortaron por la descarga de Mailpit y por el navegador).

## Corte 8 — F2, cuerpos de autoría y de aula

Misma sesión en la nube, sobre `main` `86a29fe`, con el entorno del corte 7 (Node 24.22.3, Docker propio y envoltorios de `initdb`/`pg_ctl` en el scratchpad).

- Alcance elegido para TASK-008: todo cuerpo que no sea de calificación ni de participación. Borradores, extracciones, códigos, invitaciones y lotes, ajustes, archivo, código del aula, salir y remover, plan, biblioteca, muro, generaciones, actividades (con su plazo), escritura docente y avisos. Quedan para TASK-009 los de calificación, IA de calificación, publicación, correcciones, respuestas, entrega práctica, reapertura, `start`, `authorize-first` y `transfer`.
- La API valida estos cuerpos en sus servicios, no en la capa HTTP (que sólo revisa las claves). Por eso la prueba del lado API corre contra los servicios reales sobre una base propia: [classroom-body-api-database](../../tests/classroom-body-api-database.test.mjs) manda 107 cuerpos que el proxy rechazaba ([casos compartidos](../../tests/helpers/classroom-body-cases.mjs)) y exige 400 `INVALID_INPUT` en cada uno y ninguna fila cambiada en la base. Generaciones y extracciones usan los servicios reales con puertos que fallan si se tocan: parsean antes de usarlos.
- Divergencias encontradas: 3 de los primeros 93 casos, las dos del mapa. Se llevaron a la API antes de quitar la regla:
  - `codes/confirm` con un `confirmation` que no es texto respondía 409 `ENROLLMENT_UNAVAILABLE`. Ahora [responde](../../apps/api/src/modules/classrooms/memberships/application/membership-code-operations.ts) 400 `INVALID_INPUT`, después de comprobar que la cuenta es de alumno (sesión y permisos antes que la forma).
  - En actividades, ids de temas que difieren sólo en mayúsculas pasaban la unicidad y terminaban en 503 por clave duplicada. La [selección](../../apps/api/src/modules/activities/domain/topic-selection.ts) compara ahora sin distinguir mayúsculas, en `unitIds` y en `topicIds`, y responde 400.
- El [proxy de aulas](../../apps/web/src/application/server/classroom-proxy.ts) deja de validar esos cuerpos. Conserva el tipo de contenido JSON, el tamaño y que el cuerpo sea JSON bien formado. `schema()` quedó reducida a lo que usan `start`, `authorize-first` y `transfer`, y se retiró `activity-generation-proxy.ts`, que sólo servía a esta validación.
- Nueve pruebas del proxy exigían el rechazo en el web, y `academic-features` exigía que existiera el archivo retirado (`activity-ai-proxy`, `brujula-contract-parity-proxy`, `classroom-ai-proxy`, `p5-codes-invitation-batches`, `p5-web-proxy`, `p7-authoring-proxy`, `pending-classrooms`, `product-parity-activity-proxy` y `teacher-support-transport`). Sus cuerpos se sumaron a los casos compartidos (por eso pasaron de 93 a 107) y ahora exigen que el cuerpo llegue a la API. En `brujula-contract-parity-proxy` la calificación sigue rechazándose en el web (TASK-009). En `pending-classrooms` el servicio es simulado, así que el `confirm` no booleano se quitó de esa prueba y lo cubre la prueba con base.
- Cambio observable: un cuerpo mal formado recibe el error de la API, sin el `requestId` del proxy, y después de la sesión y los permisos. Antes el proxy respondía 400 sin consultar la API.

| Prueba | RED | GREEN |
| --- | --- | --- |
| `classroom-body-api-database` (nueva, owned-db): 107 cuerpos | 3 divergencias: confirmación no textual (409) y temas repetidos por mayúsculas (503, en `metadata` con `topicIds` y sin `unitIds`) | 1/1, sin filas cambiadas |
| `classroom-body-forwarding` (nueva, fast): los mismos cuerpos se reenvían intactos y el proxy entrega la respuesta de la API; método, tipo de contenido, JSON mal formado y tamaño se siguen cortando en el web | con el proxy anterior, la primera prueba falla (400 propio sin llegar a la API) | 2/2 |
| las 9 pruebas ajustadas y el resto de las que usan el proxy de aulas | — | en verde |

`npx tsc --noEmit -p apps/web/tsconfig.json`, `npm run api:build`, `npm run lint:boundaries`, `run-complete-suite --check` (764 entradas) y `npm run docs:check` pasaron.

La primera corrida de `fast` cortó en `academic-features`, que exigía que existiera `activity-generation-proxy.ts`. Se ajustó para no pedir el archivo retirado y se repitió `fast` completa.

Suites integradas del corte 8, sobre `main` `86a29fe`: `fast` 3277/3277 (segunda corrida), `owned-db` 970/970 y `wrappers` 19/19.

## Estado al pausar (2026-11-27)

- En `main`: cortes 5 (agenda, `0b1c897a`), 6 (Home), 7 (consultas de aulas, `86a29fe`) y 8 (cuerpos de autoría y de aula, TASK-008). Queda TASK-009.
- Mapa de aulas (lectura del código, sin ejecutar): consultas sin divergencias; en cuerpos, la API no rechaza como el proxy un `confirmation` no textual en `codes/confirm` (da 409) ni los temas repetidos con distinta mayúscula en la ruta sin `unitIds` (`activities/domain/topic-selection.ts`, termina en 503 por clave duplicada); en participación, `GET .../ai-summary` ignora las cabeceras `x-attempt-*` que el proxy rechaza. Esas tres se llevan a la API antes de quitar la regla del proxy. El 409 antes que el 400 en actividades iniciadas o no publicadas quedó aceptado.
- Primer paso al retomar: TASK-009 (calificación y participación). Antes de retirar reglas, llevar a la API la divergencia que queda del mapa: `GET .../ai-summary` ignora las cabeceras `x-attempt-*` que el proxy rechaza. Reutilizar el patrón del corte 8: casos compartidos, prueba con servicios reales sobre base propia y prueba de reenvío del proxy.

## Límites

- Algunas pruebas cargan los `.ts` con *strip-only*, que no admite propiedades en los parámetros del constructor; el núcleo las evita.
