# Frontend refactoring with mock data

## Objective and rationale
Preserve existing FoxMind UX and mock behavior while improving feature cohesion, dependency boundaries and future backend replaceability. Current classroom, messaging and study modules mix UI, operations and mutable data.

## Scope and constraints
- Frontend architecture, feature-owned mock adapters, focused tests, typed navigation and accessibility/settings composition.
- No backend/database, real authentication, new AI integration or visual redesign.
- Preserve fixture semantics, cross-role behavior and current persistence characteristics.
- Single writer; delegate nontrivial implementation and command verification.
- User explicitly authorized the initial snapshot and verified local work-unit commits on a refactoring branch. No push, PR or publication authorized. Project-only git init completed.
- User-owned RDD is on. Follow native review continuations for source candidates; no review result grants delivery authority.
- Characterize existing behavior before structural changes. Use observed RED/GREEN for actual behavior changes where meaningful; structural refactoring uses passing characterization tests before/after.

## Delivery and routing
Delivery strategy: auto-chain; user selected chain_strategy=feature-branch-chain. Forecast: sprint exceeds 400 authored changed lines. T2 scoped delta is +402/-140 (542); preserve coherent behavior/tests, no cosmetic compression. Future child review slices target the feature/tracker chain; actual branch/PR preparation waits for destination/default-branch verification and explicit publishing authorization. No push/PR/merge authorized. Review base initially 4a6940f98038cd49e2811d0930d5b90ccd752ad0.

## Tasks
- [x] T1 Establish runtime/typecheck/build baseline and identify browser/test capabilities. Route: delegated verifier; command verification trigger.
- [x] T2 Add characterization tests and migrate classroom submission pilot plus cross-role theme helper. Route: bounded worker; multi-file trigger. Derive exact edit surfaces before dispatch.
- [ ] T3 Migrate remaining classroom flows and mock ownership in bounded subunits. Route: bounded workers, sequential.
  - [x] T3a Catalogue/membership owner and student join boundary (~180–300 changed lines before detailed implementation). Characterize legacy synchronous semantics and live compatibility; preserve messaging-triggered refresh.
  - [x] T3b Teacher creation/list composition (~250–450). Extract creation simulation/state and role-owned list; preserve delays, defaults, curriculum session replacement and toasts.
  - [x] T3c Activities/assignment/grading (~400–700 estimated). Feature-owned activity mock, compatibility and actual rendered role components; preserve T2 grading differences/copying behavior. Verify render paths rather than assuming symbol presence means rendered.
  - [ ] T3d Muro/participants (~250–450). Feature-owned posts and role presentation; preserve mounted local-state behavior, author/type and interactions. Invitation/message operations remain T4.
  - [ ] T3e Role-screen orchestration (~250–500). Move actual role-owned compositions and keep pages focused on wiring/navigation; characterize defaults/selection/back paths. T3 is not complete if only fixtures moved.
- [ ] T4 Separate messaging persistence, operations, UI and invitation enrollment coordination. Route: bounded workers, sequential.
- [ ] T5 Modularize study tools, local state and mock operations. Route: bounded workers, sequential.
- [ ] T6 Type app navigation and separate app settings/composition; share layout only where justified. Route: bounded workers.
- [ ] T7 Enforce dependency rules and document extension points. Route: bounded worker.
- [ ] T8 Run final typecheck/build/tests and browser checks of critical flows. Route: delegated verifier.

## Acceptance
- Existing mock-backed flows and current persistence behavior retained.
- Migrated UI does not directly import mutable fixtures or access localStorage.
- No role screen imports another role screen for reusable logic.
- Shared domain data has explicit owner; cross-feature operations use public boundaries.
- App navigation payloads typed, ephemeral UI state local.
- Functional checks pass or explicitly documented baseline/environment blockers remain unresolved.

