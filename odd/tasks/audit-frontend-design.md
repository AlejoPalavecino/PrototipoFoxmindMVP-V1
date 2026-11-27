# Feature: Diseño del frontend (F3–F11 de la auditoría)

- **Spec:** #especificacion
- **Design:** #diseno
- **Approval:** approved
- **Evidence mode:** candidate-v1
- **Trace mode:** requirements-v1

El 2026-11-26 el usuario aprobó atender los hallazgos de diseño del frontend de la [auditoría](../../docs/work-log/2026-11-26-root-full-stack-audit.md), salvo F1 y F2 (otra sesión), en cortes de unas 400 líneas con las opciones recomendadas: el formateador sólo sobre los archivos con líneas largas y fuera de `application/server/`; F8 se difiere hasta integrar F1, en coordinación con la sesión principal; el token CSRF se reutiliza sólo si la API lo acepta más de una vez. Sin cambios visibles de producto. Commits sólo en la rama propia; push, PR o merge requieren autorización aparte.

## Seguimiento Git

Base `main` en `a06c9214`, rebasada sobre `origin/main` (`490105ff`, F1 cortes 1 y 2). Rama `claude/audit-frontend-71cf98`, un commit por corte. Push y PR autorizados por el usuario el 2026-11-27 en esta sesión; sin merge.

## Especificacion

- **REQ-001:** (F4) `lint:boundaries` aplica `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps` y `react-hooks/set-state-in-effect` como error en `apps/web` y `apps/shared-ui`, y pasa.
- **REQ-002:** (F7) Ninguna línea de producción de `apps/web` ni `apps/shared-ui` supera el largo máximo, salvo `application/server/` (de F1).
- **REQ-003:** (F10, F11) No quedan módulos de producción alcanzados sólo por pruebas, ni carpetas con sólo pruebas que cargan código ajeno por ruta.
- **REQ-004:** (F6) No hay ciclo entre `application/clients` y `application/transport`; `application/navigation` no hace pedidos HTTP.
- **REQ-005:** (F9) La regla de arquitectura falla ante archivos o componentes nuevos que superan largo de línea, tamaño o cantidad de `useState`; las excepciones vigentes están listadas y sólo pueden achicarse.
- **REQ-006:** (F5) Los clientes HTTP del navegador comparten un helper de pedido y una clase de error base.
- **REQ-007:** (F3) `ActivityAuthoring`, `Activities` y `foxy-workspace` separan carga y reglas del render, con la misma UI.
- **REQ-008:** (F8) Una subida que sigue enviando datos no se corta por un plazo total fijo de 10 s en la API; el plazo se define junto con el del proxy de F1.

## Diseno

Cortes en el orden de las tareas. Cada uno se verifica con `npx tsc --noEmit -p apps/web/tsconfig.json`, `npm run web:build`, `npm run lint:boundaries`, `npm run test:complete -- --group fast` y `npm run docs:check`; los que tocan pantallas, además en el navegador con un entorno propio y cuentas sintéticas.

## Tasks

