# Feature: Cupos que un usuario no puede agotar para todos (S2–S5)

- **Spec:** #especificacion
- **Design:** #diseno
- **Approval:** approved
- **Evidence mode:** candidate-v1
- **Trace mode:** requirements-v1

El 2026-11-26 el usuario eligió remediar S2–S5 de la [auditoría](../../docs/work-log/2026-11-26-root-full-stack-audit.md) y aprobó estas decisiones: la API no arranca sin `FOXMIND_PROXY_CLIENT_KEY` fuera de desarrollo local; transferencias con 2 por cuenta y 8 en total, y corte por 5 s sin datos; login y recuperación por correo+IP con techo por correo y cupo por IP de 300; códigos de aula con cupo por alumno y tope global sólo para los de 6 dígitos. Después autorizó commit y push a `main` si las suites pasaban. No concede despliegue.

## Seguimiento Git

Base `main` en `4b73223a`. Commit directo en `main` y push, autorizados.

## Especificacion

- **REQ-001:** (S2) Con `AUTH_LOCAL_HTTP` distinto de `true`, la API no arranca si falta `FOXMIND_PROXY_CLIENT_KEY`.
- **REQ-002:** (S3) Las transferencias de bytes (subida y descarga) de biblioteca, adjuntos de chat y carpetas de estudio comparten un cupo de 8 simultáneas, con un máximo de 2 por cuenta. Un cuerpo que pasa 5 s sin enviar datos se corta. Las consultas que no transfieren bytes no ocupan ese cupo.
- **REQ-003:** (S4) Los intentos de login y los pedidos de recuperación se limitan por correo+IP (10 y 3 cada 15 min) y por correo (100 y 10 cada 15 min). El cupo de login por IP es de 300 cada 15 min. Un login exitoso libera los cupos de ese correo.
- **REQ-004:** (S5) Cada alumno tiene 20 códigos de aula fallidos cada 10 min. El tope global de 300 fallos cada 10 min se cuenta y aplica sólo a códigos de 6 dígitos.

## Diseno

- S2: validación en `readIdentityConfiguration`.
- S3: `createTransferGate({ total, perOwner })` en `apps/api/src/platform/http/`, una instancia compartida creada en la composición y pasada a los tres transportes. Cada transporte obtiene la cuenta autenticada antes de leer el cuerpo. Las lecturas de cuerpo cortan por inactividad además de por tiempo total. El tope de pedidos simultáneos de adjuntos y de carpetas pasa de 4 a 16, como los demás transportes.
- S4: campo nuevo `identifierPerIp` en las reglas `login` y `recovery-request` (namespace `identifier-ip`); `identifier` queda como techo por correo con los valores nuevos. Las sobrescrituras por `AUTH_RATE_LIMITS_JSON` aceptan el campo nuevo.
- S5: un balde por alumno en `account_action_controls`.

## Tasks

### TASK-001 — La API exige la clave del proxy fuera de desarrollo local
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-001
- **Verification:** tests/p33-identity-security.test.mjs
- **Acceptance:** Sin la clave y con `AUTH_LOCAL_HTTP` ausente o `false`, la configuración falla con `IDENTITY_CONFIG_INVALID`; con `AUTH_LOCAL_HTTP=true` sigue arrancando sin clave.
- **Scope:** ["apps/api/src/modules/identity/accounts/infrastructure/security/configuration.ts", "tests/p33-identity-security.test.mjs", "tests/p33-identity-http.test.mjs", "docs/engineering/identity/README.md"]
- **Evidence:** {"command":"node --test tests/p33-identity-security.test.mjs; node scripts/test-p33-identity-http.mjs","result":"RED: configuracion sin clave aceptada; GREEN: 15/15 y HTTP 23/23 (arranque sin clave falla en produccion); run-complete-suite --group fast 3222/3222, --group owned-db 960/960 (segunda corrida, tras reescribir p5-codes al contrato aprobado), --group wrappers 19/19 completos","candidate":"sha256:541cda3401b8d78d9fd11396135c064ab9cc00f3acf60cd577b3af04d9e64f92"}
- **Blocker:** none

