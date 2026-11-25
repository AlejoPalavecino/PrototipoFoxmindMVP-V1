# Feature: Agenda en dirección Expedición

- **Spec:** #especificacion
- **Design:** #diseno
- **Approval:** approved
- **Evidence mode:** candidate-v1
- **Trace mode:** requirements-v1

El 2026-11-24 el usuario pidió seguir la migración Expedición con Agenda («Mientras tanto, seguí con la migración de Agenda»), sobre el lenguaje aprobado en el piloto y en Mis aulas. La autorización cubre la migración visual sin cambios de comportamiento. Commit, push y PR los autorizó después (ver Seguimiento Git). No hay autorización de despliegue.

## Especificacion

- **REQ-001:** Agenda adopta Expedición: banner con ilustración y acción Crear evento, vistas Mes, Semana y Día como pestañas segmentadas, día elegido en lago con contador centrado, panel del día en cielo y opción elegida del editor en lago. Los colores de los eventos no cambian.
- **REQ-002:** Se corrigen dos defectos de presentación: el título del día ponía mayúscula en cada palabra y «Día completo» se partía letra por letra en la columna de la hora de Semana.
- **REQ-003:** No cambia el comportamiento: datos, vistas, foco, editor y permisos siguen igual.

## Diseno

Mismos tokens y tipografía que el piloto (`--xp-*`, Nunito). Las hojas de Agenda llegan a dos ids (`#agenda-main#agenda-main`), así que la hoja nueva se ancla con `#foxmind-product#foxmind-product.fm3d-theme #agenda-main#agenda-main`. El banner usa `foxmind-3d/agenda-reference/agenda-hero-1600.webp`.

## Seguimiento Git

Rama `claude/agenda-expedition`, creada desde `22b7c743` (punta de `claude/classrooms-expedition`, PR 19). El 2026-11-24 el usuario autorizó commitear y abrir el PR («Sí, commiteá la Agenda y abrí el PR»), apilado sobre el PR 19. No hay autorización de merge ni de despliegue.

## Tasks

### TASK-001 — Agenda con el lenguaje Expedición
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-002, REQ-003
- **Verification:** tests/expedition-agenda.test.mjs; navegador Mes, Semana, Día y editor a 1440 y 390 px
- **Scope:** ["apps/web/src/features/agenda/styles/expedition-agenda.css", "tests/expedition-agenda.test.mjs"]
- **Acceptance:** Las tres vistas y el editor muestran el banner, las pestañas segmentadas, el día elegido en lago con contador centrado y el panel en cielo, sin desborde a 1440 y 390 px. El título del día respeta la ortografía y «Día completo» no se corta.
- **Evidence:** {"command": "node --test tests/expedition-agenda.test.mjs; run-complete-suite --group fast; navegador Mes, Semana, Día, detalle y editor", "result": "2/2 y fast 3135 pass; banner, vistas segmentadas, día elegido en lago con contador centrado, panel en cielo, título del día con ortografía correcta, Día completo sin cortes; ambos roles a 1440 y 390 sin desborde", "candidate": "sha256:07fdc41913529369f1588b2a52dcc3ddeb6888dabb079077d5770f1c7ec397f4"}
- **Blocker:** none

### TASK-002 — Documentación, capturas y registro de suites
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** orchestrator
- **Requirements:** REQ-001
- **Verification:** node scripts/check-documentation.mjs; sha256 del catálogo; run-complete-suite --check
- **Scope:** ["apps/web/src/application/shell/styles/product.css", "scripts/complete-suite-inventory.json", "scripts/complete-suite-routes.json", "scripts/ci-suites.mjs", "docs/design/README.md", "docs/design/current/README.md", "docs/design/current/catalog.json", "docs/verification/flows.md", "docs/work-log/2026-11-24-expedition-agenda.md"]
- **Acceptance:** La guía de diseño, la galería (5 capturas de Agenda) y la matriz de flujos describen la Agenda Expedición; el catálogo coincide en sha256 y la prueba nueva está clasificada en las suites.
- **Evidence:** {"command":"node scripts/check-documentation.mjs; verificaci\u00f3n sha256 del cat\u00e1logo; run-complete-suite --check","result":"1080 enlaces sin problemas; 48 capturas coincidentes (4 de Agenda renovadas y 1 nueva); 728 pruebas clasificadas. Repetida tras registrar la autorizaci\u00f3n de commit y PR en el registro de trabajo.","candidate":"sha256:cafdbc9e1ff112d9ad072a82245004607ee45a3bce090a46e61f4cf9b3a75614"}
- **Blocker:** none
- **Reopen reason:** Registro de trabajo actualizado con la autorización de commit y PR

