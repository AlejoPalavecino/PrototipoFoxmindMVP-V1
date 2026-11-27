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
- **Evidence:** {"command":"node --test tests/web-proxy-transport.test.mjs y pruebas de home, agenda y cupo de IA; run-complete-suite fast, owned-db, wrappers","result":"RED: error sin requestId y Set-Cookie arbitrario reenviado; GREEN: 3/3; fast 3227/3227 (segunda corrida tras ajustar home-order), owned-db 962/962, wrappers 19/19","candidate":"sha256:f210b852bfe37f9865e6724c9828bc69ee46d082535ed2bd264ad29ad8a41f19"}
- **Blocker:** none

### TASK-002 — Identidad, archivos, estudio y Foxy sobre el núcleo
- **State:** PLANNED
- **Depends on:** TASK-001
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
- **Verification:** pruebas existentes de esos proxies más los casos nuevos de cookies y límites
- **Acceptance:** Los cuatro proxies usan el núcleo; archivos deja de reenviar cookies arbitrarias y su binario pasa a una lista de tipos permitidos; los 50 MB salen de una constante compartida.
- **Scope:** ["apps/web/src/application/server/identity-proxy.ts", "apps/web/src/application/server/file-proxy.ts", "apps/web/src/application/server/study-proxy.ts", "apps/web/src/application/server/foxy-proxy.ts"]
- **Evidence:** none
- **Blocker:** none

### TASK-003 — Aulas sobre el núcleo y reglas de dominio sólo en la API
- **State:** PLANNED
- **Depends on:** TASK-002
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-006
- **Verification:** pruebas de aulas y, por cada regla retirada del proxy, una prueba de que la API la rechaza
- **Acceptance:** El proxy de aulas usa el núcleo y no valida reglas de dominio que la API ya valida.
- **Scope:** ["apps/web/src/application/server/classroom-proxy.ts"]
- **Evidence:** none
- **Blocker:** none

### TASK-004 — Una sola admisión en los hosts de la API
- **State:** PLANNED
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-007
- **Verification:** pruebas de hosts y wrappers de identidad
- **Acceptance:** Los nueve hosts usan `admitRequest`; todo 429 lleva `Retry-After`; el origen y el CSRF se exigen en todos los métodos de escritura; ningún archivo fuera de identidad lee `IdentityRuntime.store`.
- **Scope:** ["apps/api/src/bootstrap/http-admission.ts"]
- **Evidence:** none
- **Blocker:** none