## Progress and evidence
- Preflight: ancestor C:/.git caused dubious ownership; project had no .git. User authorized project-only git init. Exact root now resolves; no global config changed.
- Runtime: Node v24.20.0; npm 12.0.2. `npm ci --ignore-scripts --no-audit --no-fund` succeeded (344 packages).
- Baseline: `npm run lint` passed (tsc --noEmit); `npm run build` passed (frontend + server). No source mutations; verifier SHA256 snapshots matched across 104 project files.
- Nonblocking baseline warnings: deprecated node-domexception@1.0.0; JS chunk 1953.18 kB minified / 508.06 kB gzip exceeds 500 kB advisory.
- No configured tests/runner or browser automation exposed. Chrome/Edge exist; no visual checks performed.
- T1 complete. Initial snapshot: 4a6940f98038cd49e2811d0930d5b90ccd752ad0 (`chore: establish verified frontend baseline`) on refactor/frontend-modules. Root snapshot contains existing application, not refactoring delta.
- Safety: known credential-pattern scan flagged no paths; not exhaustive privacy assurance. .atl/.codegraph ignored. .env.example left untracked and excluded from snapshot; no environment values disclosed.
- T2 implementation complete. Worker initially stopped with no edits because build output was outside its allowed surfaces. User approved parent-owned build verification. Worker runs tests/typecheck/diff check; parent delegates build separately after implementation. Submission replacement currently synchronous/in-memory; no subscription mechanism. Preserve current teacher active grading behavior (local setter), do not silently unify legacy grading paths.
- Runner decision: use existing tsx + node:test for pure characterization; no additional test dependency initially. Browser interaction coverage pending.

- T2 implementation returned: feature-owned domain types/fixtures/synchronous repository/delivery operation/theme helper and legacy live compatibility exports. 3/3 characterization tests passed before migration, unchanged tests pass within 20/20 after. `npm run test`, `npm run lint` and final `git diff --check` pass; initial whitespace issues corrected. No new dependency.
- T2 independent verification complete: `npm run test` 20/20, `npm run lint`, `npm run build` and `git diff --check` passed. No source-caused semantic regressions found: synchronous single owner/live compatibility, exact fixture/theme preservation, unchanged defaults and active-vs-legacy grading semantics. Initial native assessment unassessable due untracked selection (high verification route); selected all 11 new classroom paths, excluded unrelated .env.example.
- Native T2 review: medium tier, one reliability lens; lineage review-119b9d7494b9570b approved without correction, exact acknowledgement completed (authority burned), target sha256:a6202ae7106a39310bad142bb50ba7182af3dca73e2578f3701ded4414a50ae5, consumed revision sha256:79c07d5bbf38d2ec193ac72b22eab38d0fe40a28526c7a8ed0083d26b5989299. Native logical changed lines 558 includes tracking; worker scoped diff 542. Browser checks pending.
- T2 committed slice: baseline 4a6940f98038cd49e2811d0930d5b90ccd752ad0 → c4042cb66f355023f3144095bf9a5938a8dca081 (`refactor(classrooms): encapsulate mock submissions and theme`), 18 files +402/-140. Parent staged-file whitespace check also passed including new files. Follow-up classroom flows belong to T3; no push/PR.
- T2 scoped structural implementation closed; UI/browser acceptance explicitly deferred to T8, not claimed performed. Blank guard inspected unchanged, not interaction-tested. Nonblocking build warning remains (1953.28 kB JS / 509.24 kB gzip). No failing required command remains.

