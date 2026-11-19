# Feature: Acompañamiento docente por aula

- **Spec:** docs/product/acompanamiento-docente-propuesta.md
- **Design:** design/foxmind-ui-lab/01-foxmind.html
- **Approval:** approved
- **Evidence mode:** candidate-v1

### TASK-001 — Consultar prioridades y evidencia con permisos vigentes
- **State:** DONE
- **Depends on:** none
- **Owner:** backend y coordinador
- **Acceptance:** Reglas por obligaciones y fechas, paginación, autenticación y referencias de entregas sustentadas; ausencia de evidencia diferenciada.
- **Scope:** ["apps/api/src/bootstrap/academic-composition.ts", "apps/api/src/bootstrap/academic-grading-composition.ts", "apps/api/src/bootstrap/academic-http-services.ts", "apps/api/src/bootstrap/academic-http.ts", "apps/api/src/modules/grading/domain/teacher-support-policy.ts", "apps/api/src/modules/grading/progress/application/teacher-support.ts", "apps/api/src/modules/grading/progress/infrastructure/teacher-support-repository.ts", "apps/api/src/modules/grading/progress/presentation/teacher-support-routes.ts", "apps/web/src/application/server/classroom-proxy.ts", "apps/web/src/application/transport/teacher-support-client.ts", "src/core/contracts/teacher-support.ts", "src/core/domain/grading/teacher-support-query.ts", "tests/backend-academic-runtime.test.mjs", "tests/teacher-support-backend-db.test.mjs", "tests/teacher-support-backend-http.test.mjs", "tests/teacher-support-backend-policy.test.mjs", "tests/teacher-support-transport.test.mjs"]
- **Evidence:** {"result":"16/16 con nuevo puerto docente y contrato web","candidate":"sha256:fcee8061247324f5bfb05391f669d2ff771667f9972fa5d926de8535c361dff8","command":"node --import ./scripts/register-api-test-build.mjs --experimental-transform-types --test tests/teacher-support-backend-policy.test.mjs tests/teacher-support-backend-http.test.mjs tests/teacher-support-backend-db.test.mjs tests/teacher-support-transport.test.mjs tests/backend-academic-runtime.test.mjs"}
- **Blocker:** none

### TASK-002 — Abrir la ficha desde Inicio o el aula y leer su evidencia
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** UI y coordinador
- **Acceptance:** Filtro, prioridades, resumen individual, gráficos y observaciones con acceso al texto, cierre y regreso.
- **Scope:** ["apps/web/src/application/workflows/classroom-collection/ClassroomsApp.tsx", "apps/web/src/application/workflows/classroom-workspace/ClassroomWorkspace.tsx", "apps/web/src/features/classrooms/members/ClassroomRoster.tsx", "apps/web/src/features/home/dashboard/Home.tsx", "apps/web/src/features/teacher-support/SupportPriority.tsx", "apps/web/src/features/teacher-support/TeacherSupportDialog.tsx", "apps/web/src/features/teacher-support/TeacherSupportWidget.tsx", "apps/web/src/features/teacher-support/index.ts", "apps/web/src/features/teacher-support/model.ts", "apps/web/src/features/teacher-support/teacher-support.module.css", "apps/web/src/features/teacher-support/use-roster-support.ts", "tests/teacher-support-ui.test.mjs"]
- **Evidence:** {"result":"22/22 tras ajuste visual de pie y revalidación al foco","command":"node --test tests/teacher-support-ui.test.mjs tests/teacher-home-polish.test.mjs tests/p8-progress-client.test.mjs tests/student-summary-scroll.test.mjs tests/teacher-support-extension-ui.test.mjs","candidate":"sha256:cb22c497aefceeee58c9526f5944ce2ccbca4fcf419de2e797e54a3a6a9c5d25"}
- **Blocker:** none

### TASK-003 — Recorrer el producto integrado con usuarios sintéticos
- **State:** DONE
- **Depends on:** TASK-001, TASK-002
- **Owner:** QA y coordinador
- **Acceptance:** Evidencia con navegador y backend real, pruebas de permisos y regresión del candidato final.
- **Scope:** ["scripts/p4-integration-runtime.mjs", "scripts/ci-suites.mjs", "scripts/complete-suite-inventory.json", "scripts/complete-suite-routes.json", "scripts/teacher-support-test-runtime.mjs", "tests/p8-progress-integration.test.mjs", "tests/teacher-support-flow.test.mjs"]
- **Evidence:** {"result":"13/13 con bases descartables y navegador, sin omisiones","command":"node --test --test-concurrency=1 tests/teacher-support-flow.test.mjs tests/p8-progress-integration.test.mjs","candidate":"sha256:2d8c5ff37ed16ab4d12f1fdaee91e9869f64dec11891fd282f91f5c4166b0328"}
- **Blocker:** none

