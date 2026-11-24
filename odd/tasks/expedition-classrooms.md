# Feature: Mis aulas en dirección Expedición

- **Spec:** #especificacion
- **Design:** #diseno
- **Approval:** approved
- **Evidence mode:** candidate-v1
- **Trace mode:** requirements-v1

El 2026-11-24 el usuario aprobó la maqueta navegable `design/mis-aulas/index.html` («Me gustó, la probamos») y resolvió las decisiones abiertas. La ejecución autorizada cubre migrar Mis aulas completo y retirar el código y los contratos que queden sin uso. Se entrega en una rama nueva apilada sobre la del PR 18, con un PR propio hacia `main`. No hay autorización de despliegue.

## Especificacion

- **REQ-001:** La lista de Mis aulas (docente y estudiante) adopta Expedición: banner, pestañas con contador centrado, búsqueda, tarjetas con portada y avance del plan, borradores, invitaciones pendientes y estados vacíos. Usa sólo datos que ya devuelve la API.
- **REQ-002:** Todas las acciones y estados de borrador usan el nombre «Eliminar borrador»; desaparece «Eliminar pendiente».
- **REQ-003:** El asistente de creación usa el sendero de cuatro paradas con vista previa en vivo. El asistente y Ajustes ofrecen el catálogo completo de 7 portadas con los mismos nombres.
- **REQ-004:** El interior del aula adopta Expedición en el encabezado, las pestañas y cada sección: Plan, Muro, Biblioteca, Actividades, Progreso, Estudiantes, Historial y Ajustes para docentes, y Plan, Muro, Biblioteca, Actividades, Mi progreso y Compañeros para estudiantes.
- **REQ-005:** En Biblioteca el docente puede elegir entre subir un archivo o escribir un apunte, y el estudiante lee ese apunte desde la app.
- **REQ-006:** En Ajustes, la corrección asistida es un interruptor visible de activado y desactivado, con una explicación de que consume IA. Si el servicio no está disponible, no se puede activar y se explica por qué. El ciclo lectivo sigue siendo de sólo lectura.
- **REQ-007:** El flujo de creación de actividades conserva sus pasos (alcance, contenido y revisión) y la publicación inmediata.
- **REQ-008:** El código, las reglas de proxy, las funciones de cliente, los estilos y los contratos que la migración deje sin uso se eliminan, junto con las pruebas que sólo protegían ese código. No se tocan `docs/api/accounts-sessions.openapi.json` ni `odd/tasks/grading-ai-issue-2.md`.

## Diseno

Fuente visual: `design/mis-aulas/` (maqueta aprobada). Mismos tokens y tipografía del piloto (`--xp-*` y Nunito).

Decisiones del usuario del 2026-11-24:

- Catálogo completo de portadas.
- Apuntes escritos del docente.
- Un solo nombre: «Eliminar borrador».
- Corrección asistida configurable con un interruptor claro.
- Publicación inmediata.
- El Muro forma parte del aula.
- Ninguna métrica que no venga de la API.
- Eliminar el código sin uso.
- Ciclo lectivo de sólo lectura.
- Entrega en una rama y un PR nuevos.

Las hojas nuevas se anclan como las del piloto. Los cambios de marcado se limitan a lo que la maqueta exige.

## Seguimiento Git

Rama `claude/classrooms-expedition`, creada desde `a9554576` (la punta de `claude/auth-home-visual-design-6ba7ad`, PR 18). La respuesta del 2026-11-24 («Rama y PR nuevos») autoriza commits y un PR propio en esta rama.

## Tasks

