# Feature: Un solo transporte HTTP propio en la API (D3)

- **Spec:** #especificacion
- **Design:** #diseno
- **Approval:** approved
- **Evidence mode:** candidate-v1
- **Trace mode:** requirements-v1

El 2026-11-28 el usuario eligió la opción A de D3 de la [auditoría](../../docs/work-log/2026-11-26-root-full-stack-audit.md): asumir el transporte HTTP propio y extraerlo a `apps/api/src/platform/http`, sin adoptar los controllers de NestJS. El mismo día autorizó commit y push a `main` corte por corte con `fast`, `owned-db` y `wrappers` en verde, y eligió hacer D3 antes que D4 ([registro](../../docs/work-log/2026-11-28-root-audit-transport-queues.md)). No concede despliegue.

## Seguimiento Git

Base `main` en `8f4d860`. Un commit por corte, si el usuario autoriza la publicación.

## Especificacion

- **REQ-001:** Ningún cliente ve un cambio en estado, código de error, cabeceras (`Retry-After`, `X-Request-Id`, `Connection: close`, `Cache-Control`, `X-Content-Type-Options`) ni forma del cuerpo. Las rarezas actuales se conservan, como el 405 y el 404 con código `INVALID_INPUT` de aulas, salvo decisión explícita del usuario.
- **REQ-002:** Un único módulo en `apps/api/src/platform/http` escribe respuestas JSON y errores, y lee cuerpos JSON acotados. Cada host le pasa su tabla de código a estado: `platform/` no importa clases de error de los módulos.
- **REQ-003:** Las capas de presentación de los módulos pueden importar `apps/api/src/platform/http/` y nada más de `platform/`. Es un cambio de la regla de límites, aprobado por el usuario el 2026-11-28, y queda explícito en `scripts/migration-boundaries.mjs`.
- **REQ-004:** Los 11 archivos que hoy escriben respuestas y los 6 lectores de cuerpo propios pasan al módulo común, o quedan documentados como excepción con su motivo (por ejemplo, la lectura binaria de archivos y estudio, que tiene su propio piso de ritmo).

## Diseno

Primero pruebas de caracterización por host, que fijan las rutas de error actuales; después la extracción por grupos de hosts, con esas pruebas sin cambios. `foxyRoute` (complejidad cercana a 100) se divide en el último corte, una vez que su host usa el transporte común.

## Tasks

### TASK-001 — Caracterizar las respuestas de error de cada host
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-001
- **Verification:** una prueba por host que fija estado, código, cabeceras y forma del cuerpo de sus rutas de error; pasa con el código actual
- **Acceptance:** Los 9 hosts tienen su caracterización; no cambia código de producción.
- **Scope:** ["tests/api-error-characterization.test.mjs","scripts/ci-suites.mjs","scripts/complete-suite-inventory.json","scripts/complete-suite-routes.json"]
- **Evidence:** {"command":"node --test tests/api-error-characterization.test.mjs; run-complete-suite fast, owned-db, wrappers con Node 24.22.3 sobre main 9173aca","result":"9/9 con el código actual en 8 hosts; identidad caracterizada por p33-identity-http (wrappers); fast 3297/3297, owned-db 972/972, wrappers 19/19","candidate":"sha256:19010b7e79a45f7748d8718495a84ac94f10fa0e034bb0e8ccb612fb331180e7 (git diff --binary HEAD -- apps tests scripts src)"}
- **Blocker:** none

### TASK-002 — Transporte común y hosts chicos (home, agenda, cupo de IA)
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** orchestrator
- **Requirements:** REQ-002, REQ-003, REQ-004
- **Verification:** pruebas del módulo común; caracterizaciones de esos hosts sin cambios; regla de límites
- **Acceptance:** `platform/http` escribe y lee por esos tres hosts; la regla deja importarlo desde presentación y nada más de `platform/`.
- **Scope:** ["apps/api/src/platform/http/json-response.ts","apps/api/src/platform/http/json-response.test.mjs","apps/api/src/modules/home/dashboard/presentation/http.ts","apps/api/src/modules/agenda/events/presentation/http.ts","apps/api/src/bootstrap/ai-quota-http.ts","scripts/migration-boundaries.mjs","tests/audit-boundaries-guard.test.mjs","scripts/ci-suites.mjs","scripts/complete-suite-inventory.json","scripts/complete-suite-routes.json","docs/engineering/architecture.md"]
- **Evidence:** {"command":"node --test json-response, api-error-characterization, audit-boundaries-guard; run-complete-suite fast, owned-db, wrappers con Node 24.22.3 sobre main a0616fe","result":"json-response 2/2; caracterización 9/9 sin cambios; regla nueva RED con la anterior y GREEN; fast 3300/3300, owned-db 972/972, wrappers 19/19. Los lectores de cuerpo quedan para los cortes que los usan","candidate":"sha256:033848e46af48cd8fd0b1c03164664fd40bd4ea6c822a7615206d936b9e2571b (git diff --binary HEAD -- apps tests scripts src)"}
- **Blocker:** none

