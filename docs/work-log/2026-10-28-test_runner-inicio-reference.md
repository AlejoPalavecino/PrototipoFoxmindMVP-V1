# Inicio reference dashboard tests — completed bounded verification

- Agent / role: test_runner
- Session or task ID: `/root/test_runner`
- Date: 2026-10-28
- Branch / worktree: `codex/inicio-reference-astra`; `C:/Users/alejo/.codex/worktrees/foxmind-inicio-astra/ProtipoFoxMind`
- Starting commit: `9fa596c37774353390835eb41c7cb2f8d480644a`
- Phase and detailed task/spec links: Home presentation; [Home](../p9-home.md), [architect contract](2026-10-28-architect-inicio-reference.md)
- Status: completed

## Request and scope

Test-first coverage for truthful Home summaries, role grouping, preserved navigation, retry and pagination. Own test files and this record only. Browser QA waits for coordinator runtime handoff. No DB, environment secrets, external provider or publication.

## Work performed

Read AGENTS.md, roadmap checkpoints, work-record protocol, Home documentation, relevant navigation specification, existing presentation/copy/miniagenda/disclosure/education tests and TypeScript/hook test helpers. Preserved other agents' files. Applied subagent-minimal-contract instructions; no child delegation needed.

## Verification

Git HEAD observed as starting commit above. Dependency installation and baseline pending. Architect contract was in progress at first read; requested concrete test-facing contract.

## Commits and outcomes

No commit by this agent.

## Handoff

Next: coordinator reconciles review/build evidence, commits approved work units and owns the retained preview Space35/p2 and runtime lifecycle. No source implementation or publication was performed by this agent.

## RED and baseline evidence

- Initial dependency attempt was a coordination mistake: agent interpreted `npm ci completo con deps aisladas` as an instruction, although coordinator had installed dependencies and started its fixture. `npm ci --no-audit --no-fund` exited 1 with EPERM on loaded Next SWC; immediate baseline could not load TypeScript (five files failed before bodies). No product RED inferred. Coordinator stopped only its owned fixture and restored dependencies. No further dependency/process mutations by this agent.
- After repair, unchanged baseline: `node --test --test-concurrency=1 tests/home-polish-presentation.test.mjs tests/home-refinement-copy.test.mjs tests/home-miniagenda-reference.test.mjs tests/workspace-disclosure.test.mjs tests/education-experience.test.mjs` — 22 PASS, 0 FAIL.
- RED: `node --test --test-concurrency=1 tests/home-reference-dashboard.test.mjs` — 7 tests, 2 PASS, 5 FAIL: missing homeActivityStats twice, absent HomeActivitySummary, missing join shortcut and learning group. Existing five-classroom preservation/panel focus and inapplicable history passed. Worker notified after RED.
- First worker GREEN exposed a fixture defect: retry uses existing client.page, not read. Added page mock with exact module assertion; no product change or weakened assertion.
- Applied ego-browser skill; read complete v2.1 guide. Use existing task Space35/p2, no login/cookies. One tool orchestration hung before filesystem effects; terminated cell12 and verified no fixture files existed before retrying writes.

## Final work and verification

- Added meaningful tests for aggregate counts, unavailable/zero states, truthful summary, four shortcut callbacks and busy state, seven recoverable modules, classroom-target preservation, panel focus return and active teacher-room selection/fallback. At coordinator request the three summary tests moved unchanged into `tests/home-reference-summary.test.mjs`; composition remains in `tests/home-reference-dashboard.test.mjs`.
- Updated only the authorized old workspace test to locate the relocated HomeShortcuts, preserving callbacks; p9 greeting now asserts rendered text across the new highlight span, retaining identity and escaping assertions. Teacher-tool fixture whitespace was trimmed for label selection; no product change.
- New isolated fixture under `tests/helpers/home-reference/` supplies synthetic study/teach/mixed/none/archived/error/unknown/long/many/loading states. Fixture strict TypeScript initially exposed widened error literals; `as const` corrected the fixture and fresh strict check passed. The application PostCSS config was added before final QA.
- Final focused command and complete browser evidence are in [evidence README](evidence/2026-10-28-inicio-reference/README.md):37 PASS/0FAIL/0SKIP; `node node_modules/typescript/bin/tsc --noEmit -p .test-artifacts/home-reference/apps/web/tsconfig.json` PASS. Coordinator/reviewer own their independently reported build/review results.
- Separate legacy suites plus lifecycle produced10PASS/7FAIL. All seven legacy failures were reproduced from isolated `git archive 9fa596c`; an extra missing-styles export setup failure was fixed and its one check passed. Lifecycle5PASS remains unchanged: its shortcut0 assertion correctly belongs to aggregate failure, not first use.
- Final browser widths1784/1440/768/390/320: no overflow/clipped control text/visible targets below44px, images loaded. Keyboard callbacks/focus, four partial recoveries, role groups, null summaries, long names, loading, reduced motion and pagination5→8→return5/focus passed. Final desktop/mobile artwork recaptured after the last mask correction; [accepted desktop](evidence/2026-10-28-inicio-reference/accepted-mixed-1784.png) and [mobile](evidence/2026-10-28-inicio-reference/accepted-mixed-320.png) visually inspected.
- Added current report atop `design-qa.md`, preserving all earlier reports. No shared roadmap edit. No commit identity invented; coordinator owns commit delivery.
- Final relative-link check of this record and the evidence README passed; `git diff --check` passed (only an existing LF/CRLF conversion advisory for the worker-owned HomeShortcuts file).
