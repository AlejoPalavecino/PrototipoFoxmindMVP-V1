# Feature: Un solo transporte para los proxies web y una sola admisión en la API (F1, F2, D2)

- **Spec:** #especificacion
- **Design:** #diseno
- **Approval:** approved
- **Evidence mode:** candidate-v1
- **Trace mode:** requirements-v1

El 2026-11-26 el usuario eligió remediar F1/D2 de la [auditoría](../../docs/work-log/2026-11-26-root-full-stack-audit.md) y decidió: las reglas de dominio viven sólo en la API (F2), y una regla del proxy se quita sólo después de comprobar que la API rechaza lo mismo; sólo el proxy de identidad reenvía todas las cookies, y el resto reenvía únicamente el borrado exacto de la sesión; se unifica la forma de los errores sin renombrar los códigos; y cada corte se integra con commit y push a `main` cuando `fast`, `owned-db` y `wrappers` están en verde. No concede despliegue.

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
- **Evidence:** {"command":"web-proxy-transport, agenda-proxy, foxmind-3d-http, home-order, monthly-ai-quota-transport; run-complete-suite fast, owned-db, wrappers sobre el estado del corte 2","result":"web-proxy-transport 4/4, agenda 2/2, home 3/3, home-order 4/4; fast 3228/3228, owned-db 962/962, wrappers 19/19","candidate":"sha256:a035853fe81f324e42561769531d7cda91440b0d733c2c06ca92222f0ae5b99f"}
- **Blocker:** none
- **Reopen reason:** El corte 2 cambió el núcleo compartido (orden de rechazo y modo responder-y-cerrar) y su prueba; se repitieron las suites completas

### TASK-002 — Identidad, archivos, estudio y Foxy sobre el núcleo
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
- **Verification:** pruebas existentes de esos proxies más los casos nuevos de cookies y límites
- **Acceptance:** Los cuatro proxies usan el núcleo; archivos deja de reenviar cookies arbitrarias y su binario pasa a una lista de tipos permitidos; los 50 MB salen de una constante compartida.
- **Scope:** ["apps/web/src/application/server/identity-proxy.ts", "apps/web/src/application/server/file-proxy.ts", "apps/web/src/application/server/study-proxy.ts", "apps/web/src/application/server/foxy-proxy.ts", "apps/web/src/application/server/transport/api-transport.ts", "src/core/domain/documents/document-formats.ts", "tests/web-proxy-transport.test.mjs", "tests/p4-web-proxy.test.mjs", "docs/engineering/frontend/README.md"]
- **Evidence:** {"command":"pruebas de identidad, archivos, estudio y Foxy; web-proxy-transport; run-complete-suite fast, owned-db, wrappers","result":"RED: archivos reenviaba text/html (verificado contra el proxy anterior); GREEN: web-proxy-transport 4/4, p4 7/7, p3 11/11, foxy 17/17, rejection-lifecycle 14/14, study streaming 3/3; fast 3228/3228, owned-db 962/962, wrappers 19/19","candidate":"sha256:56b160fd266c03542845d7abbe6093a9b9891ee4a03aea12b125738c2aeb8676"}
- **Blocker:** none

### TASK-003 — Aulas sobre el núcleo
- **State:** DONE
- **Depends on:** TASK-002
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-003
- **Verification:** las 25 pruebas que usan el proxy de aulas y las suites completas
- **Acceptance:** El proxy de aulas usa destino, error, rechazo y cookies del núcleo; deja de reenviar cookies que no sean el borrado de sesión; sus reglas de dominio siguen sin cambios hasta TASK-005.
- **Scope:** ["apps/web/src/application/server/classroom-proxy.ts", "tests/p5-web-proxy.test.mjs"]
- **Evidence:** {"command":"las 25 pruebas que usan el proxy de aulas; run-complete-suite fast, owned-db, wrappers","result":"RED: p5-web-proxy con la nueva asercion de cookie falla contra el proxy anterior, que reenviaba la cookie rotada; GREEN: 25 archivos en verde (p5-web-proxy 9/9); fast 3228/3228, owned-db 962/962, wrappers 19/19","candidate":"sha256:f2f51c0a26dfcce264c6e73066c29dc60605d0d506363e2aefc4048fae10533b"}
- **Blocker:** none

### TASK-004 — Una sola admisión en los hosts de la API
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-007
- **Verification:** pruebas de hosts y wrappers de identidad
- **Acceptance:** Los nueve hosts usan `admitRequest`; todo 429 lleva `Retry-After`; el origen y el CSRF se exigen en todos los métodos de escritura; ningún archivo fuera de identidad lee `IdentityRuntime.store`.
- **Scope:** ["apps/api/src/bootstrap/http-admission.ts", "apps/api/src/bootstrap/home-host.ts", "apps/api/src/bootstrap/agenda-transport.ts", "apps/api/src/bootstrap/foxy-host.ts", "apps/api/src/bootstrap/ai-quota-transport.ts", "apps/api/src/bootstrap/study-transport.ts", "apps/api/src/bootstrap/study-runtime.ts", "apps/api/src/bootstrap/files-host.ts", "apps/api/src/bootstrap/academic-host.ts", "apps/api/src/modules/identity/accounts/application/runtime.ts", "apps/api/src/modules/identity/accounts/presentation/transport.ts", "tests/http-admission.test.mjs", "tests/p4-host.test.mjs", "tests/p5-host.test.mjs", "tests/agenda-client-http.test.mjs", "tests/study-runtime.test.mjs", "tests/p5-codes-invitation-batches.test.mjs", "apps/api/src/modules/foxy/turns/infrastructure/tests/foxy-management-host.test.mjs", "scripts/ci-suites.mjs", "scripts/complete-suite-inventory.json", "scripts/complete-suite-routes.json", "apps/api/src/modules/foxy/conversations/infrastructure/tests/foxy-host.test.mjs", "docs/engineering/identity/README.md"]
- **Evidence:** {"command":"node --test tests/http-admission.test.mjs y pruebas de hosts; run-complete-suite fast, owned-db, wrappers sobre main 1065eff2","result":"RED: modulo http-admission ausente; GREEN: http-admission 3/3, p4-host 6/6, p5-host 8/8, foxy-host 2/2, agenda-client-http 4/4, study-runtime 8/8, p5-codes 11/11; fast 3238/3238, owned-db 969/969, wrappers 19/19","candidate":"sha256:37a8ea2c6d37bee896a2c39cc1d8c536e680ea54f105e629f0f928aedf7500f3"}
- **Blocker:** none

### TASK-005 — Reglas de dominio sólo en la API (F2)
- **State:** PLANNED
- **Depends on:** TASK-003
- **Owner:** orchestrator
- **Requirements:** REQ-006
- **Verification:** por cada regla retirada de un proxy, una prueba de que la API la rechaza con el mismo código
- **Acceptance:** Los proxies de aulas, agenda, home, archivos y Foxy conservan rutas, métodos, tamaño y tipo de contenido, y no validan reglas de dominio que la API ya valida. Se hace en subcortes por dominio.
- **Scope:** ["apps/web/src/application/server/classroom-proxy.ts"]
- **Evidence:** none
- **Blocker:** none