## T3 progress
User authorized proceeding with T3. Task file and full Engram mirror reconciled; branch refactor/frontend-modules at 5b07c0b, only intentionally untracked .env.example. T3 in progress: read-only mapping returned five sequential slices T3a–T3e. T3a/T3b/T3c verified and committed; T3d in progress. T2 behavior/contracts remain intact; messaging coordination changes remain T4. Features use existing application/ layer, not a second operations/ layer. Source baseline for T3a: 5b07c0b.
- T3a: catalogue/type/fixture owner, synchronous membership and live compatibility; student join/read uses public boundary. Delta +412/-116 (528), including 208 test lines and 46 documentation lines; coherent ownership/compatibility remains one slice.
- T3a characterization: worker5/5 legacy before/after; suite35/35 after correcting expectation (Materia Vinculada includes Mat => orange; implementation unchanged). Independent verifier35/35 twice, lint twice, build/diff pass; no semantic regressions, exact fixtures and T2 preserved. Browser invitation refresh pendingT8; no messaging workflow changed.
- T3a stable window:121-file snapshots matched hash1c0af90fe28922f6f760925508a1f27f9b3a6e7bdabde1cd07ef01c7d8a2f802. Earlier task-doc drift acknowledged parent metadata before window, not claimed unchanged. Freeze ALL candidate files including tasks before future verifier dispatch.
- T3a native medium reliability review approved/acknowledged authority burned: review-1e12c2a800d60270, targetsha256:68483be43b3a05d8ad17208d42ba8ec9a16a1dc12c06fedcc19fc14a5ba1f536, consumedsha256:00ce167523cce7e2815efc8d81208b37627027f36d41ff1270309fd5f7ffa85e.
- T3a commit5683e08351afd2a2483acf5da31d48145c94a1f3 (`refactor(classrooms): encapsulate catalogue and membership mocks`), base5b07c0b, +412/-116. No publishing. Build advisory1953.98kB JS/509.56kB gzip nonblocking.
- T3b implementation returned: teacher list140 lines, creation dialog457, page-mounted hook75; pure creation operations/contracts/fixtures and9 tests. View removes706 lines; unchanged detail/legacy panel section per baseline comparison. Scoped delta+1007/-709=1716, mostly coherent JSX relocation, exceeds estimate; don't compress or omit tests. Dialog remains sizable responsibility; further visual decomposition subject to T3e scope.
- T3b worker checks44/44 tests twice, lint/diff twice pass. No runnable pre-migration pure creation test; source comparison matched fields/palette/curriculum/JSX. Original2200/1800ms uncancelled timers/captured snapshots/reopening and file-input lifetime intended unchanged; NOT browser-tested. Source baseline17d9557.
- T3b independent44/44 tests, lint/build/diff pass; no source-caused regressions found. Stable128-file freeze hash80aff50f7c3c02bf983e715a8d4bb8da6210a0e1934c039589030873e1fe2bec. Detail/legacy2108-line suffix unchanged. JSX/lifetime/presence compared; browser unverified. Original stale timers/overlaps preserved, not fixed.
- T3b native medium reliability review-dbfc9d6ecd55bad9 approved/acknowledged burned; targetsha256:098fcdf1cde09806b41b2798b585b7e3e283907da07211124f427a0d1c488e55, consumedsha256:4d2daadad5e731a618f56fc04113e0a3447941d53673127f3d473b36314725a3. Nonblocking informational R3-orchestration-coverage hooks/useTeacherClassroomCreation.ts:56–64, follow-upT8; no correction/reopening.
- T3b commit54eb969f3a44194ea247651329b72a8568969557 (`refactor(classrooms): separate teacher listing and creation flow`), base17d9557. Build advisory1954.90kB/gzip510.13. No publishing.
- T3c implemented, independently verified and committed.14paths+712/-274=986, activities-only scope (coherent lists/contracts/tests beyond advisory estimate). Domain-owned synchronous activity repo/live mockData aliases, pure creation/assignment/student mappings, actual teacher/student lists and modal contract extraction.5/5 legacy tests before/after; suite58/58, lint twice/diff twice pass. Separate student fixtures intentionally not synchronized to teacher/copilot assignments. Existing1800/1600ms timers/reset/callbacks/selection/detail/grading semantics preserved per worker. No new dependencies. Freeze all candidate files including tracking BEFORE verifier dispatch.
- T3c activities owner and actual activity list/assignment composition. Corrected render map: active TeacherActivityDetail imported23/rendered503; embedded ActivityDetailView1061 is not evidenced as used. Do not move legacy code as active; preserve until explicit verified cleanup underT3e.

- T3c independent58/58 tests/lint/build/diff pass,136-file hash1ac4c86af7d08a6a396420adf6c0a46cb22faaf4f3023b4edfba2eb8883cab53 unchanged. No source regression; modal/list/fixtures/copilot/active grading/dormant suffix preserved. Build advisory1955.75kB/gzip510.37; browserT8 unperformed.
- T3c native medium reliability review-de8597e51c7207d2 approved/acknowledged burned; consumedsha256:7209d9785ff40181ce50d39fcfe1f85e590576390d87745a985f00895812b8a9. Informational suggestionR3-list-contract-coverage TeacherActivityList.tsx:10 for futureT8, no correction/reopening.
- T3c commitd669ca9b013a431904f606ac593697cab72277b7 (`refactor(classrooms): encapsulate activities and role lists`), base657b6f3. No publication.
- T3d in progress: muro ownership/operations and participant role presentation, preserve messaging callbacks/roster snapshots and mounted local muro state. Exact participant owner to be determined by bounded worker before extraction; no messaging workflow change.

## Next step
Dispatch T3d bounded writer, tests before mock migration; update evidence BEFORE verifier dispatch then freeze all files. T3e/browserT8 pending. Browser checks remain pending under T8. T2 native review acknowledged; do not re-query burned lineage.
