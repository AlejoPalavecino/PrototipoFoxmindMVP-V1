# Feature: Arreglos acotados de la auditoría del 2026-11-26

- **Spec:** #especificacion
- **Design:** #diseno
- **Approval:** approved
- **Evidence mode:** candidate-v1
- **Trace mode:** requirements-v1

El 2026-11-26 el usuario eligió remediar el bloque «arreglos acotados» de la [auditoría](../../docs/work-log/2026-11-26-root-full-stack-audit.md) (B1, B2, S10, S11, D13, F10) y autorizó commit y push a `main` cuando el corte esté verificado. No autoriza despliegue, cambios de producto fuera de estos hallazgos ni acceso a datos retenidos.

## Seguimiento Git

Base `main` en `b34949b9`. Commit directo en `main` y push, según la autorización vigente.

## Especificacion

- **REQ-001:** (B1) La subida de un adjunto de Foxy o Mi estudio no mantiene abierta una transacción ni bloqueos de `users` mientras escribe en el almacenamiento de objetos. Si el adjunto fue revocado o reclamado por la limpieza durante la escritura, el objeto escrito se borra y la subida responde `CONFLICT`.
- **REQ-002:** (B2) Una conexión que queda ociosa dentro de una transacción la cierra la base después de un tope, de modo que un proceso trabado no retiene bloqueos ni conexiones indefinidamente.
- **REQ-003:** (S10) Consultar los recordatorios de repaso sin sesión no escribe en la base. Con sesión, la actualización previa a la lectura sólo toca las filas de ese estudiante.
- **REQ-004:** (S11) Nombre y apellido rechazan caracteres de control y de control bidireccional, al registrarse y al editar el perfil.
- **REQ-005:** (D13) La regla de límites de módulos no conserva rutas inexistentes; la regla de herencia se aplica a los módulos vigentes.
- **REQ-006:** (F10) Se retiran los archivos de producción sin ningún consumidor.

## Diseno

- B1: la escritura al almacenamiento sale de la transacción final. Después de escribir, una transacción corta bloquea la fila, revalida estado y marca READY. Si la fila quedó revocada (sin reclamo), la limpieza ya la considera elegible y borra el objeto; si fue reclamada o limpiada, la subida borra el objeto que escribió, porque la limpieza pudo haber borrado antes de la escritura.
- B2: `idle_in_transaction_session_timeout` en el pool, por encima del mayor tope de transacción del código (15 s). `lock_timeout` no se agrega: `statement_timeout` de 1 s ya acota cada espera de bloqueo. El tamaño del pool queda como medición pendiente.
- S10: `list()` deja de llamar al barrido global; ejecuta las mismas dos actualizaciones filtradas por dueño dentro de la transacción autenticada. El temporizador de 30 s mantiene el barrido global.
- S11: se rechazan `\p{Cc}` y U+061C, U+200E, U+200F, U+202A–U+202E, U+2066–U+2069.
- D13 y F10: limpieza sin cambio de comportamiento.

## Tasks

### TASK-001 — Subir un adjunto sin retener la transacción durante la escritura al almacenamiento
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-001
- **Verification:** apps/api/src/modules/files/custody/infrastructure/tests/chat-attachment-custody.test.mjs
- **Acceptance:** Durante `storage.put` no hay transacción abierta del servicio (falla contra el código anterior); una revocación con limpieza concurrente a la escritura deja el objeto borrado y la subida en `CONFLICT`; las pruebas existentes de custodia y traslado siguen verdes.
- **Scope:** ["apps/api/src/modules/files/custody/infrastructure/chat-attachment-service.ts", "apps/api/src/modules/files/custody/infrastructure/tests/chat-attachment-custody.test.mjs", "docs/engineering/files/README.md"]
- **Evidence:** {"command":"node --test chat-attachment-custody.test.mjs y chat-attachment-transfer.test.mjs contra .build/api","result":"RED: escritura con 1 transaccion abierta; GREEN: custodia 2/2, traslado 8/8; run-complete-suite --group fast 3215/3215, --group owned-db 960/960, --group wrappers 19/19 completos","candidate":"sha256:760d3229d3518dbf240402300eb392364cb989903cc7c4affe80960f55720493"}
- **Blocker:** none

### TASK-002 — Cortar conexiones ociosas dentro de una transacción
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-002
- **Verification:** tests/ai-execution-policy-database.test.mjs
- **Acceptance:** El adaptador se construye con `idle_in_transaction_session_timeout` mayor que 15 s y conserva los demás valores.
- **Scope:** ["apps/api/src/platform/database/prisma.service.ts", "tests/ai-execution-policy-database.test.mjs"]
- **Evidence:** {"command":"node --test tests/ai-execution-policy-database.test.mjs","result":"RED: idle_in_transaction_session_timeout=0; GREEN: 14/14 (20s y statement 1s); run-complete-suite --group fast 3215/3215, --group owned-db 960/960, --group wrappers 19/19 completos","candidate":"sha256:dad21bdd3882aa22387be75e6770c7a71d6d514d44cfd85dd85c02bb183c613d"}
- **Blocker:** none