### TASK-001 — Reglas de hooks activas (F4)
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-001
- **Verification:** npm run lint:boundaries
- **Acceptance:** Con las tres reglas como error, `lint:boundaries` pasa; un efecto que sólo reinicia estado hace fallar la regla.
- **Scope:** ["apps/shared-ui/AppNavbar.tsx", "apps/shared-ui/FoxyChatLayout.tsx", "apps/shared-ui/use-reset-on-change.ts", "apps/web/src/application/navigation/account-navbar.tsx", "apps/web/src/application/workflows/activity-session/Activities.tsx", "apps/web/src/application/workflows/activity-session/AttemptSession.tsx", "apps/web/src/application/workflows/classroom-collection/ClassroomsApp.tsx", "apps/web/src/application/workflows/classroom-workspace/ClassroomWorkspace.tsx", "apps/web/src/application/workflows/classroom-workspace/use-classroom-resource.ts", "apps/web/src/application/workflows/foxy-workspace/FoxyResourceWorkspace.tsx", "apps/web/src/application/workflows/foxy-workspace/FoxyWorkspaceSession.tsx", "apps/web/src/application/workflows/foxy-workspace/foxy-session-transition.test.mjs", "apps/web/src/features/activity-authoring/generation/ActivityGeneration.tsx", "apps/web/src/features/agenda/calendar/Agenda.tsx", "apps/web/src/features/agenda/calendar/useAgenda.ts", "apps/web/src/features/agenda/event-editor/useEventEditor.ts", "apps/web/src/features/classrooms/creation/use-classroom-plan-file.ts", "apps/web/src/features/classrooms/enrollment/InvitationBatchDialog.tsx", "apps/web/src/features/classrooms/settings/ClassroomSettings.tsx", "apps/web/src/features/foxy/visuals/foxy-visual-reader-dialog.tsx", "apps/web/src/features/foxy/workspace/foxy-workspace.tsx", "apps/web/src/features/foxy/workspace/use-foxy-workspace-actions.ts", "apps/web/src/features/home/dashboard/HomeMiniagenda.tsx", "apps/web/src/features/home/dashboard/use-home.ts", "apps/web/src/features/materials/publishing/MaterialPublishing.tsx", "apps/web/src/features/notifications/inbox/Notifications.tsx", "apps/web/src/features/study/model/use-study-generation.ts", "apps/web/src/features/study/practice/exam-planning/StudyExamPlanner.tsx", "apps/web/src/features/study/ui/study-context.tsx", "apps/web/src/features/study/ui/study-workspace.tsx", "apps/web/src/screens/study-screen.tsx", "apps/web/src/shared/use-scoped-value.ts", "docs/engineering/frontend/README.md", "eslint-suppressions.json", "eslint.config.mjs", "package-lock.json", "package.json", "scripts/complete-suite-inventory.json", "scripts/complete-suite-routes.json", "tests/agenda-ui-helpers.test.mjs", "tests/helpers/wizard-reference/component-harness.mjs", "tests/react-state-helpers.test.mjs"]
- **Evidence:** {"command":"npx tsc --noEmit -p apps/web/tsconfig.json; npm run lint:boundaries; npm run test:complete -- --group fast; navegador","result":"Cortes 1 y 1b: reglas activas como error, 31 exhaustive-deps corregidos, 15 efectos de reinicio pasados a useResetOnChange o a hooks; supresiones de set-state-in-effect 83 -> 68; fast 3227/3227; navegador en entorno descartable sin regresiones","candidate":"sha256:392a7f81a1c34cb53e11b33128f362d1868f7654abdf8fff32354f3818556610"}
- **Blocker:** none

