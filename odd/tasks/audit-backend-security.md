# Feature: Seguridad de backend pendiente de la auditoría (S6, S9, S12, S17 y reenvío)

- **Spec:** #especificacion
- **Design:** #diseno
- **Approval:** approved
- **Evidence mode:** candidate-v1
- **Trace mode:** requirements-v1

El 2026-11-26 la sesión coordinadora encargó S6, S9, S12, S17 y el reenvío de verificación de la [auditoría](../../docs/work-log/2026-11-26-root-full-stack-audit.md). El usuario aprobó en esta sesión: invitaciones con 200 por día y 60 por hora por docente; sobre `v2` con id de clave derivado y `CLASSROOMS_DELIVERY_PREVIOUS_KEYS` sólo para leer; tope diario por usuario de IA igual a la décima parte del global cuando no se configura, con piso de una reserva (aprobado tras el fallo de `owned-db`); reenvío con 300 por IP, 3 por cuenta+IP y 5 por cuenta por hora. Para S12 eligió primero un servicio convertidor aparte y, al conocer su costo de aislamiento, cambió a un proceso intermediario que es el único con acceso a Docker. Commit en la rama `claude/audit-backend-security-a863ab`; el 2026-11-27 autorizó push y PR contra `main`, sin merge ni despliegue.

## Seguimiento Git

Base `main` en `a06c9214`. Rama `claude/audit-backend-security-a863ab` (worktree propio). Commit autorizado sólo en esta rama. Integrada en `main` el 2026-11-27 con la PR #31 (`7bea3829`).

## Especificacion

- **REQ-001:** (Reenvío) El reenvío de verificación cuenta por cuenta+IP (3 por hora), por cuenta (5 por hora) y por IP (300 por hora), con la espera de 60 s.
- **REQ-002:** (S17) Sin `AI_DAILY_ACTOR_BUDGET_USD`, cada usuario puede gastar por día como máximo la décima parte de `AI_DAILY_BUDGET_USD`. Con la variable, rige su valor.
- **REQ-003:** (S9) Los sobres nuevos llevan versión e id de clave. Tras rotar `CLASSROOMS_DELIVERY_KEY`, los sobres sellados con una clave listada en `CLASSROOMS_DELIVERY_PREVIOUS_KEYS` y los sobres anteriores sin versión se siguen leyendo.
- **REQ-004:** (S6) Cada docente encola como máximo 200 invitaciones cada 24 h y 60 por hora (nuevas o reenvíos, individuales o por lote). Al agotarse, 429 `RATE_LIMITED` con espera y nada encolado.
- **REQ-005:** (S12) La API no ejecuta Docker. Un intermediario en loopback con clave compartida lanza el convertidor descartable sin red, como antes, y la conversión de `.doc`/`.ppt` sigue funcionando.

## Diseno

- Reenvío: `identifierBuckets` acepta `verification-resend`; el sujeto es el id de cuenta.
- S17: `requireDailyBudget` usa `globalMaximum / 10n` sin tope explícito (`DEFAULT_ACTOR_SHARE`).
- S9: `delivery-envelope.ts` sella `v2.<id>.<base64>` con AAD `v2:<id>:<aad>`; `decryptDelivery` recibe las claves anteriores. La configuración de aulas lee hasta 3 claves anteriores; puertos, trabajador de entrega y composición las pasan.
- S6: puerto `admitInvitationDelivery` en `ClassroomPorts`, cobrado en `enqueueInvitation`. La composición integrada lo implementa con `account_action_controls` (sin migración).
- S12: `scripts/office-converter-broker.mjs` con los argumentos fijos de `docker run`; `legacy-office.ts` hace `fetch`; `FILES_OFFICE_CONVERTER_URL`/`_TOKEN` opcionales; el supervisor local inicia el intermediario.

## Tasks

