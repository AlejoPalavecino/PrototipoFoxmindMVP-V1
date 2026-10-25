# S0 / D9 Inicio — code GREEN, independent live verification pending

- Agent / role: visual_home / slice_worker
- Session or task ID: /root/visual_home
- Date: 2026-10-25
- Branch / worktree: codex/foxmind-3d-migration / canonical shared checkout
- Starting commit: eecb769151b12abb5ae9e1f15839b54c772e446f
- Phase and detailed task/spec links: ../../odd/tasks/foxmind-3d-migration.md (S0, D3-COV, D9)
- Status: in_progress

## Request and scope
Implement strict shared Home contracts, authorized real aggregate/client and Inicio UI after coordinator-observed RED8. Preserve concurrent edits and every test file. Coordinator additionally authorized publication-state boolean on the existing teacher history DTO, and extraction of public pure reception rules. No commit, remote publication, deployment, retained data or secrets.

## Work performed
- Read roadmap, work-record protocol, migration contract, design foundations, account/navigation and selected07/09/10 references; read Next installed Pages API guide and Context7 React19.3 documentation before UI APIs. Applied clean-architecture.
- Added strict unknown-input parsers for7modules/targets, zones/dates/UUIDs, bounded pages/cursors and error-vs-empty-vs-inapplicable states; shared10coverkeys and display-only legacy/unknown mapping.
- Added Home factories, read-only UoW, sequential7projections, exact participation/setup/counts, signed actor/module/zone keyset cursors, module savepoint recovery, final identity/scope revalidation, and two GET routes with no Home/open mutation. Composition uses existing verified Agenda authentication and6000ms/maxWait2000ms transaction limits.
- Pending reception now calls the same pure activityReceptionPolicy as existing attempts; SQL ordering retains equivalent max/equality logic. Review reads persisted publication prerequisites without recalculating grades. Miniagenda bounds SQL candidates to4 and UI to3, unions private/academic starts within90days and resolves private recurrence/timed offsets through existing domain seriesSchedules/scheduleInstants. Private descriptions/answers/editor capabilities are absent from response.
- Added no-store same-origin proxy and strict client with30000ms cancellation; Home lifecycle clears prior account/unauthorized data, global vs module errors, refresh-on-focus60seconds, no polling. UI shows real7modules, paginated local panels, actual totals, classroom-specific shortcuts, setup/archived/none states, responsive3D assets and keyboard panel heading/return focus.
- Added gradePublished boolean through one LEFT JOIN on the existing history query after tester observed RED; no grade value or per-row fetch.
- New product files remain below200lines; functions below40physical lines. Existing policy/application/history files were scoped edits. No test file edited by this agent.

## Verification
Observed by this agent:
- Initial S0 GREEN: node --test --test-reporter=dot tests/foxmind-3d-contracts.test.mjs -> exit0,8groups.
- node --test --test-reporter=dot tests/foxmind-3d-contracts.test.mjs tests/foxmind-3d-service.test.mjs tests/foxmind-3d-flows.test.mjs -> exit0,23checks.
- node --experimental-transform-types --test --test-reporter=dot tests/foxmind-3d-repository-history.test.mjs -> exit0 after tester's real PostgreSQL RED; unpublished/private-zero/published boolean cases.
- node --test --test-reporter=dot tests/foxmind-3d-contracts.test.mjs tests/foxmind-3d-service.test.mjs tests/foxmind-3d-repository.test.mjs -> exit0,25checks at that repository-suite revision.
- node --test --test-reporter=dot tests/foxmind-3d-contracts.test.mjs tests/foxmind-3d-service.test.mjs tests/foxmind-3d-http.test.mjs tests/foxmind-3d-client.test.mjs tests/foxmind-3d-client-lifecycle.test.mjs -> exit0,26checks.
- Latest node --test --test-reporter=dot tests/foxmind-3d-repository.test.mjs tests/foxmind-3d-http.test.mjs tests/foxmind-3d-client.test.mjs tests/foxmind-3d-client-lifecycle.test.mjs -> exit0; repository checks at that invocation included owned PostgreSQL rollback, permission/count/cursor/private state/real SQL savepoint recovery and miniagenda.
- node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit --pretty false -> exit0 after final product edits.
- node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit --pretty false -> exit0 after final product edits.
- Scoped git diff --check on tracked files owned here -> exit0. Global diff check also observed unrelated account-screen.tsx CRLF whitespace and was reported to coordinator; not reported as global PASS.
- No lint script/configuration exists in the inspected repository; linter unavailable, not reported as a passing configured linter.
Failures retained: early web check found missing onAction integration (other worker subsequently added it), later web check caught in-progress Library/Activities props (other worker completed them); both final typechecks pass. An avoidable shell quoting parser error occurred while adding panel focus and was corrected with apply_patch without executing a partial mutation. Worker reported core parameter-property strip-only incompatibility; this agent changed HomeError to explicit property/assignment. No repeated same-error correction triggered the circuit breaker.
Independent tester report, not this agent's own command observation: extended repository parity13PASS including equality deadline and question grading completeness/max override; HTTP3/client4/lifecycle5PASS. Tester owns live preview/functional proof.