### TASK-002 — Líneas de producción acotadas (F7)
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** orchestrator
- **Requirements:** REQ-002
- **Verification:** scripts/check-frontend-architecture.mjs
- **Acceptance:** Ninguna línea fuera de `application/server/` supera el máximo; build y pruebas sin cambios.
- **Scope:** [".prettierrc.json", "apps/shared-ui/FoxmindIcon.tsx", "apps/shared-ui/NavbarParts.tsx", "apps/web/src/application/workflows/activity-session/Activities.tsx", "apps/web/src/application/workflows/activity-session/ActivityScreen.tsx", "apps/web/src/application/workflows/activity-session/AttemptHistory.tsx", "apps/web/src/application/workflows/classroom-creation/ClassroomWizard.tsx", "apps/web/src/application/workflows/classroom-workspace/ClassroomWorkspace.tsx", "apps/web/src/application/workflows/foxy-workspace/FoxyActivityHandoffPanel.tsx", "apps/web/src/application/workflows/foxy-workspace/FoxyResourceWorkspace.tsx", "apps/web/src/features/activity-authoring/drafting/ActivityAuthoring.tsx", "apps/web/src/features/activity-authoring/generation/ActivityGeneration.tsx", "apps/web/src/features/agenda/calendar/AgendaMonth.tsx", "apps/web/src/features/agenda/event-editor/EventForm.tsx", "apps/web/src/features/agenda/event-editor/EventRepeatFields.tsx", "apps/web/src/features/classrooms/collection/ClassroomCollection.tsx", "apps/web/src/features/classrooms/collection/ClassroomCollectionCard.tsx", "apps/web/src/features/classrooms/collection/ClassroomCollectionFilters.tsx", "apps/web/src/features/classrooms/collection/ClassroomCollectionHero.tsx", "apps/web/src/features/classrooms/collection/PendingClassroomCard.tsx", "apps/web/src/features/classrooms/creation/ClassroomWizardCover.tsx", "apps/web/src/features/classrooms/creation/WizardGeneral.tsx", "apps/web/src/features/classrooms/enrollment/PendingInvitations.tsx", "apps/web/src/features/classrooms/settings/ClassroomSettings.tsx", "apps/web/src/features/classrooms/workspace/ClassroomHeader.tsx", "apps/web/src/features/communication/ui/Wall.tsx", "apps/web/src/features/curriculum/plan/PlanWorkspace.tsx", "apps/web/src/features/curriculum/plan/WizardPlan.tsx", "apps/web/src/features/foxy/api/foxy-client.ts", "apps/web/src/features/foxy/collections/foxy-collection-panel.tsx", "apps/web/src/features/foxy/context/foxy-context-picker.tsx", "apps/web/src/features/foxy/context/foxy-library-panel.tsx", "apps/web/src/features/foxy/conversations/foxy-composer.tsx", "apps/web/src/features/foxy/visuals/foxy-visual-publication-controller.ts", "apps/web/src/features/foxy/visuals/foxy-visual-publication-panel.tsx", "apps/web/src/features/foxy/visuals/foxy-visual-reader-dialog.tsx", "apps/web/src/features/foxy/visuals/foxy-visual-workspace.tsx", "apps/web/src/features/foxy/workspace/foxy-workspace.tsx", "apps/web/src/features/grading/progress/Progress.tsx", "apps/web/src/features/home/dashboard/Home.tsx", "apps/web/src/features/home/dashboard/HomeMiniagenda.tsx", "apps/web/src/features/home/dashboard/HomeShortcuts.tsx", "apps/web/src/features/home/queue/HomeModule.tsx", "apps/web/src/features/home/queue/HomePriorities.tsx", "apps/web/src/features/home/queue/HomeRow.tsx", "apps/web/src/features/materials/catalog/MaterialCatalog.tsx", "apps/web/src/features/materials/publishing/MaterialForm.tsx", "apps/web/src/features/participation/practical/PracticalAttempt.tsx", "apps/web/src/features/participation/questionnaire/QuestionnaireAttempt.tsx", "apps/web/src/features/study/model/study-discovery.ts", "apps/web/src/features/study/ui/study-context.tsx", "apps/web/src/features/study/ui/study-generation-status.tsx", "apps/web/src/features/study/ui/study-library.tsx", "apps/web/src/features/study/ui/study-upload.tsx", "apps/web/src/features/study/ui/study-wizard.tsx", "apps/web/src/screens/agenda-screen.tsx", "docs/engineering/frontend/README.md", "package-lock.json", "package.json", "tests/expedition-home.test.mjs", "tests/p8-grading-client.test.mjs", "tests/p8-progress-client.test.mjs", "tests/p8-publication-client.test.mjs"]
- **Evidence:** {"command":"prettier sobre 57 archivos; check-frontend-architecture","result":"0 lineas > 400 fuera de server/ (antes 124); fast 3227/3227; web:build ok","candidate":"sha256:5d7ba47de885e0ddc3126f2fc772b16a2e0a8b93e222483101abf4d882726696"}
- **Blocker:** none

