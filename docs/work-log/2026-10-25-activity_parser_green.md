# Activity document format isolation — GREEN

- Agent / role: /root/activity_parser_green, slice_worker.
- Session or task ID: /root/activity_parser_green.
- Date: 2026-10-25.
- Branch / worktree: codex/classroom-activity-ai (coordinator-provided context).
- Starting commit: not independently inspected; Git excluded from delegated scope.
- Phase/task: [real Gemini verification](2026-10-25-root-activity-gemini-main.md), [diagnosis and contract](2026-10-25-gemini_limit_diagnosis.md).
- Status: completed (assigned import isolation and scoped checks only).

## Request and scope

Implement format-local imports only in activity-document-worker.ts after coordinator-confirmed RED2FAIL. Preserve guards, messages, bytes, limits, resources and deadline. No test edits, build, Google, secrets, memory or Git operations. Other agents' changes remain owned by them.

## Work performed

Read the roadmap, work-record protocol, applicable activity source limits, worker, regression tests and diagnosis. Consulted Context7 for the existing pdf-lib API before implementation. The demonstrated issue is unnecessary cross-format dependency initialization; the original timeout cause remains unproved.

Removed the three eager format-specific imports. PDF now dynamically imports pdf-lib inside its branch. DOCX dynamically imports its two existing helpers using Promise.all after the PDF return. No parser calls, guards, return values, errors or messages changed. Production file is 20 lines; run remains below 40 lines. Test sources were not edited.

## Verification

- `node --test --test-reporter=dot tests/activity-document-format-isolation.test.mjs`: exit 0, two tests passed (DOCX real text/warnings with pdf-lib blocked; PDF real bytes/two pages with Word parsers blocked).
- `node node_modules/typescript/bin/tsc --project apps/api/tsconfig.json --noEmit --pretty false`: exit 0, no diagnostics.
- No test/compile failures occurred after implementation; circuit breaker was not triggered.
- No standalone linter script is configured in package.json; additional commands were excluded by delegated verification scope. No build or load acceptance claimed.
- Initial read attempted apps/api/package.json, which is absent; actual root package.json was then inspected. This was a read-path error, not a test/compile failure.

## Commits and outcomes

No commits within this delegated task.

## Handoff

Coordinator owns fresh build and comparable parsing-load verification before any main integration. Preserve earlier timeout failures and diagnosis uncertainty; passing import isolation does not establish the original timeout cause or full runtime reliability.
