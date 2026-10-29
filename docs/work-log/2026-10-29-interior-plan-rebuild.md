# Plan classroom reference — in progress

- Agent/role: `/root/interior_plan_rebuild`, slice worker.
- Session/task: `/root/interior_plan_rebuild`; memory registration unavailable.
- Date: 2026-10-29; branch: `codex/inicio-reference-astra`; base `dd622f9`.
- Scope: refashion Plan workspace into compact unit list and selected topic panel while retaining existing plan management, teacher permissions, real topic status and real material/activity links. No API/DB or test edits.
- Status: completed for assigned Plan slice; integrated QA/review remains coordinator-owned.

## Verification and handoff

Rebuilt `PlanWorkspace.tsx` into a compact, selected unit card with actual taught/total progress and a small topic selection menu, while retaining mobile topic chooser, material and activity linking, status updates and all teacher management. Existing unit/topic order and role/archived constraints remain; the wall prompt in the screenshot has no topic-linked data contract and was not fabricated. Scoped `interior-plan-reference.css` adapts navigation and the two real resource groups; `Plan.tsx` remained unchanged.

`node --test --test-reporter=dot --test-concurrency=1 tests/foxmind-3d-flows-plan.test.mjs tests/workspace-disclosure.test.mjs`: eight PASS, exit0. `node node_modules/typescript/bin/tsc --project apps/web/tsconfig.json --noEmit --incremental false`: exit0. `git diff --check`: exit0. `eslint-plugin-boundaries`/lint script are not configured in package files; boundary lint unavailable. Context7 React lookup returned monthly quota exceeded; this slice reused existing React state and native HTML patterns.

Independent `/root/interior_visual_test` reported initial selected unit126px vs reference73px; compact topic menu corrected it to approximately74px. The tester opened the menu, chose another topic and observed “Tema 2 de 2” in live synthetic browser. Two real activities can extend content beyond the viewport; no content was removed to imitate screenshot data. Source: `apps/classrooms-ui/PlanWorkspace.tsx` (75 lines); stylesheet `apps/classrooms-ui/interior-plan-reference.css` (77 lines). No test, DB, provider, memory or remote publication changes. First unfinished task: coordinator integrates and independently reviews final eight-tab candidate.

## Follow-up: populated synthetic comparison fixture

At coordinator request extended only `tests/helpers/classroom-interior-reference/`: new `literature-data.ts`, updated `classroom.tsx`, `harness.mjs` and README. `mode=literature` supplies three units, six PDF materials, three supported activities, six current and two former synthetic students, two invitations, two posts and correctly shaped progress. No nonexistent product events or types are invented; all writes throw and no service or retained data is contacted. Existing modes are unchanged.

`node tests/helpers/classroom-interior-reference/harness.mjs` exit0; `node node_modules/typescript/bin/tsc --project .test-artifacts/classroom-interior-reference/apps/web/tsconfig.json --noEmit --incremental false` exit0. QA was notified to compare all eight screens at `http://127.0.0.1:53196/classroom?mode=literature`. This is synthetic frontend verification only; browser and final review are pending coordinator/QA handoff.