## Commits and outcomes
No commit performed. API/Home/core source freeze communicated to coordinator/test_runner for fresh owned preview build. Code GREEN is distinct from D9 visual acceptance and whole D10 closure.

## Handoff
First unfinished task: tester completes fresh real API/browser read and targeted Home actions in owned disposable QA, including rendering/navigation/permitted private Agenda; coordinator reconciles independent proof/review and current overall D0-D10 matrix. This agent remains available for concrete findings. Do not mark D9/D10 accepted from this record alone. No frozen product changes planned absent a test/QA finding.

## Exact affected paths and current line counts
- `apps/api/src/application.ts`: 92 lines.
- `apps/api/src/classrooms/activity-history.ts`: 122 lines.
- `apps/api/src/classrooms/attempt-policy.ts`: 16 lines.
- `apps/api/src/classrooms/index.ts`: 3 lines.
- `apps/api/src/classrooms/policy.ts`: 182 lines.
- `apps/api/src/home/cursor.ts`: 21 lines.
- `apps/api/src/home/database-types.ts`: 6 lines.
- `apps/api/src/home/host.ts`: 24 lines.
- `apps/api/src/home/http.ts`: 39 lines.
- `apps/api/src/home/index.ts`: 4 lines.
- `apps/api/src/home/integration.ts`: 1 lines.
- `apps/api/src/home/miniagenda.ts`: 51 lines.
- `apps/api/src/home/pending-policy.ts`: 8 lines.
- `apps/api/src/home/private-timing.ts`: 13 lines.
- `apps/api/src/home/queries-content.ts`: 20 lines.
- `apps/api/src/home/queries-feedback.ts`: 10 lines.
- `apps/api/src/home/queries-participation.ts`: 25 lines.
- `apps/api/src/home/queries-pending.ts`: 18 lines.
- `apps/api/src/home/queries-review.ts`: 25 lines.
- `apps/api/src/home/query-values.ts`: 5 lines.
- `apps/api/src/home/read-port.ts`: 35 lines.
- `apps/api/src/home/service.ts`: 31 lines.
- `apps/api/src/home/sql-page.ts`: 35 lines.
- `apps/api/src/home/unit-of-work.ts`: 27 lines.
- `apps/classrooms-ui/foxmind-home.css`: 67 lines.
- `apps/classrooms-ui/home-api.ts`: 10 lines.
- `apps/classrooms-ui/home-labels.ts`: 20 lines.
- `apps/classrooms-ui/Home.tsx`: 37 lines.
- `apps/classrooms-ui/HomeModule.tsx`: 18 lines.
- `apps/classrooms-ui/HomeModulePanel.tsx`: 38 lines.
- `apps/classrooms-ui/HomeRow.tsx`: 27 lines.
- `apps/classrooms-ui/HomeShortcuts.tsx`: 24 lines.
- `apps/classrooms-ui/use-home.ts`: 40 lines.
- `apps/web/pages/api/v1/home/[[...path]].ts`: 6 lines.
- `apps/web/src/lib/home-client.ts`: 33 lines.
- `apps/web/src/lib/home-proxy.ts`: 75 lines.
- `src/core/domain/activity-reception.ts`: 6 lines.
- `src/core/domain/classroom-cover.ts`: 13 lines.
- `src/core/domain/home-ports.ts`: 10 lines.
- `src/core/domain/home-rows-validation.ts`: 65 lines.
- `src/core/domain/home-target.ts`: 21 lines.
- `src/core/domain/home-validation.ts`: 30 lines.
- `src/core/domain/home-values.ts`: 45 lines.
- `src/core/domain/home.ts`: 64 lines.
- `src/core/domain/index.ts`: 19 lines.
- `docs/work-log/2026-10-25-visual-home.md`: 90 lines.

## Follow-up: D9 real Ego screen export polish
- Status: in_progress; coordinator delegated presentation-only follow-up to this same task.
- Evidence read: .test-artifacts/foxmind-3d-home-screen-export.png (authenticated real Ego media-screen PDF raster). It shows framed/cropped hero taking roughly306px and blank thumbnail slots while the hero paints.
- Scope: Home*.tsx and foxmind-home.css only; no logic/contracts/backend/tests/shared shell. Foundations owns topbar/gutters; classroom worker owns stale loading banner.
- Plan: full-height panoramic approved scene integrated across a roughly200px desktop greeting; compact queue spacing without dropping row data; eager synchronous local thumbnail painting to avoid deferred lazy/async PDF image paints. Tester capturing pre-edit DOM metrics to distinguish a late image decode/load from actual asset failure.

