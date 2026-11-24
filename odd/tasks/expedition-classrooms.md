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
- **Scope:** ["apps/shared-ui/parity-assets.ts", "apps/web/src/features/classrooms/collection/PendingClassroomCard.tsx", "apps/web/src/application/workflows/classroom-collection/ClassroomsApp.tsx", "apps/web/src/features/classrooms/styles/expedition-classrooms.css", "tests/pending-classrooms.test.mjs", "tests/product-parity-invitation-ui.test.mjs", "tests/classroom-workspace-shell.test.mjs"]
- **Acceptance:** Docente y estudiante ven el banner, las pestañas con contador centrado, la búsqueda, las tarjetas con portada y «X de Y temas dados», los borradores con «Paso N de 4», las invitaciones y los estados vacíos, sin desborde a 390 px. No queda ninguna aparición de «Eliminar pendiente».
- **Evidence:** {"command": "node scripts/run-complete-suite.mjs --group fast; node --test tests/expedition-classrooms.test.mjs", "result": "fast 3126 pass, 0 fail; el alcance pasó registros de suites y documentación a TASK-008 sin cambiar el contenido verificado; navegador docente 1440 y 390, estudiante 1440", "candidate": "sha256:4f0bef64ac500edd606b3b79ffe7a95c2f3df69d01308d17c74d96a1fa2a034c"}
- **Blocker:** none

### TASK-002 — Asistente de creación con sendero y catálogo completo
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** orchestrator
- **Requirements:** REQ-003
- **Verification:** tests/expedition-classrooms.test.mjs; navegador
- **Scope:** ["apps/web/src/features/classrooms/creation/ClassroomWizardCover.tsx", "apps/web/src/features/classrooms/creation/ClassroomProcessing.tsx", "apps/web/src/features/classrooms/styles/expedition-wizard.css", "tests/classroom-creation-four-steps.test.mjs"]
- **Acceptance:** El asistente muestra las cuatro paradas con el estado de guardado y la vista previa, y ofrece las 7 portadas con los nombres del catálogo. El procesamiento con Foxy y la revisión conservan su comportamiento.
- **Evidence:** {"command": "node scripts/run-complete-suite.mjs --group fast; node --test tests/classroom-creation-four-steps.test.mjs tests/expedition-classrooms.test.mjs; tsc", "result": "fast 3126 pass, 0 fail; asistente 15/15; ClassroomWizard.tsx pasó a TASK-007, que lo modificó después; 7 portadas, vista previa en el riel, paso 2 alcanzado, sin desborde a 1440 y 390", "candidate": "sha256:addac407dbf4b0bde7f7450f3b1e506f4e1c0726cbfbc51d59af5053b258528e"}
- **Blocker:** none

### TASK-003 — Encabezado, pestañas, Plan y Muro
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** orchestrator
- **Requirements:** REQ-004
- **Verification:** tests/expedition-classrooms.test.mjs; navegador
- **Scope:** ["apps/web/src/features/classrooms/styles/expedition-room.css", "tests/expedition-classrooms.test.mjs"]
- **Acceptance:** El encabezado muestra la portada, los accesos «por revisar» o «por hacer» y «temas trabajados», y la acción por rol. Las pestañas siguen el estilo de la maqueta. Plan muestra las unidades como recorrido y Muro el compositor y las publicaciones.
- **Evidence:** {"command": "node --test tests/expedition-classrooms.test.mjs (7); node scripts/run-complete-suite.mjs --group fast; navegador por pestaña", "result": "7/7 y fast 3126 pass; expedition-room.css y la prueba restauradas idénticas a 71665d55 al separar la Biblioteca; product.css pasó a TASK-008; las 8 secciones sin desborde a 1440 y 390", "candidate": "sha256:37fa9d36b0cc8d075abd0ac0ecbcfb130a323d6dcfead8838d373876cd9dcf81"}
- **Blocker:** none

### TASK-004 — Biblioteca con archivo o apunte escrito
- **State:** DONE
- **Depends on:** TASK-003
- **Owner:** orchestrator
- **Requirements:** REQ-004, REQ-005
- **Verification:** tests/expedition-classrooms.test.mjs; navegador
- **Scope:** ["apps/web/src/features/materials/publishing/MaterialPublishing.tsx", "apps/web/src/features/classrooms/styles/expedition-library.css", "tests/expedition-library.test.mjs"]
- **Acceptance:** El docente elige entre archivo y apunte. El apunte se publica con título y contenido y el estudiante lo lee. La subida de archivos conserva la revisión de seguridad.
- **Evidence:** {"command": "node --test tests/expedition-library.test.mjs tests/expedition-classrooms.test.mjs; tsc; navegador Biblioteca 1440 y 390", "result": "9/9; apunte TEXT publicado con documento generado y reutilizado, caracteres invisibles frenados antes de subir, archivo sigue como opción inicial; diálogo Escribir un apunte con Contenido, sin desborde", "candidate": "sha256:74f22acf9dd9e9c9bf08025c23b10fefaffdbf9c876568fef8f2dc2772f247fa"}
- **Blocker:** none