### TASK-002 — Una cuenta no acapara las transferencias de archivos
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-002
- **Verification:** apps/api/src/modules/files/uploads/application/receive-http.test.mjs y apps/api/src/modules/study/folders/presentation/uploads/upload-ordering.test.mjs
- **Acceptance:** Con 2 transferencias activas de una cuenta, una tercera de esa cuenta recibe 503 y otra cuenta transfiere; con 8 activas, la novena recibe 503; al terminar o fallar se libera el lugar; un cuerpo sin datos por 5 s se corta.
- **Scope:** ["apps/api/src/platform/http/transfer-gate.ts", "apps/api/src/modules/files/uploads/presentation/http.ts", "apps/api/src/bootstrap/files-host.ts", "apps/api/src/bootstrap/chat-attachment-transport.ts", "apps/api/src/modules/study/folders/presentation/uploads/http.ts", "apps/api/src/modules/study/folders/presentation/reminders/http.ts", "apps/api/src/bootstrap/study-runtime.ts", "apps/api/src/bootstrap/application.ts", "apps/api/src/modules/files/uploads/application/receive-http.test.mjs", "apps/api/src/modules/study/folders/presentation/uploads/upload-ordering.test.mjs", "tests/study-runtime.test.mjs", "docs/engineering/files/README.md"]
- **Evidence:** {"command":"node --test receive-http.test.mjs y upload-ordering.test.mjs contra .build/api","result":"RED: modulo transfer-gate ausente (sin corrida del transporte anterior); GREEN: 6/6 y 5/5; run-complete-suite --group fast 3222/3222, --group owned-db 960/960 (segunda corrida, tras reescribir p5-codes al contrato aprobado), --group wrappers 19/19 completos","candidate":"sha256:a65951b99f2e21948fe14201a0eeb8ff02ec3d5a00652568d1cd1f70c8fbc57e"}
- **Blocker:** none

### TASK-003 — Nadie bloquea el login ni la recuperación de otra persona
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** orchestrator
- **Requirements:** REQ-003
- **Verification:** apps/api/src/modules/identity/accounts/application/runtime.test.mjs y tests/p33-identity-http.test.mjs
- **Acceptance:** 10 logins fallidos con un correo desde la IP A no impiden entrar con ese correo desde la IP B; el techo por correo bloquea a partir de 100 intentos cada 15 min; 35 logins desde una misma IP con correos distintos se admiten.
- **Scope:** ["apps/api/src/modules/identity/accounts/application/runtime.ts", "apps/api/src/modules/identity/accounts/application/ports.ts", "apps/api/src/modules/identity/accounts/infrastructure/persistence.ts", "apps/api/src/modules/identity/accounts/infrastructure/store-adapter.ts", "apps/api/src/modules/identity/accounts/application/runtime.test.mjs", "tests/p33-recovery.test.mjs"]
- **Evidence:** {"command":"node --test runtime.test.mjs; node scripts/test-p33-identity-http.mjs","result":"RED: sin balde correo+IP ni liberacion por IP; GREEN: 7/7 y HTTP 23/23 con direcciones firmadas; run-complete-suite --group fast 3222/3222, --group owned-db 960/960 (segunda corrida, tras reescribir p5-codes al contrato aprobado), --group wrappers 19/19 completos","candidate":"sha256:0ca9942d62fc02324fd127d1e06e0ac248a08ba7a1ed469a4e576a20cd1fa53e"}
- **Blocker:** none

### TASK-004 — Los códigos de aula fallidos no bloquean a todos
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-004
- **Verification:** apps/api/src/modules/classrooms/memberships/application/membership-behavior.test.ts y tests/p5-codes-invitation-batches.test.mjs
- **Acceptance:** Un alumno con 20 fallos recibe `RATE_LIMITED` y otro alumno sigue consultando; 300 fallos con códigos de 8 caracteres no bloquean a nadie más; 300 fallos con códigos de 6 dígitos bloquean los códigos de 6 dígitos, no los de 8.
- **Scope:** ["apps/api/src/modules/classrooms/memberships/application/membership-code-operations.ts", "apps/api/src/modules/classrooms/memberships/application/membership-code-operations-repository.ts", "apps/api/src/modules/classrooms/memberships/infrastructure/membership-code-operations-repository.ts", "apps/api/src/modules/classrooms/memberships/application/membership-behavior.test.ts", "tests/p5-codes-invitation-batches.test.mjs", "docs/engineering/classrooms/README.md"]
- **Evidence:** {"command":"node --test membership-behavior.test.ts; node --test tests/p5-codes-invitation-batches.test.mjs","result":"RED: interfaz por alumno ausente; GREEN: 4/4 y 11/11 en Postgres; run-complete-suite --group fast 3222/3222, --group owned-db 960/960 (segunda corrida, tras reescribir p5-codes al contrato aprobado), --group wrappers 19/19 completos","candidate":"sha256:c24fff5ad76b8b3cf0fd53449c1b9f1b15a2e96f534a5691aa331dcf73a6af54"}
- **Blocker:** none
