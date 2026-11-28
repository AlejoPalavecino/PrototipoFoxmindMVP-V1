# Feature: Un solo transporte para los proxies web y una sola admisión en la API (F1, F2, D2)

- **Spec:** #especificacion
- **Design:** #diseno
- **Approval:** approved
- **Evidence mode:** candidate-v1
- **Trace mode:** requirements-v1

El 2026-11-26 el usuario eligió remediar F1/D2 de la [auditoría](../../docs/work-log/2026-11-26-root-full-stack-audit.md) y decidió: las reglas de dominio viven sólo en la API (F2), y una regla del proxy se quita sólo después de comprobar que la API rechaza lo mismo; sólo el proxy de identidad reenvía todas las cookies, y el resto reenvía únicamente el borrado exacto de la sesión; se unifica la forma de los errores sin renombrar los códigos; y cada corte se integra con commit y push a `main` cuando `fast`, `owned-db` y `wrappers` están en verde. No concede despliegue.

El 2026-11-27, al abrir F2, el usuario decidió: la API decide el orden (sesión y permisos antes que la forma de los datos), así que un pedido mal formado sin sesión o sin permiso pasa a recibir 401/403/404 en vez de 400; la validación de la respuesta de Home en el proxy se conserva por ahora; y cada subcorte de F2 se integra con commit y push a `main` con `fast`, `owned-db` y `wrappers` en verde. No concede despliegue.

El 2026-11-27, con el mapa de aulas, el usuario aceptó que en una actividad ya iniciada o no publicada la API responda 409 `CONFLICT` antes de validar la forma (antes el proxy daba 400). Las otras divergencias encontradas (código de inscripción no textual, temas repetidos con distinta mayúscula, cabeceras de intento en el resumen IA) se resuelven llevando a la API el rechazo del proxy, antes de quitarlo.

## Seguimiento Git

Base `main` en `a06c9214`. Un commit por corte, directo en `main`, con push.

## Especificacion

- **REQ-001:** Todos los proxies web usan un núcleo común para el destino, las cabeceras permitidas, los cuerpos acotados, el descarte de cuerpos rechazados, la copia de respuestas y los errores.
- **REQ-002:** Los errores de los proxies son `{ error: { code, requestId } }` con `Content-Type: application/json; charset=utf-8`, `X-Request-Id` y, en 503, `Retry-After`. Los códigos no cambian de nombre.
- **REQ-003:** Sólo el proxy de identidad reenvía cualquier `Set-Cookie`; los demás reenvían únicamente el borrado exacto de `foxmind_session`.
- **REQ-004:** Un cuerpo rechazado se descarta con presupuesto y plazo, y después se cierra la conexión.
- **REQ-005:** Los límites de 50 MB se expresan con la misma constante que usa la API para esa ruta.
- **REQ-006:** (F2) Las reglas de dominio (largos, formatos, rangos) se validan en la API. El proxy conserva rutas, métodos, tamaño y tipo de contenido.
- **REQ-007:** (D2) Los hosts de la API admiten cada pedido con un único `admitRequest`: cookie, autenticación, borrado de cookie inválida, dirección del cliente, cupo general, sesión requerida, verificación, rol, origen y CSRF en métodos de escritura, `Retry-After` en 429 y descarte de cuerpos rechazados. `IdentityRuntime` no expone `store`.

## Diseno

Núcleo web en `apps/web/src/application/server/transport/api-transport.ts`. Cada proxy queda como tabla de rutas y límites. En la API, `admitRequest` vive en `apps/api/src/bootstrap/`, el único lugar donde las reglas de límites dejan importar identidad. Cortes: (1) núcleo, home, agenda y cupo de IA; (2) identidad, archivos, estudio y Foxy; (3) aulas y F2; (4) `admitRequest` en los nueve hosts.

## Tasks

