# Feature: Mi estudio y Foxy AI con la experiencia de la maqueta Expedición

- **Spec:** #especificacion
- **Design:** #diseno
- **Approval:** approved
- **Evidence mode:** candidate-v1
- **Trace mode:** requirements-v1

El 2026-11-25 el usuario aprobó la maqueta `design/foxy-mi-estudio/` («Aprobada, implementá») después de pedir el riel plegable y el botón Herramientas en la cabecera. Eligió incluir los cambios de API (avance por carpeta y Quiz docente con formatos) y avanzar por tramos, mostrando cada uno antes del siguiente. No hay autorización de commit, push, PR, merge ni despliegue.

## Seguimiento Git

El 2026-11-26 el usuario autorizó commitear y abrir PRs apilados por tramo («Sí, por tramos»), sobre la punta vigente de `claude/notifications-profile-expedition` (PR 21, `2517baa6`). No hay autorización de merge ni de despliegue.

| Tramo | Rama | Base |
|---|---|---|
| 1 · Mesa de trabajo | `claude/studio-desk-expedition` | `claude/notifications-profile-expedition` |
| 2 · Práctica y repaso | `claude/studio-practice-expedition` | `claude/studio-desk-expedition` |
| 3 · Colección y asistente (API) | `claude/studio-collection-expedition` | `claude/studio-practice-expedition` |
| 4 · Foxy AI (API) | `claude/foxy-expedition` | `claude/studio-collection-expedition` |
| 5 · Documentación y capturas | `claude/studio-foxy-expedition-docs` | `claude/foxy-expedition` |

Los tramos se reconstruyeron desde el estado final verificado: los archivos compartidos (importaciones de hojas, registros de suites y pruebas acumuladas) se llevaron al estado de cada tramo, y el último coincide con el estado final salvo lo que trajo el remoto. Integración en ese orden.

## Especificacion

- **REQ-001:** En Mi estudio y Foxy, «Herramientas» abre un menú desplegable junto a Historial, Creaciones y Nuevo chat, disponible en cualquier momento de la conversación. Se maneja con teclado (flechas, Inicio, Fin, Escape devuelve el foco) y se cierra al elegir o al tocar afuera.
- **REQ-002:** El panel de la carpeta de Mi estudio (temas, materiales, próximo repaso) se pliega a una tira que conserva la cantidad de temas elegidos y accesos a materiales y repaso. La preferencia se recuerda en el dispositivo.
- **REQ-003:** Al elegir una herramienta de Mi estudio, su formulario se monta sobre el composer y usa el mismo cuadro de texto: un solo campo, botón con la acción concreta, cantidad y dificultad como botones. Si el cuadro queda vacío, Foxy usa una idea de partida. Cada herramienta conserva su borrador.
- **REQ-004:** Si la carpeta no tiene material legible, el aviso aparece arriba del composer antes de completar nada, con «Agregar material».
- **REQ-005:** Los temas elegidos se ven como fichas en el composer y se pueden quitar ahí; en pantallas angostas «Cambiar» abre la selección.
- **REQ-006:** Práctica y repaso siguen la maqueta: sendero de preguntas y resultado con siguiente paso; repaso en pasos con propuesta y confirmación.
- **REQ-007:** Colección y asistente: avance por carpeta y «Seguí donde quedaste» con datos de la API; paso de origen con una sola pregunta, aula única preseleccionada y recorrido a mano sin archivo.
- **REQ-008:** Foxy: contexto explícito en la cabecera, «Retomá» con creaciones recientes, formulario sobre el composer, herramienta Quiz con formatos aceptados por la API y «Llevar al aula» desde la propuesta.
- **REQ-009:** Lenguaje visual Expedición (tokens `--xp-*`, Nunito) en ambas pantallas, sin desborde a 1440 y 390 px.

## Diseno

Maqueta aprobada en `design/foxy-mi-estudio/` (no forma parte del producto). El menú y el pliegue viven en `apps/shared-ui/FoxyChatLayout.tsx`, compartido por ambas pantallas. Las hojas se anclan con `#foxmind-product#foxmind-product.fm3d-theme`.