### TASK-004 — Consultar escritura por pedido docente y compartir una estrategia por elección del estudiante
- **State:** DONE
- **Depends on:** TASK-001, TASK-002, TASK-003
- **Owner:** coordinador
- **Acceptance:** Análisis explícito con cuota docente y fuentes revalidadas; publicación voluntaria con audiencia de un aula, acceso vigente y retiro; aislamiento de contenidos privados, pruebas de flujo y regresión.
- **Scope:** ["apps/api/src/bootstrap/academic-classrooms.module.ts", "apps/api/src/bootstrap/academic-curriculum-ai-runtime.ts", "apps/api/src/bootstrap/study-composition.ts", "apps/api/src/bootstrap/study-transport.ts", "apps/api/src/modules/classrooms/access/application/runtime-ports.ts", "apps/api/src/modules/grading/student-analysis/application/teacher-writing-ports.ts", "apps/api/src/modules/grading/student-analysis/application/teacher-writing-service.ts", "apps/api/src/modules/grading/student-analysis/infrastructure/teacher-writing-provider.ts", "apps/api/src/modules/grading/student-analysis/infrastructure/teacher-writing-repository.ts", "apps/api/src/modules/grading/student-analysis/infrastructure/teacher-writing-worker.ts", "apps/api/src/modules/grading/student-analysis/presentation/teacher-writing-routes.ts", "apps/api/src/modules/study/folders/presentation/http.ts", "apps/api/src/modules/study/strategies/application/service.ts", "apps/api/src/modules/study/strategies/infrastructure/repository.ts", "apps/api/src/modules/study/strategies/public.ts", "apps/api/src/platform/ai/admission.ts", "apps/api/src/platform/ai/text-budget.ts", "apps/web/src/application/navigation/ai-quota-indicator.tsx", "apps/web/src/application/server/classroom-proxy.ts", "apps/web/src/application/server/study-proxy.ts", "apps/web/src/application/transport/teacher-support-client.ts", "apps/web/src/features/study/api/study-http.ts", "apps/web/src/features/study/ui/study-workspace.tsx", "apps/web/src/features/study/workspace/StudySharedStrategyDialog.tsx", "apps/web/src/features/study/workspace/study-folder-options.tsx", "apps/web/src/features/study/workspace/study-shared-strategy.module.css", "apps/web/src/features/teacher-support/TeacherSupportDialog.tsx", "apps/web/src/features/teacher-support/TeacherWritingPanel.tsx", "prisma/migrations/202611190001_study_strategy_sharing/migration.sql", "prisma/migrations/202611190002_teacher_writing_analysis/migration.sql", "prisma/schema.prisma", "src/core/contracts/study-shared-strategy.ts", "src/core/contracts/teacher-support.ts", "src/core/contracts/teacher-writing.ts", "src/core/domain/grading/teacher-writing.ts", "src/core/domain/study/shared-strategy.ts", "tests/helpers/migration-inventory.mjs", "tests/helpers/teacher-support-sharing-fixture.mjs", "tests/study-shared-strategy-db.test.mjs", "tests/study-shared-strategy-policy.test.mjs", "tests/teacher-support-extension-ui.test.mjs", "tests/teacher-support-sharing-flow.test.mjs", "tests/teacher-writing-backend-db.test.mjs", "tests/teacher-writing-policy.test.mjs"]
- **Evidence:** {"command":"node --import ./scripts/register-api-test-build.mjs --experimental-transform-types --test --test-concurrency=1 tests/teacher-writing-policy.test.mjs tests/teacher-writing-backend-db.test.mjs tests/study-shared-strategy-policy.test.mjs tests/study-shared-strategy-db.test.mjs tests/teacher-support-extension-ui.test.mjs tests/teacher-support-sharing-flow.test.mjs","result":"23/23 con trabajadores reales, proveedor sintético, PostgreSQL y Chromium. 5/5 regresiones de cuota, 13/13 de acompañamiento inicial y progreso.","candidate":"sha256:29520b06b1d66139b2c3a37a22141df676cde2d3305973cd54bd484e6a783e8f"}
- **Blocker:** none
