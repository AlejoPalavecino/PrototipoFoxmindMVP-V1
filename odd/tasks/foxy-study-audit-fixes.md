# Correcciones de la auditoría docente y estudiantil

- **Spec:** docs/foxmind-v1-functional-spec.md
- **Design:** odd/tasks/foxy-study-exact-parity.md
- **Approval:** approved
- **Evidence mode:** candidate-v1

### TASK-001 — Imagen y esquema reales
- **State:** DONE
- **Depends on:** none
- **Owner:** imagen
- **Acceptance:** Verificar imagen y diagrama creados con Gemini en lector y archivo privado.
- **Scope:** ["apps/api/src/modules/foxy/visuals/infrastructure/visual-configuration.ts", "docs/work-log/2026-11-17-imagen-foxy-gemini-real.md"]
- **Evidence:** {"command": "Ego Lite + lecturas autenticadas de Biblioteca", "result": "JPEG privado y publicado idénticos, esquema PNG, acceso cruzado 403. Registro de imagen 17/11.", "candidate": "sha256:b5bc0175e3261974c50091318c9e262b4fd175eb2a32efead8f7f4a4fdd473c3"}
- **Blocker:** none

### TASK-002 — Herramientas e historial docente
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** docente
- **Acceptance:** Recuperar estados y orden, publicación, filtros, formato, traspaso y descargas.
- **Scope:** ["apps/api/src/modules/foxy/application/ports.ts", "apps/api/src/modules/foxy/visuals/infrastructure/tests/foxy-visual-journey.test.mjs", "apps/api/src/modules/foxy/visuals/infrastructure/visual-repository.ts", "apps/web/src/features/foxy/api/foxy-client.ts", "apps/web/src/features/foxy/collections/foxy-collection-panel.tsx", "apps/web/src/features/foxy/context/foxy-library-panel.tsx", "apps/web/src/features/foxy/context/foxy-scope-dialog.tsx", "apps/web/src/features/foxy/conversations/foxy-chat-controller.ts", "apps/web/src/features/foxy/conversations/foxy-markdown-format.ts", "apps/web/src/features/foxy/conversations/foxy-transcript.tsx", "apps/web/src/features/foxy/index.ts", "apps/web/src/features/foxy/model/foxy-chat-controller.test.mjs", "apps/web/src/features/foxy/model/foxy-publication-history-controller.test.mjs", "apps/web/src/features/foxy/publication/foxy-publication-history-controller.ts", "apps/web/src/features/foxy/tools/foxy-tool-dialog.tsx", "apps/web/src/features/foxy/ui/foxy-collections.test.mjs", "apps/web/src/features/foxy/visuals/foxy-visual-reader.tsx", "apps/web/src/features/foxy/visuals/foxy-visual-workspace.tsx", "apps/web/src/features/foxy/workspace/foxy-workspace-actions.ts", "apps/web/src/features/foxy/workspace/foxy-workspace-runtime.ts", "apps/web/src/features/foxy/workspace/foxy-workspace.module.css", "apps/web/src/features/foxy/workspace/foxy-workspace.tsx", "tests/foxy-visual-editor-ui.test.mjs"]
- **Evidence:** {"command": "Chromium + Gemini; suite frontend Foxy; pruebas de lector, alcance y traspaso", "result": "370/370 frontend; apertura y destino por ID, descargas JPEG/PNG/Word/TXT, descarte, cronología y polling. Cuatro recorridos móviles sobre build final.", "candidate": "sha256:1e6a0cf9140d8e83f12a3bfb120ba327251a4d30b1911b22f0e38ade1d255344"}
- **Blocker:** none