## Tasks

### TASK-001 — Mesa de trabajo: menú de herramientas, riel plegable y formulario sobre el composer
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-009
- **Verification:** pruebas de componentes del menú, del pliegue y del formulario; navegador con el harness sintético en ambos roles a 1440 y 390 px
- **Scope:** ["apps/shared-ui/FoxyChatLayout.tsx", "apps/shared-ui/foxy-chat-layout.module.css", "apps/web/src/features/study/tools/study-tool-catalog.ts", "apps/web/src/features/study/tools/study-tool-dock.tsx", "apps/web/src/features/study/tools/study-tools-panel.tsx", "apps/web/src/features/study/workspace/study-rail.tsx", "apps/web/src/features/study/workspace/study-material-alert.tsx", "apps/web/src/features/study/conversations/presentation/study-chat-composer.tsx", "apps/web/src/features/study/conversations/presentation/study-chat-welcome.tsx", "apps/web/src/features/study/conversations/presentation/study-conversation.tsx", "apps/web/src/features/study/ui/study-workspace.tsx", "apps/web/src/features/study/styles/expedition-desk.css", "apps/web/src/application/shell/styles/product.css", "tests/foxy-chat-layout-tools-rail.test.mjs", "tests/expedition-desk.test.mjs", "tests/study-tool-drafts-ui.test.mjs", "tests/study-exact-generation-ui.test.mjs", "tests/study-workbench-ui.test.mjs", "tests/study-ui-audit-regressions.test.mjs", "tests/agenda-ui-helpers.test.mjs", "tests/frontend-study-workspace-views.test.mjs", "scripts/complete-suite-inventory.json", "scripts/complete-suite-routes.json", "scripts/ci-suites.mjs"]
- **Acceptance:** Herramientas abre el menú tras enviar un mensaje y elegir abre el formulario sobre el composer; el riel se pliega y despliega y se recuerda; el aviso de material aparece antes de completar; las fichas de temas se quitan desde el composer.
- **Evidence:** {"command":"node --test de las 11 suites afectadas y tests/foxy-chat-layout-tools-rail.test.mjs y tests/expedition-desk.test.mjs (RED contra el layout anterior y sin la importaci\u00f3n); tsc, eslint, check-boundaries, check-frontend-architecture; run-complete-suite --check y --group fast; desk-check.mjs en el harness sint\u00e9tico con ambos roles a 1440 y 390; repetida tras el tramo 2: run-complete-suite --group fast y practice-check.mjs (men\u00fa, formulario sobre el composer y Practicar con material)","result":"afectadas 120/120; layout 3/3 (2/3 fallan contra el anterior); hoja 2/2 (0/2 sin la importaci\u00f3n); fast 3182/3182; 740 pruebas clasificadas; navegador: men\u00fa encima del chat, flechas, Escape devuelve el foco, toque afuera cierra, disponible tras enviar; formulario con un solo cuadro y \u00abPreparar pr\u00e1ctica\u00bb; pliegue 1062\u21921258 px recordado al recargar; hoja inferior a 390; Foxy abre su di\u00e1logo desde el men\u00fa; sin desborde ni errores de p\u00e1gina. Camino con material no ejercitado: la carpeta vinculada sint\u00e9tica qued\u00f3 con 0 materiales. Repetici\u00f3n tras el tramo 2: fast 3191/3191; en el navegador el formulario vac\u00edo gener\u00f3 la pr\u00e1ctica, el aviso de material desaparece con material legible y el composer ya no desborda con el panel abierto. Repetida tras el tramo 5: fast 3204/3204 y capturas de la galer\u00eda sin desborde.","candidate":"sha256:098012519a0b34f395a3d1825c10432181cfff7d27365a02d030c84a95e63a55"}
- **Blocker:** none
- **Reopen reason:** El tramo 2 tocó study-workspace.tsx y expedition-desk.css (min-width del composer); se repitió la verificación
- **Reopen reason:** El tramo 3 tocó archivos compartidos (product.css, pruebas de Mi estudio); repetida la suite rápida completa
- **Reopen reason:** El tramo 4 tocó archivos compartidos (product.css, guarda de hojas); repetida la suite rápida completa
- **Reopen reason:** Las capturas del tramo 5 corrigieron estilos compartidos (ayuda del composer con panel abierto, contexto de Foxy en el teléfono); repetidas la suite rápida y las capturas

