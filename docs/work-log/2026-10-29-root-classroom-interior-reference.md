# Classroom interior references — in progress

- Agent / role: `/root`, coordinator.
- Session or task ID: `/root`; runtime memory registration unavailable.
- Date: 2026-10-29.
- Branch/worktree: `codex/inicio-reference-astra`, isolated worktree.
- Starting commit: `5ff88e5`; clean working tree observed.
- Phase/task: redesign existing classroom interior against eight user screenshots.
- Status: completed locally, with verification limits below.

## Scope and work

User requests following AGENTS.md delegation and assigned models from now on. Explorer and architect dispatched with their configured roles. Preserve real classroom behavior and data contracts; reference screenshots guide presentation, not invented user data. No publication or deployment requested. Existing work and previews remain intact.

## Verification and handoff

Architecture preserved existing APIs and deliberately excluded unsupported mock-only actions. Explorer returned without its requested inventory; architect completed the map and design. Library search was tested RED (1 pass/1 fail), then GREEN (3 pass), including a changed deep link while a filter is active. Coordinator observed `node --test --test-reporter=dot --test-concurrency=1 tests/classroom-library-search.test.mjs` exit0 and `node node_modules/typescript/bin/tsc --project apps/web/tsconfig.json --noEmit --incremental false` exit0. Isolated `node .test-artifacts/build-wizard-reference.mjs` exit0 compiled production routes. Four progress calculation tests passed according to implementation worker. Wall's older test could not start because its `.build/api` dependency was unavailable; no DB suite was run.

Independent reviewer found selector ancestry, activity cascade and library deep-link issues; workers corrected them and reviewer returned no findings on the corrected code and final CSS delta. UI tester inspected eight desktop tabs and 320/390 viewport layouts with synthetic ports; no horizontal overflow, mobile invitation dialog usable, student/archived/empty/error/loading states observed. QA confirmed corrections to header placement, breadcrumb, badge contrast, wall width, progress values and roster columns. History populated state was not available. Captures were inspected in memory and not retained, so no durable screenshot comparison is claimed. Synthetic server restarted as session26302 at `http://127.0.0.1:53196/classroom?mode=teacher`; it rejects mutations. No authenticated backend, provider or publication verification. Memory writes unavailable until authoritative registration.

Read-only reports attributed to `/root/explore_classroom` (incomplete initial inventory), `/root/classroom_tests` (RED/GREEN and synthetic UI QA), and `/root/classroom_review` (two review passes); they did not write product source or this record. Detailed writable-agent records and fixture README remain alongside this record. Working scope and verification are local to the isolated branch; no push/deployment.

Product unit committed as `17c85e8`; staged whitespace and Gitleaks checks passed. After QA's server interruption, coordinator restarted synthetic listener53196 and restored desktop view in Ego Space4; `finish({keep:['p1']})` returned successfully. Fixture and agent handoffs follow in the closure unit; its own commit identity is recorded by Git.