### TASK-003 — Carpetas, biblioteca y práctica
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** estudio
- **Acceptance:** Operar carpeta, fuentes, plan, ejercicios, avisos, filtros e intentos en la interfaz.
- **Scope:** ["apps/web/src/application/workflows/foxy-workspace/FoxyActivityHandoffPanel.tsx", "apps/web/src/application/workflows/foxy-workspace/FoxyResourceWorkspace.tsx", "apps/web/src/application/workflows/foxy-workspace/FoxyWorkspaceSession.tsx", "apps/web/src/application/workflows/foxy-workspace/foxy-resource-workspace.test.mjs", "apps/web/src/features/curriculum/plan/Plan.tsx", "apps/web/src/features/curriculum/plan/plan.module.css", "apps/web/src/features/study/api/study-error.ts", "apps/web/src/features/study/creations/presentation/study-creations-panel.tsx", "apps/web/src/features/study/creations/presentation/study-practice-preview.tsx", "apps/web/src/features/study/creations/study-creation-editor.tsx", "apps/web/src/features/study/folders/study-folder-collection.tsx", "apps/web/src/features/study/folders/study-folder-wizard.tsx", "apps/web/src/features/study/model/study-contracts.ts", "apps/web/src/features/study/practice/exam-planning/StudyExamPlanner.tsx", "apps/web/src/features/study/practice/exam-planning/study-exam-session-editor.tsx", "apps/web/src/features/study/practice/presentation/StudyPracticeView.tsx", "apps/web/src/features/study/styles/parity-study-exact.css", "apps/web/src/features/study/tools/study-tool-dialog.tsx", "apps/web/src/features/study/tools/study-tools-panel.tsx", "apps/web/src/features/study/ui/study-library.tsx", "apps/web/src/features/study/ui/study-material-editor.tsx", "apps/web/src/features/study/ui/study-materials.tsx", "apps/web/src/features/study/ui/study-workspace.tsx", "apps/web/src/screens/study-screen.tsx", "tests/study-ui-audit-regressions.test.mjs"]
- **Evidence:** {"command": "Chromium + Gemini; node scripts/run-ci-suite.mjs --suite study", "result": "93/93; carpeta y ciclo, filtros, ejercicios, intentos, agenda y archivos comprobados; devolución final con ocupación y cancelación durable.", "candidate": "sha256:1b8b257571b4c57b107db9501e54ca462634584e08cd9d50c0e08d0bd3209c19"}
- **Blocker:** none

### TASK-004 — Actividad generada en el editor
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** contratos
- **Acceptance:** Conservar citas y alcanzar borrador editable con una idea docente.
- **Scope:** ["apps/api/src/modules/activities/generation/infrastructure/providers/activity-response.ts", "tests/activity-ai-adapter.test.mjs"]
- **Evidence:** {"command": "Gemini real y navegador; tests/activity-ai-adapter.test.mjs; integración de aplicación y publicación", "result": "READY, tres consignas, dos criterios y borrador privado persistente. Regresiones 31/31 e integración 5/5.", "candidate": "sha256:3bfb912463a9d8a326a620fb67763adb70f7ac28c86656a6840a5fe100a690cc"}
- **Blocker:** none

### TASK-005 — Recuperación concurrente e integración
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** root
- **Acceptance:** Verificar permisos, recuperación de solicitudes, pruebas de regresión y recorridos sobre el candidato.
- **Scope:** ["apps/api/src/bootstrap/study-file-integration.ts", "apps/api/src/bootstrap/study-runtime.ts", "apps/api/src/modules/study/application/contracts.ts", "apps/api/src/modules/study/folders/application/service.ts", "apps/api/src/modules/study/folders/presentation/http.ts", "apps/api/src/modules/study/generation/application/request-documents.ts", "apps/api/src/modules/study/generation/infrastructure/providers/study-adapter.ts", "apps/api/src/modules/study/generation/infrastructure/providers/study-ai-execution.ts", "apps/api/src/modules/study/generation/public.ts", "apps/api/src/modules/study/practices/application/feedback.ts", "scripts/ci-suites.mjs", "scripts/complete-suite-inventory.json", "scripts/complete-suite-routes.json", "tests/ai-study-reservation-database.test.mjs", "tests/brujula-foxy-handoff-ui.test.mjs", "tests/study-ai-execution.test.mjs", "tests/study-exact-practice.test.mjs", "tests/study-runtime.test.mjs", "tests/study-source-concurrency-database.test.mjs"]
- **Evidence:** {"command": "npm run local:restart; npm run lint:boundaries; node scripts/run-complete-suite.mjs --group fast; node --test tests/study-source-concurrency-database.test.mjs; Chromium con Gemini", "result": "API/web compiladas; límites aprobados; 2909 rápidas aprobadas. Lectura lenta y revocación 8/8; feedback y ejercicio solapados HTTP 200 con estado COMPLETE.", "candidate": "sha256:b3b8fcfb619fa6a32670f9f01a936290d42d08f6c6c22a91efca1b84a954c6de"}
- **Blocker:** none