### TASK-002 — Práctica y repaso
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** orchestrator
- **Requirements:** REQ-006, REQ-009
- **Verification:** pruebas de componentes; navegador
- **Scope:** ["apps/web/src/features/study/practice/presentation/study-practice-results.ts", "apps/web/src/features/study/practice/presentation/study-practice-results.test.mjs", "apps/web/src/features/study/practice/presentation/study-practice-progress.tsx", "apps/web/src/features/study/practice/presentation/study-practice-question.tsx", "apps/web/src/features/study/practice/presentation/study-practice-feedback.tsx", "apps/web/src/features/study/practice/presentation/StudyPracticeView.tsx", "apps/web/src/features/study/practice/exam-planning/StudyExamPlanner.tsx", "apps/web/src/features/study/practice/exam-planning/study-exam-setup.tsx", "apps/web/src/features/study/ui/study-workspace.tsx", "apps/web/src/features/study/styles/expedition-practice.css", "apps/web/src/features/study/styles/expedition-desk.css", "apps/web/src/application/shell/styles/product.css", "tests/study-exact-repaso.test.mjs", "tests/frontend-study-step-views.test.mjs", "tests/study-workbench-ui.test.mjs", "tests/expedition-desk.test.mjs"]
- **Acceptance:** La práctica muestra el sendero y el resultado ofrece «Practicar lo que falló» y «Organizar mi repaso»; el repaso avanza por pasos y pide confirmación antes de Agenda.
- **Evidence:** {"command":"node --test de ayudantes de pr\u00e1ctica, frontend-study-step-views, study-exact-repaso, study-workbench-ui y expedition-desk; tsc; eslint; run-complete-suite --check y --group fast; practice-check.mjs en el harness sint\u00e9tico con apunte PDF sint\u00e9tico a 1440 y 390","result":"4/4, 7/7, 7/7, 8/8, 4/4; fast 3191/3191; 740 clasificadas; navegador: pr\u00e1ctica de 5 preguntas generada desde el formulario vac\u00edo, sendero con estados (para repasar/respondida), resultado con \u00abPracticar lo que fall\u00f3\u00bb que reabre Practicar con los temas, repaso Fecha\u2192Temas\u2192Horarios con validaci\u00f3n y volver conservando datos, sin desborde ni errores. Corregidos: bot\u00f3n Siguiente reutilizado como submit, temas sin preseleccionar, composer desbordado con la pr\u00e1ctica abierta. Repetida tras el tramo 5: fast 3204/3204 y capturas de la galer\u00eda sin desborde.","candidate":"sha256:9d6b0f46464b703d065c55f1ed13daa1d5c35ceece7ad918d18e13ebb6208f1c"}
- **Blocker:** none
- **Reopen reason:** El tramo 3 tocó archivos compartidos (product.css, pruebas de Mi estudio); repetida la suite rápida completa
- **Reopen reason:** El tramo 4 tocó archivos compartidos (product.css, guarda de hojas); repetida la suite rápida completa
- **Reopen reason:** Las capturas del tramo 5 corrigieron estilos compartidos (ayuda del composer con panel abierto, contexto de Foxy en el teléfono); repetidas la suite rápida y las capturas

