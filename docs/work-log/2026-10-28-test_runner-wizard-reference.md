# Crear aula reference verification — preparation

- Agent / role: test_runner.
- Session or task ID: `/root/test_runner`.
- Date: 2026-10-28.
- Branch / worktree: `codex/inicio-reference-astra`; isolated foxmind-inicio-astra/ProtipoFoxMind.
- Starting commit: `7a742de70c766bea3e5557566dc341b9c2ff9742` (observed).
- Phase/task: [Crear aula reference](2026-10-28-root-wizard-reference.md).
- Status: in_progress.

## Request and scope

Prepare a real Wizard fixture for four-step behavior and visual verification, then contract-led RED/GREEN where new behavior warrants it. No product edits or commits. No database, Docker, environment/secret reads, real account/AI/provider requests or memory writes. Inspect complete test entrypoints and dependency closures before running any suite. Dedicated fixture53195 and a new Ego Space; preserve prior previews and finished Spaces.

## Work performed

Read coordinator/architect contract, current Wizard/PlanExtraction/extraction controller, API runtime and complete candidate test entrypoints. Safe allowlist: classroom-ai-ui imports only extraction-client with erased type-only dependencies and mocked API; p5-ui-client imports api.ts (no runtime imports) with an injected in-memory fetch. New tests use inspected componentWithPorts and a narrow owned hook runner: real Wizard/controller, stateless leaf expansion, mocked external extraction/cover/timezone ports. No broad or database/host/integration suites were selected.

## Verification

Observed RED command: `node --test --test-concurrency=1 tests/wizard-reference-drop.test.mjs tests/wizard-reference-navigation.test.mjs tests/classroom-ai-ui.test.mjs tests/p5-ui-client.test.mjs` —8 baseline PASS,6 new FAIL, exit1. Three failures are missing drop behavior, two missing disclosure controls and one missing review data-edit action. Worker notified immediately before implementation. Tests cover shared picker/drop transport, multiple/busy rejection, approved-file gate, collapse preservation/structural reset/invalid reopening, and review edits without mutation/publication.

Synthetic extraction/publication fixture routes must precede generic draft handling, with no upstream proxy. No database, Docker, secret/config or provider access occurred in this task's commands.

## Handoff

First unfinished step: finish typed fixture53195 while worker implements GREEN, then verify four-step browser flows and source/reference fidelity.