### TASK-001 — Núcleo web con home, agenda y cupo de IA
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-002, REQ-003, REQ-004
- **Verification:** tests/web-proxy-transport.test.mjs y las pruebas existentes de esos proxies
- **Acceptance:** Los tres proxies usan el núcleo; un `Set-Cookie` arbitrario de la API no llega al navegador por home ni por agenda; los errores tienen la forma nueva; un cuerpo rechazado en agenda se descarta con presupuesto.
- **Scope:** ["apps/web/src/application/server/transport/api-transport.ts", "apps/web/src/application/server/home-proxy.ts", "apps/web/src/application/server/agenda-proxy.ts", "apps/web/src/application/server/ai-quota-proxy.ts", "tests/web-proxy-transport.test.mjs", "tests/home-order.test.mjs", "scripts/ci-suites.mjs", "scripts/complete-suite-inventory.json", "scripts/complete-suite-routes.json", "docs/engineering/frontend/README.md"]
- **Evidence:** {"command":"run-complete-suite fast, owned-db, wrappers sobre main 0b1c897a + corte 6","result":"re-verificacion tras el corte 6 (Home): fast 3273/3273, owned-db 969/969, wrappers 19/19 sobre este arbol; home-order 4/4, web-proxy-transport 4/4, agenda-proxy 3/3","candidate":"sha256:cbe1148abaeb4993e9778771fe73ee064e480fd0852dde9b8a811f8fd0452f08"}
- **Blocker:** none
- **Reopen reason:** El corte 2 cambió el núcleo compartido (orden de rechazo y modo responder-y-cerrar) y su prueba; se repitieron las suites completas
- **Reopen reason:** F2 agenda cambió agenda-proxy.ts
- **Reopen reason:** el corte 6 cambió home-proxy y home-order

### TASK-002 — Identidad, archivos, estudio y Foxy sobre el núcleo
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
- **Verification:** pruebas existentes de esos proxies más los casos nuevos de cookies y límites
- **Acceptance:** Los cuatro proxies usan el núcleo; archivos deja de reenviar cookies arbitrarias y su binario pasa a una lista de tipos permitidos; los 50 MB salen de una constante compartida.
- **Scope:** ["apps/web/src/application/server/identity-proxy.ts", "apps/web/src/application/server/file-proxy.ts", "apps/web/src/application/server/study-proxy.ts", "apps/web/src/application/server/foxy-proxy.ts", "apps/web/src/application/server/transport/api-transport.ts", "src/core/domain/documents/document-formats.ts", "tests/web-proxy-transport.test.mjs", "tests/p4-web-proxy.test.mjs", "docs/engineering/frontend/README.md"]
- **Evidence:** {"command":"run-complete-suite fast, owned-db, wrappers sobre main 0b1c897a + corte 6","result":"re-verificacion tras el corte 6 (Home): fast 3273/3273, owned-db 969/969, wrappers 19/19 sobre este arbol","candidate":"sha256:b8998466c09604de39157856b984e035f776604763938706db10724c5c53855c"}
- **Blocker:** none
- **Reopen reason:** cambiaron archivos de su alcance tras los merges
- **Reopen reason:** el corte 6 cambió archivos de la cadena

### TASK-003 — Aulas sobre el núcleo
- **State:** DONE
- **Depends on:** TASK-002
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-003
- **Verification:** las 25 pruebas que usan el proxy de aulas y las suites completas
- **Acceptance:** El proxy de aulas usa destino, error, rechazo y cookies del núcleo; deja de reenviar cookies que no sean el borrado de sesión; sus reglas de dominio siguen sin cambios hasta TASK-005.
- **Scope:** ["apps/web/src/application/server/classroom-proxy.ts", "tests/p5-web-proxy.test.mjs"]
- **Evidence:** {"command":"run-complete-suite fast, owned-db, wrappers sobre main 0b1c897a + corte 6","result":"re-verificacion tras el corte 6 (Home): fast 3273/3273, owned-db 969/969, wrappers 19/19 sobre este arbol","candidate":"sha256:f2f51c0a26dfcce264c6e73066c29dc60605d0d506363e2aefc4048fae10533b"}
- **Blocker:** none
- **Reopen reason:** cambió el alcance de sus dependencias tras los merges
- **Reopen reason:** el corte 6 cambió archivos de la cadena

