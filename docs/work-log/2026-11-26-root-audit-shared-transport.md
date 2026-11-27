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

## Límites

- Algunas pruebas cargan los `.ts` con *strip-only*, que no admite propiedades en los parámetros del constructor; el núcleo las evita.