### TASK-001 — Lista Mis aulas Expedición con «Eliminar borrador»
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-002
- **Verification:** tests/expedition-classrooms.test.mjs; navegador a 1440 y 390 px
- **Scope:** ["apps/shared-ui/parity-assets.ts", "apps/web/src/features/classrooms/collection/PendingClassroomCard.tsx", "apps/web/src/application/workflows/classroom-collection/ClassroomsApp.tsx", "apps/web/src/features/classrooms/styles/expedition-classrooms.css", "tests/pending-classrooms.test.mjs", "tests/product-parity-invitation-ui.test.mjs", "tests/classroom-workspace-shell.test.mjs", "scripts/complete-suite-inventory.json", "scripts/complete-suite-routes.json", "scripts/ci-suites.mjs", "docs/engineering/classrooms/README.md", "docs/design/classroom-teacher-redesign.md"]
- **Acceptance:** Docente y estudiante ven el banner, las pestañas con contador centrado, la búsqueda, las tarjetas con portada y «X de Y temas dados», los borradores con «Paso N de 4», las invitaciones y los estados vacíos, sin desborde a 390 px. No queda ninguna aparición de «Eliminar pendiente».
- **Evidence:** {"command": "node scripts/run-complete-suite.mjs --group fast (reverificación tras mover product.css a TASK-003 y corregir la ruta de portada en classroom-workspace-shell)", "result": "3126 pass, 0 fail; navegador docente 1440 y 390 sin desborde, estudiante 1440 con invitación", "candidate": "sha256:a6fd68985b199cc6cb732408847087154c5d4defafae3c487234f3f27b95b12b"}
- **Blocker:** none

### TASK-002 — Asistente de creación con sendero y catálogo completo
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** orchestrator
- **Requirements:** REQ-003
- **Verification:** tests/expedition-classrooms.test.mjs; navegador
- **Scope:** ["apps/web/src/application/workflows/classroom-creation/ClassroomWizard.tsx", "apps/web/src/features/classrooms/creation/ClassroomWizardCover.tsx", "apps/web/src/features/classrooms/creation/ClassroomProcessing.tsx", "apps/web/src/features/classrooms/styles/expedition-wizard.css", "tests/classroom-creation-four-steps.test.mjs"]
- **Acceptance:** El asistente muestra las cuatro paradas con el estado de guardado y la vista previa, y ofrece las 7 portadas con los nombres del catálogo. El procesamiento con Foxy y la revisión conservan su comportamiento.
- **Evidence:** {"command": "node scripts/run-complete-suite.mjs --group fast; node --test tests/classroom-creation-four-steps.test.mjs tests/expedition-classrooms.test.mjs; tsc", "result": "fast 3126 pass, 0 fail; asistente 15/15; navegador 1440 y 390: 7 portadas con nombres del catálogo, vista previa en vivo en el riel, paso 2 alcanzado, sin desborde; tilde de la portada sin desplazar el nombre", "candidate": "sha256:3f495af9296f58dd1b17529186cf78e907b0e43bad70b62d2b5ad6babf1486a2"}
- **Blocker:** none

### TASK-003 — Encabezado, pestañas, Plan y Muro
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** orchestrator
- **Requirements:** REQ-004
- **Verification:** tests/expedition-classrooms.test.mjs; navegador
- **Scope:** ["apps/web/src/features/classrooms/styles/expedition-room.css", "apps/web/src/application/shell/styles/product.css", "tests/expedition-classrooms.test.mjs"]
- **Acceptance:** El encabezado muestra la portada, los accesos «por revisar» o «por hacer» y «temas trabajados», y la acción por rol. Las pestañas siguen el estilo de la maqueta. Plan muestra las unidades como recorrido y Muro el compositor y las publicaciones.
- **Evidence:** {"command": "node --test tests/expedition-classrooms.test.mjs (7); node scripts/run-complete-suite.mjs --group fast; navegador por pestaña", "result": "7/7 y fast 3126 pass; encabezado como banner con portada, accesos y acción por rol; pestañas como paradas; Plan como sendero con tema en tarjeta; Muro conservado; las 8 secciones docentes sin desborde a 1440 y 390", "candidate": "sha256:419f50b4996dc0991f73ad4f201ae0795d25f4381daf1fc540c9d887c0602f15"}
- **Blocker:** none