### TASK-001 — Una escuela detrás de una sola IP no bloquea el reenvío de verificación
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-001
- **Verification:** apps/api/src/modules/identity/accounts/application/runtime.test.mjs y tests/p33-identity-security.test.mjs
- **Acceptance:** El reenvío pide los baldes IP (300/h), cuenta+IP (3/h) y cuenta (5/h), en ese orden y con esos valores.
- **Scope:** ["apps/api/src/modules/identity/accounts/application/runtime.ts", "apps/api/src/modules/identity/accounts/infrastructure/security/configuration.ts", "apps/api/src/modules/identity/accounts/application/runtime.test.mjs", "tests/p33-identity-security.test.mjs", "docs/engineering/identity/README.md"]
- **Evidence:** {"command": "node --test runtime.test.mjs; node --test tests/p33-identity-security.test.mjs; scripts/test-p33-verification.mjs --group=resend", "result": "RED: sin balde cuenta+IP; IP en 60; GREEN: 11/11, 16/16 y resend 8/8; run-complete-suite --group fast 3250/3250 (tras rebase sobre 490105ff), --group owned-db 962/962 (tercera corrida), wrappers: wrapper-database completo, wrapper-backend falla por plazo de arranque de 4 s tambien en la base a06c9214, los 17 restantes uno por uno con FOXMIND_TEST_TIMEOUT_SCALE=2: 117/117", "candidate": "sha256:e1c28b1955ce45443e0648e90d895644d51171f0d03fbf8926b67c4d2731a06c"}
- **Blocker:** none

### TASK-002 — Pocas cuentas no agotan el presupuesto diario de IA
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-002
- **Verification:** apps/api/src/platform/ai/daily-actor-budget.test.mjs
- **Acceptance:** Con global 0,1 USD y sin tope por usuario, un usuario con 9996 microdólares usados reserva 4 más; con 9997 recibe `AI_BUDGET_EXCEEDED`. Una reserva mayor que 1/10 se admite como primer pedido del día y se rechaza con uso previo.
- **Scope:** ["apps/api/src/platform/ai/text-budget.ts", "apps/api/src/platform/ai/configuration.ts", "apps/api/src/platform/ai/configuration-types.ts", "apps/api/src/platform/ai/daily-actor-budget.test.mjs", "apps/api/src/modules/foxy/visuals/infrastructure/tests/foxy-visual-restart-profile.test.mjs", "docs/engineering/ai/README.md", "docs/engineering/local-development/README.md"]
- **Evidence:** {"command": "node --test daily-actor-budget.test.mjs y foxy-visual-publication-journey/foxy-visual-restart-profile contra .build/api", "result": "RED: el usuario sin tope compartia el global; luego la reserva grande quedaba bloqueada (owned-db); GREEN: 4/4, 3/3 y 1/1; run-complete-suite --group fast 3250/3250 (tras rebase sobre 490105ff), --group owned-db 962/962 (tercera corrida), wrappers: wrapper-database completo, wrapper-backend falla por plazo de arranque de 4 s tambien en la base a06c9214, los 17 restantes uno por uno con FOXMIND_TEST_TIMEOUT_SCALE=2: 117/117", "candidate": "sha256:fc6c11db04e10ae12fd4a2e8c5c26174d0156086b83424b19b5e55fb13ed89b0"}
- **Blocker:** none

### TASK-003 — Rotar la clave de entrega no invalida códigos ni invitaciones
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-003
- **Verification:** apps/api/src/modules/classrooms/invitations/infrastructure/delivery-envelope.test.mjs
- **Acceptance:** Un sobre nuevo empieza con `v2.<id>`; uno sellado con la clave anterior o en formato anterior se lee tras la rotación; cambiar id, versión o registro lo invalida; la configuración rechaza claves anteriores repetidas, inválidas, iguales a las activas o más de 3.
- **Scope:** ["apps/api/src/modules/classrooms/invitations/infrastructure/delivery-envelope.ts", "apps/api/src/modules/classrooms/invitations/infrastructure/delivery.ts", "apps/api/src/modules/classrooms/invitations/application/invitation-batches.ts", "apps/api/src/modules/classrooms/catalog/application/classroom-queries.ts", "apps/api/src/modules/classrooms/access/infrastructure/configuration.ts", "apps/api/src/modules/classrooms/access/infrastructure/context.ts", "apps/api/src/modules/classrooms/access/application/runtime-ports.ts", "apps/api/src/bootstrap/academic-classrooms.module.ts", "apps/api/src/bootstrap/academic-management-composition.ts", "apps/api/src/modules/classrooms/invitations/infrastructure/delivery-envelope.test.mjs", "docs/engineering/classrooms/README.md"]
- **Evidence:** {"command": "node --test delivery-envelope.test.mjs y batch-behavior.test.ts contra .build/api", "result": "RED: deliveryKeyId ausente; GREEN: 5/5 y 4/4; run-complete-suite --group fast 3250/3250 (tras rebase sobre 490105ff), --group owned-db 962/962 (tercera corrida), wrappers: wrapper-database completo, wrapper-backend falla por plazo de arranque de 4 s tambien en la base a06c9214, los 17 restantes uno por uno con FOXMIND_TEST_TIMEOUT_SCALE=2: 117/117", "candidate": "sha256:dc005e91dd903b02e63b0f52cfd6ea51c417c6f60beb8d5ba3711196814a7295"}
- **Blocker:** none