### TASK-005 — Actividades y editor
- **State:** DONE
- **Depends on:** TASK-003
- **Owner:** orchestrator
- **Requirements:** REQ-004, REQ-007
- **Verification:** tests/expedition-classrooms.test.mjs; pruebas de autoría existentes
- **Scope:** ["apps/web/src/features/classrooms/styles/expedition-activities.css", "tests/expedition-activities.test.mjs"]
- **Acceptance:** La lista y el editor adoptan Expedición sin cambiar los pasos, los campos ni la publicación inmediata: filtro segmentado con contador centrado, paso actual en lago, títulos de recuadros dentro de su tarjeta y nombres de pasos completos en celular.
- **Evidence:** {"command": "node --test tests/expedition-activities.test.mjs; navegador Actividades y editor 1440 y 390", "result": "2/2; filtro segmentado con contador centrado, paso actual en lago con número en sol, estado de guardado en niebla, modo Temas en lago, títulos de Tipo, Método y unidades dentro de su tarjeta, pasos completos en celular; sin desborde; sin cambios de comportamiento (sólo CSS)", "candidate": "sha256:6b84dfecd5265f56215685630a54e9e673347650d9a42030cd8d0c8b8eff6905"}
- **Blocker:** none

### TASK-006 — Progreso, Estudiantes, Historial y Ajustes con interruptor de IA
- **State:** DONE
- **Depends on:** TASK-003
- **Owner:** orchestrator
- **Requirements:** REQ-003, REQ-004, REQ-006
- **Verification:** tests/expedition-classrooms.test.mjs; tests/grading-ai-ui.test.mjs
- **Scope:** ["apps/web/src/features/classrooms/settings/ClassroomSettings.tsx", "apps/web/src/features/classrooms/styles/expedition-settings.css", "tests/expedition-settings.test.mjs", "tests/grading-ai-ui.test.mjs"]
- **Acceptance:** Ajustes muestra el interruptor de corrección asistida, que envía `aiGradingEnabled`, queda bloqueado con explicación si no está disponible y no aparece para estudiantes. Muestra también las 7 portadas y el ciclo lectivo como sólo lectura.
- **Evidence:** {"command": "node --test tests/expedition-settings.test.mjs tests/grading-ai-ui.test.mjs; tsc; eslint; navegador Ajustes 1440 y 390", "result": "8/8; interruptor visible con estado escrito, se enciende y apaga, bloqueado con explicación si el servicio no está disponible, apagado se guarda igual, invisible para estudiantes; 7 portadas con nombre; ciclo de sólo lectura; sin desborde", "candidate": "sha256:711cedc29ca495ab5c5c51bbce2b3a8449d48c3e939900adcd9869d7d2480a4d"}
- **Blocker:** none

### TASK-007 — Retiro de código y contratos sin uso
- **State:** DONE
- **Depends on:** TASK-002, TASK-004, TASK-005, TASK-006
- **Owner:** orchestrator
- **Requirements:** REQ-008
- **Verification:** tsc, eslint, check-boundaries, suite completa rápida
- **Scope:** ["apps/web/src/application/workflows/classroom-creation/ClassroomWizard.tsx", "apps/web/src/features/curriculum/plan/WizardPlan.tsx", "apps/web/src/features/curriculum/index.ts", "apps/web/src/features/classrooms/styles/brujula-wizard.css", "apps/web/src/application/shell/styles/brujula-parity.css", "tests/brujula-wizard-parity.test.mjs", "tests/helpers/wizard-reference/component-harness.mjs"]
- **Acceptance:** Cada pieza eliminada tiene evidencia de que no tiene consumidores. Las suites pasan y los contratos protegidos siguen intactos.
- **Evidence:** {"command": "grep sin referencias restantes; tsc; eslint; check-boundaries; check-frontend-architecture; run-complete-suite --check; node --test (8 archivos del asistente y currículo)", "result": "retirados WizardPlanText.ts, el diálogo Editar el plan como texto, el estado planText/pastedText/extractingText, la prop classroomLayout y sus ramas, la prueba brujula-wizard-roundtrip, el bloque de parser en brujula-wizard-parity, los ayudantes openPlanText/preparePlanText y los selectores .brujula-wizard-extract; 48/48; endpoints submissions/receipt conservados: los usan pruebas de integración como chequeo de autorización", "candidate": "sha256:2e6af88d98b41d4f819335e923c0a1bdfed82397284f01fb9cdb4bd2b7f4c173"}
- **Blocker:** none

### TASK-008 — Documentación y capturas
- **State:** PLANNED
- **Depends on:** TASK-007
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-004
- **Verification:** node scripts/check-documentation.mjs
- **Scope:** ["apps/web/src/application/shell/styles/product.css", "scripts/complete-suite-inventory.json", "scripts/complete-suite-routes.json", "scripts/ci-suites.mjs", "docs/engineering/classrooms/README.md", "docs/design/classroom-teacher-redesign.md", "docs/design/README.md", "docs/verification/flows.md", "docs/design/current/catalog.json", "docs/design/current/README.md"]
- **Acceptance:** La guía de diseño, la matriz de flujos y la galería reflejan Mis aulas Expedición con capturas nuevas.
- **Evidence:** none
- **Blocker:** none