### TASK-003 — Colección, avance por carpeta y asistente
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** orchestrator
- **Requirements:** REQ-007, REQ-009
- **Verification:** contrato de la API y pruebas del servicio; pruebas de componentes; navegador
- **Scope:** ["src/core/domain/study/progress.ts", "src/core/domain/study/folders.ts", "apps/api/src/modules/study/domain/state.ts", "apps/api/src/modules/study/application/contracts.ts", "apps/api/src/modules/study/folders/application/service.ts", "apps/api/src/modules/study/folders/application/commands.ts", "apps/api/src/modules/study/folders/infrastructure/folder-repository.ts", "apps/api/src/modules/study/folders/infrastructure/tests/policy.test.ts", "apps/api/src/modules/study/folders/infrastructure/tests/service.test.ts", "apps/api/src/bootstrap/study-agenda-integration.ts", "apps/web/src/features/study/model/study-contracts.ts", "apps/web/src/features/study/folders/study-folder-collection.tsx", "apps/web/src/features/study/folders/study-folder-wizard.tsx", "apps/web/src/features/study/folders/wizard/study-folder-program.tsx", "apps/web/src/features/study/model/study-sequence.test.mjs", "apps/web/src/features/study/styles/expedition-collection.css", "apps/web/src/application/shell/styles/product.css", "tests/study-folder-progress.test.mjs", "tests/study-collection-progress.test.mjs", "tests/frontend-study-step-views.test.mjs", "tests/study-workbench-ui.test.mjs", "tests/study-ui-audit-regressions.test.mjs", "tests/expedition-desk.test.mjs", "scripts/complete-suite-inventory.json", "scripts/complete-suite-routes.json", "scripts/ci-suites.mjs"]
- **Acceptance:** Cada carpeta muestra temas practicados y próximo repaso desde la API; el asistente pregunta el origen en un paso y permite armar a mano sin archivo.
- **Evidence:** {"command":"node --test study-folder-progress, study-collection-progress, frontend-study-step-views, study-sequence, study-workbench-ui, study-ui-audit-regressions, policy.test.ts, service.test.ts y expedition-desk; tsc de API y web; eslint; check-boundaries; check-frontend-architecture; run-complete-suite --check y --group fast; collection-check.mjs en el harness sint\u00e9tico con Postgres real","result":"2/2, 2/2, 8/8, 6/6, 9/9, 8/8, 3/3, servicio verde, 5/5; fast 3199/3199; 742 clasificadas; navegador: \u00ab2 de 2 temas practicados\u00bb y \u00abTema m\u00e1s flojo: Exposici\u00f3n\u00bb desde la consulta nueva, asistente con una sola pregunta y aula \u00fanica preseleccionada, \u00abA mano\u00bb sin archivo crea la carpeta activa; sin desborde a 1440 y 390. Regla anterior (plan obligatorio) reemplazada por decisi\u00f3n del 2026-11-25. L\u00edmite: repaso agendado no ejercitado en navegador (el proveedor sint\u00e9tico no genera planes). Repetida tras el tramo 5: fast 3204/3204 y capturas de la galer\u00eda sin desborde.","candidate":"sha256:ac83343a4a254de02030192c5a98de3c4aae92712ba9753077c266871cf483f0"}
- **Blocker:** none
- **Reopen reason:** El tramo 4 tocó archivos compartidos (product.css, guarda de hojas); repetida la suite rápida completa
- **Reopen reason:** Las capturas del tramo 5 corrigieron estilos compartidos (ayuda del composer con panel abierto, contexto de Foxy en el teléfono); repetidas la suite rápida y las capturas

