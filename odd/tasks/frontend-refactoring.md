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

## Next step
T3 pending: map bounded remaining classroom flows. User requested closing T2 only in this turn; no T3 writer launched. UI/browser checks pending under T8. Native review acknowledged; do not re-query burned lineage.