### TASK-003 — Sin código alcanzado sólo por pruebas (F10, F11)
- **State:** DONE
- **Depends on:** TASK-002
- **Owner:** orchestrator
- **Requirements:** REQ-003
- **Verification:** npm run test:complete -- --group fast
- **Acceptance:** La copia de `PlanWorkspace` en `workflows` no existe y sus pruebas cargan el componente real; `features/foxy/model/` y `features/foxy/ui/` no contienen sólo pruebas.
- **Scope:** ["apps/web/src/features/foxy/collections/foxy-discovery-controller.test.mjs", "apps/web/src/features/foxy/conversations/foxy-chat-controller.test.mjs", "apps/web/src/features/foxy/conversations/foxy-context-controller.test.mjs", "apps/web/src/features/foxy/publication/foxy-publication-confirmation-controller.test.mjs", "apps/web/src/features/foxy/publication/foxy-publication-history-controller.test.mjs", "apps/web/src/features/foxy/publication/foxy-publication-management-controller.test.mjs", "apps/web/src/features/foxy/publication/foxy-publication-management-panel.test.mjs", "apps/web/src/features/foxy/resources/foxy-preparation-controller.test.mjs", "apps/web/src/features/foxy/resources/foxy-resource-controller.test.mjs", "apps/web/src/features/foxy/visuals/foxy-visual-controller.test.mjs", "apps/web/src/features/foxy/visuals/foxy-visual-publication-controller.test.mjs", "apps/web/src/features/foxy/visuals/foxy-visual-publication-panel.test.mjs", "apps/web/src/features/foxy/visuals/foxy-visual-topic.test.mjs", "apps/web/src/features/foxy/visuals/foxy-visual-workspace.test.mjs", "apps/web/src/features/foxy/workspace/foxy-collections.test.mjs", "apps/web/src/features/foxy/workspace/foxy-context-view.test.mjs", "apps/web/src/features/foxy/workspace/foxy-workspace-actions.test.mjs", "apps/web/src/features/foxy/workspace/foxy-workspace-runtime.test.mjs", "apps/web/src/features/foxy/workspace/foxy-workspace-start.test.mjs", "apps/web/src/features/foxy/workspace/foxy-workspace.test.mjs", "apps/web/src/features/foxy/workspace/use-foxy-workspace-actions.test.mjs", "docs/design/README.md", "docs/verification/2026-11-12-foxy-study-e2e.md", "scripts/ci-suites.mjs", "scripts/complete-suite-inventory.json", "scripts/complete-suite-routes.json", "tests/agenda-polish-presentation.test.mjs", "tests/agenda-ui-helpers.test.mjs", "tests/agenda-ux-navigation.test.mjs", "tests/brujula-agenda-account-complete.test.mjs", "tests/brujula-auth-parity.test.mjs", "tests/classroom-curriculum-workspace.test.mjs", "tests/classroom-interior-redesign.test.mjs", "tests/classroom-plan-filters.test.mjs", "tests/entry-glass-polish.test.mjs", "tests/foxmind-3d-flows-account.test.mjs", "tests/foxmind-3d-flows-plan.test.mjs", "tests/foxy-study-demand-panels.test.mjs", "tests/helpers/plan-workspace.mjs", "tests/helpers/wizard-reference/component-harness.mjs", "tests/workspace-disclosure.test.mjs"]
- **Evidence:** {"command":"recorrido de imports desde pages; npm run test:complete -- --group fast","result":"Envoltorio PlanWorkspace y 12 archivos sin entrada retirados; 21 pruebas de foxy reubicadas; fast 3219/3219","candidate":"sha256:a8e49d4c5f93830df9beac1fd467ae91b33bbe606d18e28482e01e02486cf3af"}
- **Blocker:** none

### TASK-004 — Capas de aplicación sin ciclo (F6)
- **State:** DONE
- **Depends on:** TASK-003
- **Owner:** orchestrator
- **Requirements:** REQ-004
- **Verification:** npm run lint:boundaries
- **Acceptance:** Ningún módulo de `transport` importa de `clients`; `navigation` no llama a `fetch`.
- **Scope:** ["apps/web/src/application/clients/ai-quota-client.ts", "apps/web/src/application/navigation/ai-quota-indicator.tsx", "apps/web/src/application/transport/academic-response.ts", "apps/web/src/application/transport/classroom-client.ts", "docs/engineering/frontend/README.md", "scripts/check-frontend-architecture.mjs", "tests/expedition-navigation.test.mjs", "tests/frontend-boundaries.test.mjs", "tests/monthly-ai-quota-client.test.mjs"]
- **Evidence:** {"command":"node --test tests/frontend-boundaries.test.mjs; npm run lint:boundaries","result":"RED con las dos violaciones reales; GREEN tras mover academic-response y ai-quota-client; fast 3221/3221","candidate":"sha256:044a5f7d5f24213cd4863c70ced166cbfd188c5accac19f213d0a162b25ca57d"}
- **Blocker:** none

### TASK-005 — La regla de arquitectura controla tamaño (F9)
- **State:** DONE
- **Depends on:** TASK-004
- **Owner:** orchestrator
- **Requirements:** REQ-005
- **Verification:** tests de scripts/check-frontend-architecture.mjs
- **Acceptance:** Un archivo nuevo con una línea larga, demasiadas líneas o demasiados `useState` hace fallar la regla; las excepciones actuales pasan.
- **Scope:** ["docs/engineering/frontend/README.md", "scripts/check-frontend-architecture.mjs", "scripts/frontend-size-baseline.json", "tests/frontend-boundaries.test.mjs"]
- **Evidence:** {"command":"node --test tests/frontend-boundaries.test.mjs; npm run lint:boundaries","result":"Limites 200/500/10 con linea base de 108 archivos que solo baja; la regla freno dos versiones de F3; fast 3224/3224","candidate":"sha256:603252f1a3be9f46276113338f98f1c9091746e44b55be3d8f1d0e981e4a7d68"}
- **Blocker:** none