### TASK-004 — Foxy AI: contexto, Retomá, Quiz y Llevar al aula
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** orchestrator
- **Requirements:** REQ-008, REQ-009
- **Verification:** contrato de la API del Quiz; pruebas de componentes; navegador
- **Scope:** ["src/core/domain/foxy/foxy-quiz.ts", "apps/api/src/modules/foxy/turns/infrastructure/providers/foxy-prompt.ts", "apps/api/src/modules/foxy/turns/infrastructure/providers/foxy-adapter.ts", "apps/web/src/features/foxy/conversations/foxy-request-display.ts", "apps/web/src/features/foxy/conversations/foxy-request-display.test.mjs", "apps/web/src/features/foxy/conversations/foxy-welcome.tsx", "apps/web/src/features/foxy/conversations/foxy-transcript.tsx", "apps/web/src/features/foxy/tools/foxy-tool-dialog.tsx", "apps/web/src/features/foxy/tools/foxy-tool-groups.ts", "apps/web/src/features/foxy/workspace/foxy-workspace.tsx", "apps/web/src/features/foxy/styles/expedition-foxy.css", "tests/foxy-quiz-format.test.mjs", "tests/foxy-workbench.test.mjs", "tests/foxy-exact-tools.test.mjs"]
- **Acceptance:** La cabecera nombra el contexto, el inicio lista creaciones recientes, el Quiz ofrece formatos que la API acepta y la propuesta se lleva al aula.
- **Evidence:** {"command":"node --test foxy-quiz-format, foxy-request-display, foxy-workbench, foxy-exact-tools y expedition-desk; tsc de API y web; eslint; check-boundaries; check-frontend-architecture; run-complete-suite --check y --group fast; foxy-check.mjs en el harness sint\u00e9tico con el docente a 1440 y 390","result":"2/2, 2/2 (ambas RED antes), 15/15 en las afectadas, 6/6; fast 3204/3204; 743 clasificadas; navegador: \u00abTrabajando con Ideas generales \u00b7 tu biblioteca\u00bb, bienvenida y men\u00fa con dos grupos e \u00edconos de color, sin chips; \u00abCrear un quiz\u00bb abre el formulario sin composer (un solo cuadro) y sin \u00abTrabajo pr\u00e1ctico\u00bb; el pedido V/F se ve como \u00abQuiz \u00b7 3 preguntas \u00b7 Verdadero o falso\u00bb; vuelve el composer y \u00abRetom\u00e1\u00bb lista la creaci\u00f3n; a 390 se abre el di\u00e1logo \u00abCrear un quiz\u00bb; sin desborde ni errores. L\u00edmite: el proveedor sint\u00e9tico no genera quizzes, el resultado V/F no se vio; \u00abLlevar al aula\u00bb queda como traspaso existente. Repetida tras el tramo 5: fast 3204/3204 y capturas de la galer\u00eda sin desborde.","candidate":"sha256:4bd744240ea0f2232bf4d41d006405884bcc9ef7e1871a864bc478c9abc2f65f"}
- **Blocker:** none
- **Reopen reason:** Las capturas del tramo 5 corrigieron estilos compartidos (ayuda del composer con panel abierto, contexto de Foxy en el teléfono); repetidas la suite rápida y las capturas

### TASK-005 — Documentación, capturas y registro de suites
- **State:** DONE
- **Depends on:** TASK-001, TASK-002, TASK-003, TASK-004
- **Owner:** orchestrator
- **Requirements:** REQ-009
- **Verification:** node scripts/check-documentation.mjs; run-complete-suite --check y --group fast
- **Scope:** ["docs/design/README.md", "docs/design/current/README.md", "docs/design/current/catalog.json", "docs/verification/flows.md", "docs/work-log/2026-11-25-expedition-studio-foxy.md", "apps/web/src/features/study/styles/expedition-desk.css", "apps/web/src/features/foxy/styles/expedition-foxy.css"]
- **Acceptance:** Guía de diseño, galería y matriz de flujos describen las pantallas nuevas; las pruebas nuevas están clasificadas.
- **Evidence:** {"command":"gallery-capture.mjs con builds de producci\u00f3n sobre el harness sint\u00e9tico (1440\u00d71000 y 390\u00d7844); verificaci\u00f3n sha256 del cat\u00e1logo; node scripts/check-documentation.mjs; run-complete-suite --check y --group fast","result":"12 capturas (6 renovadas, 6 nuevas), cat\u00e1logo de 55 con sha256 coincidentes, sin desborde ni errores de p\u00e1gina; 239 archivos y 1100 enlaces sin problemas; 743 pruebas clasificadas; fast 3204/3204. Corregidos al capturar: ayuda del composer con panel abierto y contexto de Foxy en el tel\u00e9fono.","candidate":"sha256:8eccd548476d677d13f1dbedfe47feaf36729fafb69b78cb9424380a13d4c95a"}
- **Blocker:** none