### TASK-004 — Biblioteca con archivo o apunte escrito
- **State:** VERIFYING
- **Depends on:** TASK-003
- **Owner:** orchestrator
- **Requirements:** REQ-004, REQ-005
- **Verification:** tests/expedition-classrooms.test.mjs; navegador
- **Scope:** ["apps/web/src/features/materials/publishing/MaterialPublishing.tsx", "apps/web/src/features/classrooms/styles/expedition-room.css", "tests/expedition-classrooms.test.mjs"]
- **Acceptance:** El docente elige entre archivo y apunte. El apunte se publica con título y contenido y el estudiante lo lee. La subida de archivos conserva la revisión de seguridad.
- **Evidence:** none
- **Blocker:** none

### TASK-005 — Actividades y editor
- **State:** PLANNED
- **Depends on:** TASK-003
- **Owner:** orchestrator
- **Requirements:** REQ-004, REQ-007
- **Verification:** tests/expedition-classrooms.test.mjs; pruebas de autoría existentes
- **Scope:** ["apps/web/src/application/workflows/activity-session/Activities.tsx", "apps/web/src/features/activity-authoring/drafting/ActivityAuthoring.tsx", "apps/web/src/features/classrooms/styles/expedition-room.css", "tests/expedition-classrooms.test.mjs"]
- **Acceptance:** La lista y el editor adoptan Expedición sin cambiar los pasos, los campos ni la publicación inmediata.
- **Evidence:** none
- **Blocker:** none

### TASK-006 — Progreso, Estudiantes, Historial y Ajustes con interruptor de IA
- **State:** PLANNED
- **Depends on:** TASK-003
- **Owner:** orchestrator
- **Requirements:** REQ-003, REQ-004, REQ-006
- **Verification:** tests/expedition-classrooms.test.mjs; tests/grading-ai-ui.test.mjs
- **Scope:** ["apps/web/src/features/classrooms/settings/ClassroomSettings.tsx", "apps/web/src/features/classrooms/members/ClassroomMembers.tsx", "apps/web/src/features/classrooms/members/ClassroomRoster.tsx", "apps/shared-ui/academic-cover.tsx", "apps/web/src/features/classrooms/styles/expedition-room.css", "tests/grading-ai-ui.test.mjs", "tests/expedition-classrooms.test.mjs"]
- **Acceptance:** Ajustes muestra el interruptor de corrección asistida, que envía `aiGradingEnabled`, queda bloqueado con explicación si no está disponible y no aparece para estudiantes. Muestra también las 7 portadas y el ciclo lectivo como sólo lectura.
- **Evidence:** none
- **Blocker:** none

### TASK-007 — Retiro de código y contratos sin uso
- **State:** PLANNED
- **Depends on:** TASK-002, TASK-004, TASK-005, TASK-006
- **Owner:** orchestrator
- **Requirements:** REQ-008
- **Verification:** tsc, eslint, check-boundaries, suite completa rápida
- **Scope:** ["apps/web/src/application/server/classroom-proxy.ts", "apps/web/src/application/workflows/classroom-creation/ClassroomWizard.tsx", "apps/web/src/features/curriculum/plan/WizardPlan.tsx"]
- **Acceptance:** Cada pieza eliminada tiene evidencia de que no tiene consumidores. Las suites pasan y los contratos protegidos siguen intactos.
- **Evidence:** none
- **Blocker:** none

### TASK-008 — Documentación y capturas
- **State:** PLANNED
- **Depends on:** TASK-007
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-004
- **Verification:** node scripts/check-documentation.mjs
- **Scope:** ["docs/design/README.md", "docs/verification/flows.md", "docs/design/current/catalog.json", "docs/design/current/README.md"]
- **Acceptance:** La guía de diseño, la matriz de flujos y la galería reflejan Mis aulas Expedición con capturas nuevas.
- **Evidence:** none
- **Blocker:** none