### TASK-006 — Capa HTTP común del navegador (F5)
- **State:** BLOCKED
- **Depends on:** TASK-005
- **Owner:** orchestrator
- **Requirements:** REQ-006
- **Verification:** npm run test:complete -- --group fast
- **Acceptance:** Los clientes usan el helper común y sus errores extienden la clase base; las pruebas de clientes siguen verdes.
- **Scope:** ["apps/web/src/application/clients/agenda-client.ts", "apps/web/src/application/clients/classroom-client.ts", "apps/web/src/application/transport/classroom-client.ts", "apps/web/src/application/transport/json-request.ts", "apps/web/src/features/agenda/api/api.ts", "apps/web/src/features/files/api/client.ts", "apps/web/src/features/foxy/api/foxy-client.ts", "apps/web/src/features/home/api/home-api.ts", "apps/web/src/features/identity/api/account-client.ts", "apps/web/src/features/study/api/study-error.ts", "apps/web/src/shared/http/csrf.ts", "docs/engineering/frontend/README.md", "scripts/complete-suite-inventory.json", "scripts/complete-suite-routes.json", "src/core/contracts/client-error.ts", "tests/p5-web-client.test.mjs", "tests/web-http-shared.test.mjs"]
- **Evidence:** {"command":"node --test tests/web-http-shared.test.mjs; navegador","result":"ClientError base de 6 clases; token CSRF reutilizado en aulas y agenda sin reenvio implicito; dos PATCH con un solo GET /auth/csrf en el navegador; fast 3231/3231","candidate":"sha256:939aaf7fc93d05182097921b1ca090828b0faefb4a09bb090f5f04a5edcc5fe1"}
- **Blocker:** Decisión del usuario: Foxy, Estudio, Archivos y adjuntos siguen pidiendo CSRF en cada mutación; su API de feature sólo puede importar de src/core. Hay que llevar la fuente CSRF a src/core o inyectarla desde la composición.

### TASK-007 — Componentes grandes separados (F3)
- **State:** DONE
- **Depends on:** TASK-005
- **Owner:** orchestrator
- **Requirements:** REQ-007
- **Verification:** pruebas de cada componente y navegador
- **Acceptance:** Cada componente baja su cantidad de `useState` y la UI se comporta igual en el navegador.
- **Scope:** ["apps/web/src/application/workflows/activity-session/Activities.tsx", "apps/web/src/application/workflows/activity-session/use-activity-editor-state.ts", "apps/web/src/application/workflows/activity-session/use-activity-list.ts", "apps/web/src/application/workflows/foxy-workspace/foxy-session-transition.test.mjs", "apps/web/src/features/activity-authoring/drafting/ActivityAuthoring.tsx", "apps/web/src/features/activity-authoring/drafting/use-activity-draft.ts", "apps/web/src/features/activity-authoring/drafting/use-authoring-operation.ts", "apps/web/src/features/activity-authoring/drafting/use-generation-request.ts", "apps/web/src/features/foxy/workspace/foxy-workspace.tsx", "apps/web/src/features/foxy/workspace/use-conversation-start.ts", "apps/web/src/features/foxy/workspace/use-tool-dialog.ts", "apps/web/src/features/foxy/workspace/use-workspace-panels.ts", "eslint-suppressions.json", "scripts/frontend-size-baseline.json", "tests/agenda-ui-helpers.test.mjs", "tests/helpers/wizard-reference/component-harness.mjs"]
- **Evidence:** {"command":"pruebas de cada componente; npm run test:complete -- --group fast; navegador","result":"ActivityAuthoring 35->10, Activities 23->10, foxy-workspace 24->9 useState; fast 3231/3231; navegador: crear actividad, fuentes de Foxy, herramienta y contexto de Foxy","candidate":"sha256:ea69365d3e39138e9aec66a5b2c173d6da95d552086df18387cdcc0e6a05a2a9"}
- **Blocker:** none

### TASK-008 — Plazo de subida en la API (F8)
- **State:** BLOCKED
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-008
- **Verification:** prueba del plazo de lectura del cuerpo en apps/api, a definir con F1
- **Acceptance:** Se define junto con el proxy de F1.
- **Scope:** ["apps/api/src/modules/files/uploads/presentation/http.ts"]
- **Evidence:** none
- **Blocker:** Diferido por decisión del usuario hasta integrar F1, en coordinación con la sesión principal.
