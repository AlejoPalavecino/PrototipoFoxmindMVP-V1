# Academic folder presentation — In progress

- Agent / role: academic presentation writer (`slice_worker`).
- Session or task ID: `/root/folder_academic`.
- Date: 2026-10-22.
- Branch / worktree: `codex/folder-style-platform`, `C:/Users/alejo/.codex/worktrees/foxmind-folders-implementation/ProtipoFoxMind`.
- Starting commit: `0bcb7d48dac76d49aa8e89b3ac76b32b03515425`.
- Phase and detailed task/spec links: [architecture handoff](2026-10-22-folder-architecture.md), [mockups](../design/foxmind-platform-mockups/README.md), [functional spec](../foxmind-v1-functional-spec.md).
- Status: completed (assigned presentation markup only).

## Request and scope

Coordinator assigns presentation-only Plan, Library and Activities changes. Preserve every existing handler, API, permission branch, state and form field. No CSS, tests, API/backend or commits. Concurrent writers own other surfaces; preserve their edits.

## Work performed

Read roadmap, work-record protocol, architecture handoff, clean-architecture skill, the three components and six teacher/student mockup PNGs (10, 13, 14, 18, 20, 21). Existing files are long state owners; scope is native disclosure markup and row grouping rather than rewriting their state machines. Requested test_runner coverage through coordinator before implementing disclosure branches.

## Verification

Inspected actual status and starting HEAD. Concurrent changes exist outside assigned source files. A package inventory attempted `apps/classrooms-ui/package.json`, which does not exist; root package defines runtime/scripts instead. No product checks performed yet.

## Commits and outcomes

No commit or publication.

## Handoff

Implement native disclosures while keeping active upload status outside collapsed content, then run focused client tests and strict TypeScript. Coordinator owns shared stylesheet and browser acceptance.

## Implementation outcome

- Status: completed for assigned presentation markup; complete candidate browser/runtime acceptance remains with coordinator and independent tester.
- `apps/classrooms-ui/Plan.tsx` (89 lines): native details/summary around unit/topic rename, reorder and deletion plus add-topic form. Form descendants remain mounted. Topic label, badge and state selector remain outside disclosure, with equivalent busy disable behavior; add-unit and plan file/version controls stay visible. Existing handler bodies, requests, keys, authorization and confirmation remain unchanged. Header/row classes support shared folder CSS.
- `apps/classrooms-ui/Library.tsx` (117 lines): file selector under native 'Publicar material' disclosure; upload error/loading notice, file review status/action and ready metadata/publication form remain outside. Material rows separate metadata and actions; no files, rules or actions removed.
- `apps/classrooms-ui/Activities.tsx` (94 lines): row/content/action classes only. No artificial filter, status, count, API or business logic added.
- Coordinator explicitly instructed proceeding without new mirror tests for this reversible presentation change. No test file edited. Existing state-owner functions exceed the new-function cohesion guideline before this task; no new function or general refactor was introduced.
- Context7 consulted React resolution and `/react/react/v19.3.0` docs before JSX edits (installed React is 19.3.1; no newly invoked React API).

## Observed checks

- Baseline: `node --test --test-reporter=dot tests/p5-ui-client.test.mjs tests/p6-library-client.test.mjs tests/p7-authoring-client.test.mjs` — exit 0, 5 PASS; classrooms strict TypeScript — exit 0.
- After implementation: `node node_modules/typescript/bin/tsc --noEmit -p apps/classrooms-ui/tsconfig.json` — exit 0.
- After implementation: `node --test --test-reporter=dot tests/p5-ui-client.test.mjs tests/p6-library-client.test.mjs tests/p7-authoring-client.test.mjs tests/p7-participation-client.test.mjs` — exit 0, 6 PASS.
- `git diff --check -- apps/classrooms-ui/Plan.tsx apps/classrooms-ui/Library.tsx apps/classrooms-ui/Activities.tsx` — exit 0.
- Root package has no linter command/dependency/config discovered; no linter PASS claimed. Full production build, real role/permission/API/browser checks and desktop/mobile captures were not executed by this writer.
- Two exploratory `rg` path globs were rejected by Windows path handling; corrected to directory plus `-g` and inspected shared folder class rules successfully. These were inventory commands, not product failures. No compile/test failure or circuit breaker activation.
- Final production diff: 3 files, 25 insertions / 22 deletions, preserving concurrent edits elsewhere.

## Final handoff

No commit, push, CSS or roadmap edit. Coordinator should validate expanded/collapsed form keyboard behavior, visible topic selector/state, Library pending/rejected/approved publication state after closing disclosure, and row layout at narrow widths in the shared folder cascade. New row styling hooks: `folder-plan`, `folder-plan-file`, `folder-disclosure`, `folder-topic-row`, `folder-row-content`, `folder-row-actions`. First remaining action is independent live visual/functional acceptance of the combined candidate; this record does not mark a product phase complete.
