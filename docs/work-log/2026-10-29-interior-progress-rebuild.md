# Classroom progress reference — implementation handoff

- Agent/role: `/root/interior_progress_rebuild`, slice worker.
- Session identity: unavailable for memory writes. Date: 2026-10-29.
- Branch: `codex/inicio-reference-astra`; base: `dd622f9`.
- Status: in_progress until integrated visual QA and coordinator approval.
- Scope: reference #6, current frontend Progress with existing read-only data and roles.

## Work

`apps/classrooms-ui/Progress.tsx` now presents real completion and average values in circular indicators, counts in a compact legend, real plan progress in a bar, and current students in responsive rows. No histogram, last activity, student status, new API or unsupported action is invented. Null percentages/averages retain explicit empty states. Historical member scope, abort/refresh behavior and individual activity list remain unchanged. `apps/classrooms-ui/interior-progress-reference.css` supplies scoped desktop/mobile presentation; coordinator connects it globally.

## Verification and handoff

`node --test --test-reporter=dot --test-concurrency=1 tests/p8-progress-calculation.test.mjs tests/p8-progress-client.test.mjs`: 6 PASS, exit0. `node node_modules/typescript/bin/tsc --project apps/web/tsconfig.json --noEmit --incremental false`: exit0. Both entrypoints use pure calculation/injected client only. No tests modified, no DB or provider access. Context7 resolve for React returned monthly quota exceeded; no new external API or dependency used. Boundary lint configuration not confirmed; one attempted `rg` with Windows glob path failed, no linter run. Browser visual QA pending coordinator/tester. Next: import CSS and inspect all scopes with synthetic data at desktop and mobile.

Follow-up: added compact student list column labels and delivery status derived only from actual pending/expected/re-submission counts; no-activity state is explicit. Preserved coordinator's separate guidance panel. Desktop is four columns, mobile stacks. Re-ran the same six safe tests and web TypeScript: both exit0. Tester must verify layout and status wording in live fixture.