### TASK-003 — Archivos, estudio y adjuntos sobre el transporte común
- **State:** DONE
- **Depends on:** TASK-002
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-004
- **Verification:** caracterizaciones sin cambios; pruebas de plazos de subida (F8) sin cambios
- **Acceptance:** Archivos, carpetas de estudio y adjuntos de chat usan el transporte común para JSON y errores; la lectura binaria conserva sus plazos.
- **Scope:** ["apps/api/src/modules/files/uploads/presentation/http.ts","apps/api/src/bootstrap/files-host.ts","apps/api/src/modules/study/folders/presentation/http.ts","apps/api/src/modules/study/folders/presentation/uploads/http.ts"]
- **Evidence:** {"command":"api-error-characterization, pruebas de archivos/estudio/subidas/adjuntos; run-complete-suite fast, owned-db, wrappers con Node 24.22.3 sobre main d33f0f6","result":"caracterización 9/9 sin cambios; lectores de cuerpo quedan por host como excepción documentada (límites y códigos distintos y fijados); fast 3300/3300, owned-db 972/972, wrappers 19/19","candidate":"sha256:0dedc5a75536b90e3415a64acbba0c4589503267dc7ce0a3b2e8478709972ce6 (git diff --binary HEAD -- apps tests scripts src)"}
- **Blocker:** none

### TASK-004 — Aulas e identidad sobre el transporte común
- **State:** DONE
- **Depends on:** TASK-003
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-004
- **Verification:** caracterizaciones sin cambios; `wrappers` (identidad)
- **Acceptance:** El host académico y el transporte de identidad usan el módulo común.
- **Scope:** ["apps/api/src/bootstrap/academic-http.ts", "apps/api/src/modules/identity/accounts/presentation/transport.ts"]
- **Evidence:** {"command":"api-error-characterization y pruebas de aulas e identidad; tsc p33-security y p33-mail; run-complete-suite fast, owned-db, wrappers con Node 24.22.3 sobre main 6d4bd53","result":"caracterización sin cambios; aulas conserva el reconocimiento de errores por clase; fast 3300/3300, owned-db 972/972, wrappers 19/19 (owned-db y wrappers tras un reinicio del contenedor, mismo árbol)","candidate":"sha256:7657a55c226142999350a2fa6a43db66995f2a9ad748d899b1a544b57b786c67 (git diff --binary HEAD -- apps tests scripts src)"}
- **Blocker:** none

### TASK-005 — Foxy sobre el transporte común y `foxyRoute` dividido
- **State:** DONE
- **Depends on:** TASK-004
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-004
- **Verification:** caracterización de Foxy sin cambios; complejidad de `foxyRoute` medida antes y después
- **Acceptance:** Foxy usa el módulo común y su enrutamiento queda dividido por capacidad.
- **Scope:** ["apps/api/src/modules/foxy/presentation/http.ts","apps/api/src/modules/foxy/presentation/http-routes.ts","tests/foxy-route-dispatch.test.mjs","scripts/ci-suites.mjs","scripts/complete-suite-inventory.json","scripts/complete-suite-routes.json"]
- **Evidence:** {"command":"foxy-route-dispatch (5/5 antes y después; detecta cambios hechos a propósito), api-error-characterization, pruebas de Foxy; eslint complexity; run-complete-suite fast, owned-db, wrappers con Node 24.22.3 (5a sobre d168981, 5b sobre 5f90137)","result":"5a: fast 3300/3300, owned-db 972/972, wrappers 19/19. 5b: complejidad 100 -> máximo 11; fast 3305/3305, owned-db 972/972, wrappers 19/19 (owned-db y wrappers tras un reinicio del contenedor, mismo árbol)","candidate":"sha256:86e4f0d53ae0e792318643e6d5d21c676669216d54955ed65888b79a29ca9bc4 (git diff --binary HEAD -- apps tests scripts src, corte 5b)"}
- **Blocker:** none
