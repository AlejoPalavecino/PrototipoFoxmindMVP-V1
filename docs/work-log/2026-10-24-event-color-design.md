# Agenda event color — architectural contract

- Agent / role: `/root/event_color_design`, architect, documentation only.
- Session or task ID: `/root/event_color_design` (actual task path; registered host identity unavailable).
- Date: 2026-10-24.
- Branch / worktree: `codex/foxmind-agenda`, `C:/Users/alejo/.codex/worktrees/foxmind-agenda/ProtipoFoxMind`.
- Starting commit: `3784894e241477b3502dbc2c157c2d75d7b61fcf`.
- Phase / task: Agenda follow-up, [event color contract](../../odd/tasks/agenda-event-color.md).
- Status: completed.

## Request and scope

Define the minimal shared contract before RED for optional, persisted private-event color. The coordinator reports human authorization to implement in the existing worktree, preserve prior events/preview data and keep changes local. Own only the task contract and this work record; no production, tests, shared roadmap or memory writes. Other agents have disjoint scopes; preserve their changes.

## Work performed

Read the roadmap, work-record protocol, Agenda and compact-event-form task documents, functional-spec Agenda sections, public domain/UI/API barrels and the exact affected domain, draft, renderer and SQL persistence files. Applied `sdd-ambiguity-gate`, `clean-architecture`, `team-docs-strategy` and documentation guidance from `cognitive-doc-design`.

Observed a relational `AgendaEvent` model and explicit event-row/repository SQL; there is no event JSON field to reuse. Optional finite tokens plus one nullable checked column are the minimal durable change. Existing omitted-color serialization and idempotent PUT identity must remain intact. Wrote the exact domain/UI interfaces, nullable migration, palette, CAS/series invariants, disjoint ownership and RED criteria in the task contract. The coordinator reported successful fetch (not run by this agent), migration-name reconciliation and ownership of preview handling.

## Verification

- Read-only Git commands observed branch `codex/foxmind-agenda`, HEAD above and only the coordinator's untracked work record at inspection time.
- `rg -n` located explicit migration inventories in the shared P4 runtime and P4/P5/P8 integration tests; reported exact paths to the coordinator.
- One initial CSS `rg` placed `--glob` after `--`; it emitted argument-path errors while still finding tokens. Corrected `rg -n --glob '*.css' -- '<token pattern>' apps` succeeded and confirmed ink `#202522` and existing automatic category colors.
- Pure JavaScript relative-luminance calculation observed text/background ratios 12.76–14.17 and accent/background ratios 5.49–7.39 for the proposed six colors. This is palette arithmetic, not browser/pixel acceptance.
- PowerShell per-file structural check exit0: task125/record35 lines (<200 each), no trailing whitespace, balanced fenced blocks and all Markdown local targets exist. `git diff --check` exit0 concerns tracked changes only because these files are new/untracked. No functional tests are necessary for this documentation-only contract; RED/GREEN and real UI verification belong to subsequent assigned owners.

## Commits and outcomes

No commit created by this agent. No product behavior, migration, database, preview process or retained data changed.

## Handoff

ESTADO_DISENO: LISTO_PARA_TDD_RED. Contract and readiness were sent to `/root`. First unfinished product task: `test_runner` creates failing `tests/agenda-event-color-{contracts,model,view,database}.test.mjs` before implementation. Worker A owns domain/SQL/API, worker B draft/UI and its barrel, coordinator scripts/preview/shared roadmap; neither worker edits tests. Keep the original preview instance intact; the coordinator plans a separate updated preview because its in-process original API has no safe hot-reload channel. No critical ambiguity remains.