### TASK-004 — Una sola admisión en los hosts de la API
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-007
- **Verification:** pruebas de hosts y wrappers de identidad
- **Acceptance:** Los nueve hosts usan `admitRequest`; todo 429 lleva `Retry-After`; el origen y el CSRF se exigen en todos los métodos de escritura; ningún archivo fuera de identidad lee `IdentityRuntime.store`.
- **Scope:** ["apps/api/src/bootstrap/http-admission.ts", "apps/api/src/bootstrap/home-host.ts", "apps/api/src/bootstrap/agenda-transport.ts", "apps/api/src/bootstrap/foxy-host.ts", "apps/api/src/bootstrap/ai-quota-transport.ts", "apps/api/src/bootstrap/study-transport.ts", "apps/api/src/bootstrap/study-runtime.ts", "apps/api/src/bootstrap/files-host.ts", "apps/api/src/bootstrap/academic-host.ts", "apps/api/src/modules/identity/accounts/application/runtime.ts", "apps/api/src/modules/identity/accounts/presentation/transport.ts", "tests/http-admission.test.mjs", "tests/p4-host.test.mjs", "tests/p5-host.test.mjs", "tests/agenda-client-http.test.mjs", "tests/study-runtime.test.mjs", "tests/p5-codes-invitation-batches.test.mjs", "apps/api/src/modules/foxy/turns/infrastructure/tests/foxy-management-host.test.mjs", "scripts/ci-suites.mjs", "scripts/complete-suite-inventory.json", "scripts/complete-suite-routes.json", "apps/api/src/modules/foxy/conversations/infrastructure/tests/foxy-host.test.mjs", "docs/engineering/identity/README.md"]
- **Evidence:** {"command":"node --test http-admission, p4-host, p5-host, agenda-client-http, study-runtime, p5-codes-invitation-batches, foxy-host, foxy-management-host, classroom-invitation-quota; suites completas sobre main 7bea3829 + corte 5","result":"re-verificacion 2026-11-27 tras el merge de #31: 44/44 (incluye classroom-invitation-quota con admitBuckets); fast 3273/3273, owned-db 969/969, wrappers en verde","candidate":"sha256:392527b60b8c49a45d67770b3eae33a4b58728f71f1da62a02387c42571377d1"}
- **Blocker:** none
- **Reopen reason:** la PR #31 cambio archivos de su alcance

### TASK-005 — Agenda sin reglas de dominio en el proxy (F2)
- **State:** DONE
- **Depends on:** TASK-003
- **Owner:** orchestrator
- **Requirements:** REQ-006
- **Verification:** por cada regla retirada del proxy, una prueba de la API que la rechaza con el mismo código, y una prueba del proxy que ya la reenvía
- **Acceptance:** El proxy de agenda conserva rutas, métodos, tamaño, codificación y tipo de contenido, y reenvía consultas y cuerpos sin validar su forma; la API los rechaza con 400 INVALID_INPUT.
- **Scope:** ["apps/web/src/application/server/agenda-proxy.ts","apps/api/src/modules/agenda/events/presentation/http-routes.ts","tests/agenda-proxy.test.mjs","tests/agenda-http.test.mjs","docs/engineering/frontend/README.md"]
- **Evidence:** {"command":"run-complete-suite fast, owned-db, wrappers sobre main 0b1c897a + corte 6","result":"re-verificacion tras el corte 6 (Home): fast 3273/3273, owned-db 969/969, wrappers 19/19 sobre este arbol; agenda-http 4/4, agenda-proxy 3/3","candidate":"sha256:c23ea119c3949f5e6f96bc27d98d8214f338c56e35f47ae75f67ebaf42f5758d"}
- **Blocker:** none
- **Reopen reason:** el corte 6 cambió archivos de la cadena

### TASK-006 — Home sin reglas de dominio de entrada en el proxy (F2)
- **State:** DONE
- **Depends on:** TASK-005
- **Owner:** orchestrator
- **Requirements:** REQ-006
- **Verification:** por cada regla retirada del proxy, una prueba de la API que la rechaza con el mismo código, y una prueba del proxy que ya la reenvía
- **Acceptance:** El proxy de Home reenvía las consultas sin validarlas; la API las rechaza con el mismo código; la validación de la respuesta sigue en el proxy.
- **Scope:** ["apps/web/src/application/server/home-proxy.ts","tests/home-order.test.mjs"]
- **Evidence:** {"command":"node --test tests/home-order.test.mjs; run-complete-suite fast, owned-db, wrappers sobre main 0b1c897a","result":"RED: por el web, el error lo armaba el proxy (con requestId) en vez de reenviar el de la API; GREEN: home-order 4/4, foxmind-3d-http 3/3, proxy-client-address 12/12, web-proxy-transport 4/4; fast 3273/3273, owned-db 969/969, wrappers 19/19","candidate":"sha256:d1974305f6cbc21c0cac820b305c3c69d1e159e68723e22ec4de626992a3d48a"}
- **Blocker:** none