### Presentation follow-up implementation / observed checks
- Added HomeCover.tsx (17lines): same approved cover catalog and responsive variants; explicit eager loading, synchronous decode and low fetch priority for small visible-row art. Prior HomeRow delegated to shared FoxmindIllustration with lazy loading/async decode; those attributes are observed source facts, while their responsibility for the historical PDF blank remains a hypothesis, not proven causality.
- Tester reported the previous round had allimagesloaded=true only after its PDF export. Its disposable runtime reached360s and was cleaned before targeted pre-change DOM metrics could be collected; no old complete/naturalWidth/currentSrc per-thumbnail observation is claimed.
- Home greeting now reserves about200CSSpx desktop and places the approved panorama across its whole background, with the complete Foxy scene contained to the right and text at left. Mobile separates the image below text with reserved space. Removed the internal framed-image layout through owned Home CSS only.
- Compacted row/module padding and gaps and kept the queue CTA on the same row from1200px, retaining all real status/date/classroom text and44px controls.
- Observed node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit --pretty false exit0, scoped git diff --check exit0. No new behavior tests required for this presentation-only follow-up; existing contracts/client lifecycle untouched.
- Presentation code freeze communicated to coordinator/tester. First remaining proof: fresh webbuild and real Ego media-screen export at1440/390/320 with thumbnail load/decode metrics and hero/review heading bounds. Pixel acceptance and D10 closure remain unclaimed.

### Independent fresh Group3 metrics (reported by visual_tests)
- Fresh media-screen PDFs: .test-artifacts/foxmind-3d-group3-home-1440.test.pdf, -390.test.pdf and -320.test.pdf. No raster acceptance is inferred from PDF existence.
- Tester observed width-matched layouts with overflow=false and legacySpinner=false at1440/390/320.
- Desktop greeting bounds x245.44/y80/w1167.36/h200CSSpx; review begins y834.60 and has w722.41/h330. This meets the requested approximate200px hero and places the real review heading within1000px without removing rows/data.
- Current thumbnail DOM at all three widths: eager/sync/complete=true, natural72x47, currentSrc approved biology/literature WebP. Display boxes72x72desktop and48x48at320. Natural metrics show actual image decode, not placeholder paint, but final raster inspection remains pending.
- Mixed synthetic fixture now includes real pending work,2review groups (needs review/private zero ready to publish), QUERY and personal event. These are tester-created disposable data, not display inventions.
- This worker's attempt to render locally with the default Python found no fitz module; no dependency installed. Coordinator is rendering retained PDFs to PNG for visual comparison.

### Fresh pixel inspection by this worker
- Used view_image on .test-artifacts/foxmind-3d-group3-home-1440.png and .test-artifacts/foxmind-3d-group3-home-390.png rendered by coordinator from the fresh real Ego screen PDFs.
- Observed actual literature and biology thumbnail pixels, replacing the historical blank beige slots; approved full Foxy panorama integrated without an internal framed card; real Para revisar heading appears within the first desktop1000px raster. No fabricated image placeholder is used.
- At390px, the art sits below greeting text, thumbnail/long classroom labels remain legible, and actions remain present without horizontal cropping.320px currently has tester-reported DOM bounds and retained real PDF, but this worker has not inspected its raster.
- The change's current result is observed. The precise historical blank cause remains unproven because no pre-change per-image load/decode metrics survived; deferred lazy/async paint remains the qualified mechanism addressed.
- Presentation follow-up completed with scoped web TypeScript/diff checks PASS and1440/390 pixel inspection. Overall record stays in_progress for coordinator-owned independent integration/acceptance; this does not mark D10 complete.
- Follow-up affected product paths: apps/classrooms-ui/Home.tsx37lines; HomeRow.tsx27lines; HomeCover.tsx17lines; foxmind-home.css67lines. Existing data/client refresh/backend/contracts/tests unchanged by this follow-up.

### Pre-audit EOF cleanup
- Coordinator requested whitespace-only correction after staged tree3d9146; no semantic change.
- Removed only extra trailing blank lines from apps/api/src/home/{http,miniagenda,queries-pending,queries-review,read-port,sql-page}.ts and src/core/domain/{classroom-cover,home-validation,home}.ts, preserving one final newline. Also normalized the ending of this owned record.
- Observed initial git diff --cached --check list those9product files and this record. Scoped working-tree git diff --check now exits0. Cached content deliberately remains unchanged until coordinator restages and creates a new frozen tree; no commit performed.
- No functional tests rerun: this change only removes EOF blank lines and preserves all non-whitespace source text. Group4 independent runtime stays owned by tester.
