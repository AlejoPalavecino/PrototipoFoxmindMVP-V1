# Real AI generation and application — locally verified

- Agent/role: /root, sole implementation and verification. Runtime session ID unavailable; no attributed memory writes.
- Date: 2026-10-28. Branch: codex/foxmind-ux-redesign. Clean starting commit: 048356d.
- Status: completed for real activity generation, review, private application and reopening.
- Scope: user explicitly requests real AI generation and application with the permanent demo account, correcting any failures. Authorized synthetic classroom generation/application writes; publication remains separate. No remote code publication/deployment requested.
- References: [roadmap](../implementation-roadmap.md), [activity AI tasks](../../odd/tasks/classroom-activity-ai.md), [previous failed real attempts](2026-10-28-root-education-experience.md).

## Preparation

Read current Git state, roadmap and work-record protocol. Prior real attempts failed at PDF input limits and insufficient context. Inspect current UI/provider pipeline before issuing a bounded new request. Reuse admitted local API52170/web52171 and existing synthetic data. Do not reset/seed/migrate or print credentials/private configuration.

## Work performed

The earlier context-only failure explicitly requested source documents despite substantive teacher content. `apps/api/src/ai/activity-prompt.ts` now separates teacher context from generation controls into a named `teacher-context` source. The system instruction explicitly permits sufficient context without attachments and requests Spanish learner-facing output/missing information. The exact evidence payload reaches both token preflight and generation. Existing evidence validation, insufficient-content rejection, quotas, deadlines, structured schema and no-tools/no-automatic-retry controls remain.

`ActivityGeneration.tsx`, `ActivityGenerationProposal.tsx` and `activity-generation-api.ts` now show source titles, “Lectura completada” and singular “1 página”; review references no longer expose internal source IDs. No new fetching, hooks, dependencies or business/API contracts. Presentation-only changes verified in the live browser and existing UI regressions.

## Actual provider and classroom evidence

Admitted launcher `.test-artifacts/main-gemini-20261024/preview-auth-dev.mjs` restarted after API build by closing only its owned Next child, allowing supervisor cleanup. Existing supervisor reported original key file unchanged. Current supervisor PID19476 serves API52170/web52171 with Gemini Developer API, gemini-3.5-flash-lite, configured key and syntheticProvider=false. No private configuration contents were printed; no seed, migration, reset, budget adjustment or retained-file edit.

Ego Space17, permanent synthetic demo account, Matemáticas - Demo:

1. Context-only generation `6ef1a620-f1ba-4234-9a32-155ecb1b793f` reached READY with two Spanish fractions prompts. Edited the title, opened student preview, then clicked apply once. Job reached APPLIED, producing activity `f420e56e-000d-4ad7-9bcb-f246009a125a` titled **Demo IA · Fracciones equivalentes**. Browser reload, classroom reentry and Continue draft preserved title, curriculum/topic and both prompts; UI confirms the private saved state.
2. Additional bounded generation `5c37d3a5-56f8-4eb0-b6c3-78a217b13ec7` used the existing Guía de Matemáticas PDF plus teacher context. READY, one prompt, source READ/one page, references to that PDF page and teacher context. Recovered from recent generations after development hot reload without generating again. Left as a proposal, unapplied, avoiding an unnecessary second activity.
3. Final authenticated read-only list: exactly one new DRAFT and the preexisting PUBLISHED questionnaire. No new publication, student submission, grade, uploaded material or account write. Two generation requests and one application in this task. Screenshots/metadata are [durable evidence](evidence/2026-10-28-real-ai/README.md).

Historical jobs `88d0cb60-52e0-4dcb-9802-8359b9e18096` (INSUFFICIENT_CONTENT) and `485ea0ac-d1e6-4da7-8f5e-5ed8d5be6ff5` (AI_INPUT_LIMIT) remain untouched. The exact cause of the old PDF limit is not proven: a direct compiled-parser diagnostic read its one page in2537ms, and the subsequent real PDF generation succeeded. The existing3000ms parser deadline and all file/page/token limits were not increased. This is observed success, not a guarantee against future load/provider failures.

## Observed checks

- New adapter regression first failed as expected:7PASS/1FAIL (missing named context source). After implementation, adapter plus real-SDK compatibility tests:11PASS/0FAIL.
- `node --experimental-transform-types --test --test-concurrency=1 --test-reporter=spec tests/activity-ai-adapter.test.mjs tests/activity-gemini-count-compatibility.test.mjs tests/activity-ai-ui.test.mjs tests/activity-ai-polling.test.mjs tests/activity-unknown-start.test.mjs tests/activity-ai-jobs.test.mjs tests/activity-ai-lifecycle.test.mjs tests/activity-ai-publication.test.mjs tests/activity-ai-source-limits.test.mjs tests/activity-document-format-isolation.test.mjs`: **58PASS/0FAIL/0SKIP**. Includes recovery, single atomic/idempotent application, student privacy, explicit publication, uncertain outcome protection, aggregate limits and parser format isolation. Database tests own disposable Docker PostgreSQL fixtures, never retained DATABASE_URL.
- `npm run api:build`: PASS (Prisma client and strict API TypeScript).
- `node node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json`: PASS.
- `node node_modules/next/dist/bin/next build .test-artifacts/education-production-build/apps/web`: PASS. Isolated Next output; shared classroom/domain sources are actual junctions to this checkout. Existing multiple-lockfile warning remains advisory.
- Four native-browser captures inspected: PDF review and reopened saved editor at1440×1000 and390×844. No document horizontal overflow. Named references and translated status observed. Same responsive field semantics/role gates retained.
- React best-practices self-review: pure bounded source-title lookup, escaped text, no new effects/network/bundle dependencies; existing private preview and application callbacks preserved. No independent/native review claim; this session explicitly uses no subagents. No configured lint/boundaries task is represented as PASS.
- Browser diagnostic failures preserved: one PowerShell inline quoting error before execution; one capture wait after development HMR returned to classroom list; one summary click intercepted by sticky navigation. Recovered by inspecting current page, reopening the saved proposal and positioning the summary centrally. No duplicate provider dispatch/application resulted.

## Delivery and handoff

Evidence-link/metadata/overflow assertions PASS; `git diff --cached --check` and `gitleaks protect --staged --redact` PASS. Generated development-only `next-env.d.ts` restored. Implementation, regression and actual evidence committed as `d13a832`; working tree observed clean after that commit. This passive update records its identity without further product changes. Rollback boundary: the four provider/UI production files and adapter regression restore prior source serialization/labels; no database migration or retained-data rollback is needed. Keep the synthetic generated draft and proposal as user-visible results.

This closes the requested real generation→review→private application→reload journey. Broader submission/grading persistence, physical-device/Safari acceptance and remote integration remain outside this task; historical gaps are not silently closed. No push, PR, main merge or deployment. Space17 returned to the user through `finish({keep:['p1']})`, with the saved draft editor open at1440px; no further agent browser operation.
