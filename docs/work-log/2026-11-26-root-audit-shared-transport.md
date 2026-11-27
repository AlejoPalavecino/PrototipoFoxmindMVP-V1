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

## Límites

- Algunas pruebas cargan los `.ts` con *strip-only*, que no admite propiedades en los parámetros del constructor; el núcleo las evita.
