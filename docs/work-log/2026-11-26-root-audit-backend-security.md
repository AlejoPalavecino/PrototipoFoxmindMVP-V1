# Seguridad de backend pendiente de la auditoría (S6, S9, S12, S17 y reenvío)

Sesión lateral de la coordinadora /root, 2026-11-26 y 27. Rama `claude/audit-backend-security-a863ab`, worktree propio, base `a06c9214`, rebasada sobre `origin/main` en `490105ff`. Encargo: S6, S9, S12, S17 y el reenvío de verificación de la [auditoría](2026-11-26-root-full-stack-audit.md). El usuario aprobó los valores y alternativas que figuran en el [tablero](../../odd/tasks/audit-backend-security.md). Autorizó commit en esta rama y, el 2026-11-27, push y PR contra `main` («dale, armá la PR cuando estén en verde»), sin merge ni auto-merge. No concede despliegue. Sin migraciones.

## Qué cambió

- **Reenvío de verificación.** Usa el mismo reparto que login y recuperación: 3 por cuenta+IP, 5 por cuenta y 300 por IP cada hora, más la espera de 60 s. Antes, 60 por IP: una escuela detrás de una sola dirección lo agotaba para todas sus cuentas pendientes. El techo por cuenta ya usaba el id de cuenta, que sólo puede gastar quien tiene sesión en ella. [Runtime](../../apps/api/src/modules/identity/accounts/application/runtime.ts) · [reglas](../../apps/api/src/modules/identity/accounts/infrastructure/security/configuration.ts).
- **S17.** Sin `AI_DAILY_ACTOR_BUDGET_USD`, cada usuario tiene la décima parte de `AI_DAILY_BUDGET_USD` (`DEFAULT_ACTOR_SHARE`). Antes compartía el tope global entero. Piso: el primer pedido del día de cada usuario se admite aunque su reserva supere esa décima parte, siempre que entre en el global. El tope de solicitudes por actor (`AI_DAILY_ACTOR_REQUESTS`) ya era obligatorio. [Presupuesto](../../apps/api/src/platform/ai/text-budget.ts).
- **S9.** Sobre `v2.<id de clave>.<datos>` con versión e id dentro de los datos autenticados; el id es un resumen corto, no secreto, de la clave. `CLASSROOMS_DELIVERY_PREVIOUS_KEYS` (hasta 3) se usa sólo para leer. Los sobres sin versión se leen con la clave actual o las anteriores. Aplica a códigos de aula, invitaciones y recibos de lote. [Sobre](../../apps/api/src/modules/classrooms/invitations/infrastructure/delivery-envelope.ts) · [configuración](../../apps/api/src/modules/classrooms/access/infrastructure/configuration.ts).
- **S6.** Cada invitación encolada (nueva o reenvío, individual o por lote) se cobra al docente: 200 cada 24 h y 60 por hora, en `account_action_controls`. Agotado el cupo, 429 `RATE_LIMITED` con `Retry-After` y nada encolado; sin registro de cupos, `SERVICE_UNAVAILABLE`. El puerto `admitInvitationDelivery` lo implementa la composición integrada. [Operaciones](../../apps/api/src/modules/classrooms/invitations/application/invitations-operations.ts) · [composición](../../apps/api/src/bootstrap/academic-classrooms.module.ts).
- **S12.** La API ya no ejecuta `docker`. Manda los bytes por HTTP en loopback, con clave compartida, al [intermediario](../../scripts/office-converter-broker.mjs). Ese proceso es el único con acceso a Docker y sólo sabe lanzar la imagen del convertidor con los argumentos endurecidos de antes: un contenedor nuevo, sin red, por archivo, hasta 2 a la vez. `FILES_OFFICE_CONVERTER_URL`/`_TOKEN` son opcionales; sin ellos DOC/PPT quedan no disponibles, como cuando faltaba Docker. `local:up` asigna `ports.office`, genera la clave y el supervisor inicia el intermediario. [Cliente](../../apps/api/src/modules/files/custody/infrastructure/legacy-office.ts).
- Guías: [identidad](../engineering/identity/README.md), [IA](../engineering/ai/README.md), [aulas](../engineering/classrooms/README.md), [archivos](../engineering/files/README.md) y [arranque local](../engineering/local-development/README.md). Las pruebas nuevas se sumaron al inventario de `fast`.

## Decisiones

S12 se aprobó primero como servicio convertidor permanente. Al implementarlo aparecieron tres costos: un servicio que recibe HTTP necesita red (en Docker Desktop una red interna no se publica al host), la imagen no trae intérprete para servir HTTP (había que reconstruirla con apt) y un archivo malicioso que comprometiera LibreOffice seguiría vivo procesando los documentos siguientes. El usuario eligió entonces el intermediario, que conserva el aislamiento por archivo.

S17 se aprobó como 1/10 del global. La primera corrida de `owned-db` falló en `foxy-visual-publication-journey`: una imagen reserva unos 0,14 USD (4096 tokens a 30 USD/M más la entrada) y el tope por usuario quedaba en 0,10 USD, así que la imagen nunca se generaba. Se comprobó la causa cambiando sólo el build (con el tope igual al global pasa 3/3; con 1/10, 2 fallos). Como con un global chico ningún usuario podría generar imágenes, el usuario aprobó un piso de una reserva.