### TASK-007 — Aulas: consultas sin reglas de dominio en el proxy (F2)
- **State:** DONE
- **Depends on:** TASK-006
- **Owner:** orchestrator
- **Requirements:** REQ-006
- **Verification:** por cada regla retirada del proxy, una prueba de la API que la rechaza con el mismo código, y una prueba del proxy que ya la reenvía
- **Acceptance:** Las consultas de búsqueda, muro, notificaciones y apoyo docente se reenvían sin validar; la API las rechaza con el mismo código.
- **Scope:** ["apps/web/src/application/server/classroom-proxy.ts","tests/classroom-query-forwarding.test.mjs","tests/activity-ai-proxy.test.mjs","tests/audit-wall-proxy.test.mjs","tests/classroom-ai-proxy.test.mjs","tests/p5-web-proxy.test.mjs","tests/p7-questionnaire-proxy.test.mjs","tests/p8-corrections-proxy.test.mjs","tests/p8-grading-proxy.test.mjs","tests/p8-progress-proxy.test.mjs","tests/p8-publication-proxy.test.mjs","tests/teacher-support-transport.test.mjs","scripts/ci-suites.mjs","scripts/complete-suite-inventory.json","scripts/complete-suite-routes.json","docs/engineering/frontend/README.md"]
- **Evidence:** {"command":"node --test tests/classroom-query-forwarding.test.mjs; run-complete-suite fast, owned-db, wrappers con Node 24.22.3 sobre main 0700d8d","result":"API sin divergencia (45 consultas dan 400 INVALID_INPUT sin llegar al servicio, también con el proxy anterior); RED: por el web el error lo armaba el proxy (con requestId) y la consulta no llegaba a la API; GREEN: classroom-query-forwarding 2/2 y las 25 pruebas del proxy de aulas en verde; fast 3275/3275, owned-db 969/969, wrappers 19/19","candidate":"sha256:bd2c44e665d2d9601ae889a8ce70a1424a3afc7ea7366a927d70d1d28d281fdb (git diff --binary HEAD -- apps tests scripts)"}
- **Blocker:** none

### TASK-008 — Aulas: cuerpos de autoría y aula sin reglas de dominio en el proxy (F2)
- **State:** DONE
- **Depends on:** TASK-007
- **Owner:** orchestrator
- **Requirements:** REQ-006
- **Verification:** por cada regla retirada del proxy, una prueba de la API que la rechaza con el mismo código, y una prueba del proxy que ya la reenvía
- **Acceptance:** Borradores, ajustes, invitaciones, actividades, extracciones y generaciones se reenvían sin validar su forma; la API los rechaza con el mismo código.
- **Scope:** ["apps/web/src/application/server/classroom-proxy.ts","apps/web/src/application/server/activity-generation-proxy.ts","apps/api/src/modules/classrooms/memberships/application/membership-code-operations.ts","apps/api/src/modules/activities/domain/topic-selection.ts","tests/helpers/classroom-body-cases.mjs","tests/classroom-body-api-database.test.mjs","tests/classroom-body-forwarding.test.mjs","tests/academic-features.test.mjs","tests/activity-ai-proxy.test.mjs","tests/brujula-contract-parity-proxy.test.mjs","tests/classroom-ai-proxy.test.mjs","tests/p5-codes-invitation-batches.test.mjs","tests/p5-web-proxy.test.mjs","tests/p7-authoring-proxy.test.mjs","tests/pending-classrooms.test.mjs","tests/product-parity-activity-proxy.test.mjs","tests/teacher-support-transport.test.mjs","scripts/ci-suites.mjs","scripts/complete-suite-inventory.json","scripts/complete-suite-routes.json","docs/engineering/frontend/README.md","docs/engineering/activities/authoring.md","docs/engineering/classrooms/README.md"]
- **Evidence:** {"command":"node --test tests/classroom-body-api-database.test.mjs tests/classroom-body-forwarding.test.mjs; run-complete-suite fast, owned-db, wrappers con Node 24.22.3 sobre main 86a29fe","result":"RED: 3 de 93 cuerpos divergían en la API (confirmación no textual 409, temas repetidos por mayúsculas 503); llevados a la API; GREEN: 107 cuerpos dan 400 INVALID_INPUT sin filas cambiadas y se reenvían intactos por el proxy; fast 3277/3277 (segunda corrida), owned-db 970/970, wrappers 19/19","candidate":"sha256:31e6b3101df44d1fbf50f7ce96a5a60b30c50f62faef5d2de8823a2640a3f3d3 (git diff --binary HEAD -- apps tests scripts)"}
- **Blocker:** none

### TASK-009 — Aulas: calificación y participación sin reglas de dominio en el proxy (F2)
- **State:** PLANNED
- **Depends on:** TASK-008
- **Owner:** orchestrator
- **Requirements:** REQ-006
- **Verification:** por cada regla retirada del proxy, una prueba de la API que la rechaza con el mismo código, y una prueba del proxy que ya la reenvía
- **Acceptance:** Calificación, corrección, publicación, IA de calificación, respuestas, entrega práctica y reapertura se reenvían sin validar su forma; la API los rechaza con el mismo código. El proxy sigue reenviando las cabeceras de intento sólo en sus rutas.
- **Scope:** ["apps/web/src/application/server/classroom-proxy.ts"]
- **Evidence:** none
- **Blocker:** none
