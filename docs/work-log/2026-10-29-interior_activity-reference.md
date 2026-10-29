# Classroom wall, activities and progress — in progress

- Agent / role: `/root/interior_activity`, slice worker.
- Session/task: `/root/interior_activity`; runtime memory registration unavailable.
- Date: 2026-10-29; branch `codex/inicio-reference-astra`; base `5ff88e5`.
- Scope: visually adapt existing classroom wall, activities and progress to selected references; preserve existing behaviors and real data.
- Status: in_progress.

## Work and handoff

Inspect existing components and scoped styles, implement presentation, then run safe targeted checks and report to coordinator. No tests, backend, real data or other agents' files will be modified. CSS import and shell ownership remain with coordinator.

## Result and checks

Changed `Wall.tsx` (120 lines) to use reference heading and a participation-guidance aside, retaining post/reply actions. Changed `Activities.tsx` (106 lines) to expose existing activity status as a styling class. New `interior-activity-reference.css` (87 lines) scopes warm responsive layouts for wall, activities and progress to `.classroom-interior-reference`; `Progress.tsx` and all business data remain unchanged. Existing API usage is unchanged; no new external library API was introduced.

`node node_modules/typescript/bin/tsc --project apps/web/tsconfig.json --noEmit --incremental false` exit0. `node --test --test-reporter=dot tests/p8-progress-calculation.test.mjs` exit0, four cases passed. `git diff --check` exit0. Focused wall test did not start because `.build/api/apps/api/src/classrooms/http.js` is absent (`ERR_MODULE_NOT_FOUND`); diagnostic rerun reproduced the missing build artifact, without trying to change it. Boundary linter unavailable: `node_modules/eslint-plugin-boundaries` absent. No database or external service used.

## Handoff

Coordinator must connect stylesheet/root scope and run integrated visual QA plus appropriate wall/activity coverage. Existing changes and this record remain local; no commit or publication. Component functions predate this work and exceed the recommended 40-line size in places; no expansion of business logic was attempted. Final acceptance depends on integration and visual verification.

## Reviewer cascade correction

Strengthened activity-list selectors with `.fm3-classrooms.classroom-interior-reference .p5-main .p7-activities` so they outrank existing classroom and shared folder selectors. Set single-column list and explicit desktop row direction, with the existing mobile column direction retained. Parsed the stylesheet with PostCSS and checked the scoped selector exists (exit0); integrated computed-style/visual verification remains the coordinator's responsibility.

QA later found Muro constrained by `warm-polish.css` to1000px and progress-value font overridden by a more specific paragraph selector. Scoped wall width now resets that maximum and margin, and the progress value uses a stronger selector at30px. PostCSS parse and `git diff --check` pass; QA must verify computed values and responsive layout.