## Comprobaciones

| Hallazgo | Prueba | RED | GREEN |
| --- | --- | --- | --- |
| Reenvío | `runtime.test.mjs`, `p33-identity-security.test.mjs` | sin balde cuenta+IP; IP en 60 | 11/11 (con S17); 16/16 |
| S17 | `daily-actor-budget.test.mjs` | el usuario sin tope compartía el global; después, la reserva grande quedaba bloqueada | 11/11 (con reenvío); piso 4/4 y `foxy-visual-publication-journey` 3/3 |
| S9 | `delivery-envelope.test.mjs` | `deliveryKeyId` no existía | 5/5 (más `batch-behavior` 4/4) |
| S6 | `invitation-quota.test.ts`, `classroom-invitation-quota.test.mjs` | `INVITATION_DELIVERY_BUDGETS` no existía (no compilaba) | 4/4 y 1/1 |
| S12 | `legacy-office.test.mjs`, `office-converter-broker.test.mjs` | `configureLegacyOfficeConverter` y el intermediario no existían | 4/4 y 5/5 |
| S12 real | `FOX_TEST_LEGACY_OFFICE=1 node --test tests/office-legacy-conversion.test.mjs` (manual) | — | 1/1: DOC y PPT convertidos por el intermediario con Docker |

`npm run api:build`: exit 0. `npm run lint:boundaries`: sin problemas. `npm run docs:check`: 0 problemas.

Las suites están en [Resultado de suites](#resultado-de-suites).

## Resultado de suites

Con `npm run test:complete -- --group <grupo>`:

- `fast`: 3245/3245 en la primera corrida; 3246/3246 tras el piso de S17; 3250/3250 tras rebasar sobre `490105ff`.
- `owned-db`: la primera corrida cortó en `foxy-visual-publication-journey` (S17 sin piso) y la segunda en `foxy-visual-restart-profile` (varias imágenes del mismo docente en un día; se fijó `dailyActorBudgetUsd` en el fixture porque esa prueba no mide el tope por usuario). La tercera, completa: 962/962.
- `wrappers`: `wrapper-database` completo. `wrapper-backend` falla en «compiled CLI starts on loopback», que espera el aviso de arranque en 4 s (8 s con `FOXMIND_TEST_TIMEOUT_SCALE=2`). Sin error en stderr. Con plazo de 60 s, la base `a06c9214` arrancó en 7,5 y 6,4 s y la rama en 10,2 y 7,6 s, con otras sesiones corriendo suites a la vez. Las dos superan el plazo bajo esa carga, y con cuatro muestras no se puede afirmar ni descartar que la rama sea más lenta. Como el grupo corta en el primer fallo, los 17 `wrappers` restantes se corrieron uno por uno con `FOXMIND_TEST_TIMEOUT_SCALE=2`: todos pasaron (117 pruebas), incluido `p33-verification-resend` 8/8 y `p33-identity-http` 23/23.
- 2026-11-27, tras mergear `origin/main` con #29 y #32 (S7: el digest de códigos convive con las claves anteriores de entrega, que tampoco pueden repetirlo): `fast` 3257/3257 y `owned-db` 969/969.
- Tras el rebase no se repitieron `owned-db` ni `wrappers`: `main` sólo agregó cambios de `apps/web`, pruebas de ese transporte, documentación y una constante nueva (`FILE_MAX_BYTES`) que la API no usa en lo que cambia esta rama.

## Integración

La PR #31 se mergeó en `main` el 2026-11-27 (`7bea3829`), con el CI en verde sobre la cabeza exacta de la PR; ver el [tren de merges](2026-11-26-root-audit-shared-transport.md#tren-de-merges-2026-11-27). Antes de mergear, el cupo de invitaciones pasó de `IdentityRuntime.store` a `admitBuckets` (`ddcc667`) para compilar con la admisión única de D2. No implica despliegue.

## Límites

- Los RED de S6, S9 y S12 fueron la ausencia de la funcionalidad (no compilaba o faltaba la exportación), no una corrida del comportamiento anterior.
- El cupo de S6 se cobra en su propia transacción: si la invitación falla después, el intento queda contado. El rol docente sigue eligiéndose al registrarse; el cupo limita el volumen, no quién invita.
- Los valores (200/60 invitaciones, 1/10 del presupuesto de IA, 300 por IP) no se midieron con uso real.
- No se pudo verificar el valor configurado de `AI_DAILY_ACTOR_BUDGET_USD` en el `.env` local: no se lee por política.
- El intermediario sigue teniendo acceso a Docker (equivalente a root del host); se redujo la superficie, no se eliminó. En un despliegue habría que darle ese acceso sólo a él.
- `wrapper-backend` no pasó en esta máquina (ver arriba); queda para el CI, que no escala plazos.
- No se ejecutó `local:up` en esta sesión: el arranque del intermediario desde el supervisor no se probó de punta a punta.
- Al rotar la clave de entrega, los códigos de aula viejos siguen sellados con la clave anterior hasta que se regeneran.

## Primer paso pendiente

Probar `npm run local:up` con un `.doc` real y, si se integra, quitar la clave anterior de `CLASSROOMS_DELIVERY_PREVIOUS_KEYS` sólo después de regenerar los códigos de aula.