### TASK-004 — Un docente no puede usar las invitaciones como canal de spam
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-004
- **Verification:** apps/api/src/modules/classrooms/invitations/application/invitation-quota.test.ts y tests/classroom-invitation-quota.test.mjs
- **Acceptance:** Cada invitación encolada se cobra antes de encolar; agotado el cupo, `RATE_LIMITED` con la espera y nada encolado; sin registro de cupos, `SERVICE_UNAVAILABLE`; la composición usa baldes de 200/86400 s y 60/3600 s por docente.
- **Scope:** ["apps/api/src/modules/classrooms/invitations/application/invitations-operations.ts", "apps/api/src/modules/classrooms/access/application/runtime-ports.ts", "apps/api/src/bootstrap/academic-classrooms.module.ts", "apps/api/src/modules/classrooms/invitations/application/invitation-quota.test.ts", "tests/classroom-invitation-quota.test.mjs", "docs/engineering/classrooms/README.md"]
- **Evidence:** {"command": "node --test invitation-quota.test.ts y tests/classroom-invitation-quota.test.mjs", "result": "RED: INVITATION_DELIVERY_BUDGETS ausente (no compilaba); GREEN: 4/4 y 1/1; run-complete-suite --group fast 3250/3250 (tras rebase sobre 490105ff), --group owned-db 962/962 (tercera corrida), wrappers: wrapper-database completo, wrapper-backend falla por plazo de arranque de 4 s tambien en la base a06c9214, los 17 restantes uno por uno con FOXMIND_TEST_TIMEOUT_SCALE=2: 117/117", "candidate": "sha256:26b5a854d72a52567e49a1acecc907d1f661a03c686c13075658ce9596f30769"}
- **Blocker:** none

### TASK-005 — La API convierte .doc/.ppt sin acceso a Docker
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-005
- **Verification:** tests/office-converter-broker.test.mjs, apps/api/src/modules/files/custody/infrastructure/legacy-office.test.mjs y tests/office-legacy-conversion.test.mjs (manual, Docker)
- **Acceptance:** `legacy-office.ts` no importa `child_process`; envía los bytes al intermediario con su clave y mapea 422/503; el intermediario rechaza clave, ruta, método y tamaño inválidos sin lanzar contenedores, admite 2 a la vez y usa los argumentos endurecidos; la conversión real DOC y PPT pasa con Docker.
- **Scope:** ["apps/api/src/modules/files/custody/infrastructure/legacy-office.ts", "apps/api/src/modules/files/custody/infrastructure/configuration.ts", "scripts/office-converter-broker.mjs", "scripts/local-app.mjs", "scripts/local-app-supervisor.mjs", "scripts/local-app-environment.mjs", "apps/api/src/modules/files/custody/infrastructure/legacy-office.test.mjs", "tests/office-converter-broker.test.mjs", "tests/office-legacy-conversion.test.mjs", "tests/local-app-environment.test.mjs", "docs/engineering/files/README.md", "docs/engineering/local-development/README.md"]
- **Evidence:** {"command": "node --test legacy-office.test.mjs y tests/office-converter-broker.test.mjs; FOX_TEST_LEGACY_OFFICE=1 node --test tests/office-legacy-conversion.test.mjs", "result": "RED: configureLegacyOfficeConverter y el intermediario ausentes; GREEN: 4/4, 5/5 y conversion real DOC/PPT con Docker 1/1; local:up no ejecutado; run-complete-suite --group fast 3250/3250 (tras rebase sobre 490105ff), --group owned-db 962/962 (tercera corrida), wrappers: wrapper-database completo, wrapper-backend falla por plazo de arranque de 4 s tambien en la base a06c9214, los 17 restantes uno por uno con FOXMIND_TEST_TIMEOUT_SCALE=2: 117/117", "candidate": "sha256:00d641118febfcf41c66db78171a15a341555317e69e7ce3f1210153064626b6"}
- **Blocker:** none