### TASK-003 — Consultar recordatorios sin escribir antes de autenticar
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-003
- **Verification:** apps/api/src/modules/study/folders/infrastructure/tests/integrations.test.mjs
- **Acceptance:** Un `list` sin sesión no ejecuta ninguna actualización; con sesión, las actualizaciones previas filtran por el dueño autenticado.
- **Scope:** ["apps/api/src/modules/study/reviews/infrastructure/runtime.ts", "apps/api/src/modules/study/folders/infrastructure/tests/integrations.test.mjs", "docs/engineering/study/README.md"]
- **Evidence:** {"command":"node --test folders/infrastructure/tests/integrations.test.mjs","result":"RED: list anonimo escribio; GREEN: 5/5 incluido flujo real de recordatorios; run-complete-suite --group fast 3215/3215, --group owned-db 960/960, --group wrappers 19/19 completos","candidate":"sha256:91c826f2ef3c6ec27102f6ad81343d07995716054274ed9f937d5c5a7accb823"}
- **Blocker:** none

### TASK-004 — Rechazar caracteres de control en nombres
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-004
- **Verification:** tests/p33-identity-security.test.mjs
- **Acceptance:** Nombres con U+0000–U+001F, U+007F–U+009F o controles bidireccionales devuelven `VALIDATION_ERROR`; nombres con tildes, ñ, apóstrofos y espacios siguen aceptados.
- **Scope:** ["apps/api/src/modules/identity/domain/security/inputs.ts", "tests/p33-identity-security.test.mjs", "docs/engineering/identity/README.md", "docs/foxmind-v1-functional-spec.md"]
- **Evidence:** {"command":"tsc -p apps/api/tsconfig.p33-security.json; node --test tests/p33-identity-security.test.mjs","result":"RED: controles aceptados; GREEN: 14/14; run-complete-suite --group fast 3215/3215, --group owned-db 960/960, --group wrappers 19/19 completos","candidate":"sha256:e714e19a2e895afe6d827f1592b38f63b1cb24fe64f903deb8cbc05dd8b573e1"}
- **Blocker:** none

### TASK-005 — Quitar rutas inexistentes de la regla de límites
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-005
- **Verification:** tests/audit-boundaries-guard.test.mjs y `npm run lint:boundaries`
- **Acceptance:** La regla no menciona `apps/api/src/{files,mail,classrooms,foxy-ai}/public`, `apps/classrooms-ui` ni `apps/agenda-ui`; la herencia de capacidades se detecta en `apps/api/src/modules/classrooms/`; el árbol actual sigue sin hallazgos.
- **Scope:** ["scripts/check-boundaries.mjs", "tests/audit-boundaries-guard.test.mjs"]
- **Evidence:** {"command":"node --test tests/audit-boundaries-guard.test.mjs; npm run lint:boundaries","result":"RED: herencia no detectada en modules/classrooms; GREEN: 27/27, 0 hallazgos en el arbol; run-complete-suite --group fast 3215/3215, --group owned-db 960/960, --group wrappers 19/19 completos","candidate":"sha256:f4df61e7350144b9bbabdab85b20b171325a792ea1e9c444d1564ccb23173643"}
- **Blocker:** none

### TASK-006 — Retirar archivos de producción sin consumidores
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-006
- **Verification:** búsqueda de importadores, tsc y build web
- **Acceptance:** Se retiran los archivos sin importadores; la compilación y las pruebas que los rodean siguen verdes.
- **Scope:** ["apps/shared-ui/index.ts", "apps/web/src/features/identity/index.ts", "apps/web/src/features/files/api.ts"]
- **Retired:** apps/web/src/features/files/index.ts, apps/web/src/features/identity/controls/account-artwork.tsx, apps/shared-ui/BrujulaIcon.tsx (las superficies del Scope quedan sin referencias a ellos)
- **Evidence:** {"command":"busqueda de importadores de los archivos retirados; tsc --noEmit -p apps/web/tsconfig.json; npm run web:build; run-complete-suite --group fast, owned-db y wrappers","result":"sin importadores; tsc y build web exit 0; fast 3215/3215, owned-db 960/960, wrappers 19/19 completos","candidate":"sha256:278a10f2eee5389808db7aa2b2a3a54d414575915841209a29bb9de30666c5dd"}
- **Blocker:** none
