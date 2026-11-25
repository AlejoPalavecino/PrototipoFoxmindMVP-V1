# Feature: Notificaciones y Perfil en dirección Expedición

- **Spec:** #especificacion
- **Design:** #diseno
- **Approval:** approved
- **Evidence mode:** candidate-v1
- **Trace mode:** requirements-v1

El 2026-11-25 el usuario pidió seguir con un PR más y eligió «Notificaciones y Perfil» como próxima migración Expedición, apilada sobre el PR de Agenda. La autorización cubre la migración visual sin cambios de comportamiento. Commit, push y PR los autorizó después (ver Seguimiento Git). No hay autorización de merge ni de despliegue.

## Especificacion

- **REQ-001:** Notificaciones adopta Expedición: banner con ilustración, estado de lectura como pestañas segmentadas en lago, filtros de tipo como chips con el elegido en lago, avisos sin leer marcados en lago con su etiqueta en sol y bandeja vacía con el zorro.
- **REQ-002:** Mi perfil y Configuración adoptan Expedición: encabezado, tarjeta de vista previa en cielo y lago, campos y acciones del lenguaje del piloto, y tarjeta de cuenta con la escena de seguridad.
- **REQ-003:** No cambia el comportamiento: datos, filtros, marcado de lectura, foco, validación del perfil, avatar y cierre de sesión siguen igual.

## Diseno

Mismos tokens y tipografía que el piloto (`--xp-*`, Nunito). Las hojas se anclan con `#foxmind-product#foxmind-product.fm3d-theme`, más la clase de cada pantalla cuando haga falta superar las hojas Brújula. Las ilustraciones ya están en el repositorio: `foxmind-3d/hero/welcome-sky`, `foxmind-3d/states/empty` y `foxmind-3d/scenes/security`.

## Seguimiento Git

Rama `claude/notifications-profile-expedition`, creada desde `d732d935` (punta de `claude/agenda-expedition`, PR 20). El 2026-11-25 el usuario autorizó commitear y abrir el PR («Sí, abrí el PR»), apilado sobre el PR 20. No hay autorización de merge ni de despliegue.

## Tasks

### TASK-001 — Notificaciones con el lenguaje Expedición
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-003
- **Verification:** tests/expedition-notifications.test.mjs; navegador con bandeja llena, filtrada y vacía, ambos roles a 1440 y 390 px
- **Scope:** ["apps/web/src/features/notifications/inbox/styles/expedition-notifications.css", "tests/expedition-notifications.test.mjs"]
- **Acceptance:** La bandeja muestra el banner, las pestañas segmentadas, los chips de tipo, los avisos sin leer en lago y el estado vacío con el zorro, sin desborde a 1440 y 390 px. Filtrar y marcar como leído funcionan igual que antes.
- **Evidence:** {"command":"node --test tests/expedition-notifications.test.mjs (RED sin la importaci\u00f3n, GREEN con ella); nt-check.mjs en navegador con ambos roles a 1440 y 390","result":"2/2 (0/2 sin la hoja); banner con la escena del cielo, lectura y tipo elegidos en lago, avisos sin leer marcados, \u00abNo le\u00eddas\u00bb 3 y \u00abActividades\u00bb 2 (docente) o 3 (estudiante), marcar uno baja de 3 a 2, \u00abMarcar todas\u00bb deja \u00abTodo le\u00eddo por ac\u00e1\u00bb y la bandeja vac\u00eda muestra el zorro; anillo de foco visible, sin desborde ni errores de p\u00e1gina","candidate":"sha256:817bc31249901528911d17fb962d0ae1a94fa2f526abdc171175228a6fcea1f3"}
- **Blocker:** none

### TASK-002 — Mi perfil y Configuración con el lenguaje Expedición
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-002, REQ-003
- **Verification:** tests/expedition-profile.test.mjs; navegador Mi perfil, selector de avatar y Configuración, ambos roles a 1440 y 390 px
- **Scope:** ["apps/web/src/features/identity/styles/expedition-account.css", "tests/expedition-profile.test.mjs"]
- **Acceptance:** Mi perfil, el selector de avatar y Configuración muestran el lenguaje Expedición sin desborde a 1440 y 390 px; guardar, descartar y cerrar sesión siguen disponibles.
- **Evidence:** {"command":"node --test tests/expedition-profile.test.mjs (RED sin la importaci\u00f3n, GREEN con ella); pf-check.mjs y capturas de Mi perfil, selector de avatar y Configuraci\u00f3n con ambos roles a 1440 y 390","result":"2/2 (0/2 sin la hoja); banner con escena de perfil o de seguridad, vista previa en cielo, campos con borde 3,25:1, avatar elegido en lago; editar habilita Guardar y Descartar, Descartar restaura y devuelve el foco, el selector ofrece 5 opciones y elegir uno marca cambios; sin desborde ni errores de p\u00e1gina","candidate":"sha256:3edd41248dac0a6fa15958d4f94c9a06d6d2ed8db861ac2c229713fc98cc45f0"}
- **Blocker:** none

### TASK-003 — Documentación, capturas y registro de suites
- **State:** DONE
- **Depends on:** TASK-001, TASK-002
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-002
- **Verification:** node scripts/check-documentation.mjs; sha256 del catálogo; run-complete-suite --check
- **Scope:** ["apps/web/src/application/shell/styles/product.css", "scripts/complete-suite-inventory.json", "scripts/complete-suite-routes.json", "scripts/ci-suites.mjs", "docs/design/README.md", "docs/design/current/README.md", "docs/design/current/catalog.json", "docs/verification/flows.md", "docs/work-log/2026-11-25-expedition-notifications-profile.md"]
- **Acceptance:** La guía de diseño, la galería y la matriz de flujos describen Notificaciones y Perfil en Expedición; el catálogo coincide en sha256 y las pruebas nuevas están clasificadas en las suites.
- **Evidence:** {"command":"node scripts/check-documentation.mjs; verificaci\u00f3n sha256 del cat\u00e1logo; run-complete-suite --check; run-complete-suite --group fast","result":"1088 enlaces sin problemas; 49 capturas coincidentes (8 renovadas y 1 nueva de Configuraci\u00f3n); 731 pruebas clasificadas; fast 3141/3141. Repetida tras registrar la autorizaci\u00f3n de commit y PR.","candidate":"sha256:c99474bb364fa4da458d4012de39cf4a0003b71e8840c4f45b12da1e2d422848"}
- **Blocker:** none
- **Reopen reason:** Registro de trabajo actualizado con la autorización de commit y PR

