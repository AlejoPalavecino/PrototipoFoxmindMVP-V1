# C5 extraction UI — GREEN implementation

- Agent / role: ai_ui_green / slice_worker
- Session or task ID: /root/ai_ui_green
- Date: 2026-10-23
- Branch / worktree: codex/classroom-gemini; classroom-gemini/ProtipoFoxMind
- Starting commit: ed06f885bfbf08725024013a7a45c9a3a723cfc7
- Phase/task: [C5 classroom AI extraction](../../odd/tasks/classroom-ai-extraction.md)
- Status: in_progress

## Request and scope
Implement the RED-tested extraction client and minimal wizard composition: automatic saved/approved source start, cancelable polling, editable separate proposal, explicit replacement confirmation and serialized apply. Preserve manual flow and other workers' changes; no tests edited or commits/publication.

## Work performed
Read contract, C5 tests, wizard/API, roadmap, work-record instructions and clean-architecture skill. Consulted Context7 React 19.3.0 lifecycle/ref documentation (installed 19.3.1). Observed existing autosave captures snapshots before enqueue; integrating apply requires capturing at execution to prevent old snapshots overwriting applied units.

Implemented `apps/classrooms-ui/extraction-client.ts` (108 lines), `use-plan-extraction.ts` (55), `ExtractionEditor.tsx` (49), `PlanExtraction.tsx` (30), and `extraction-messages.ts` (18). Updated existing `Wizard.tsx` (569 total lines) minimally for source lifecycle and shared save/apply serialization; updated existing `styles.css` (784 total lines) with 12 scoped responsive lines. No test files changed.

Proposal editing stays separate from draft units, persists while navigating wizard steps and requires explicit replacement checkbox. Apply updates local revision/payload before releasing the shared save queue. Cancellation aborts polling and ignores late transport; it does not promise cancellation of an already submitted durable job. Disabled/error extraction remains nonblocking; manual editing remains available. Enter in proposal fields does not submit the surrounding wizard form.

Condensed `vercel:react-best-practices` review completed: primitive effect dependencies, controller/timer cleanup, lazy editor initialization, latest callback refs and separate components. The shared domain barrel remains required by project architecture; no new React dependency added.

## Verification
Coordinator supplied observed RED7 missing-module baseline. Observed checks:
- `node --test --test-reporter=dot tests/classroom-ai-ui.test.mjs`: PASS 7.
- `node node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json --incremental false`: exit 0.
- `npm run web:build --silent`: exit 0; Next 16.4.2 production compilation and page generation succeeded.
- `node --test --test-reporter=dot tests/classroom-ai-ui.test.mjs tests/p5-ui-client.test.mjs tests/p5-web-client.test.mjs`: PASS 18.
- `git diff --check`: exit 0; unrelated dependency files emitted CRLF notices only.
- Linter: unavailable; repository defines no lint script/config/tool. No linter PASS claimed.
- Engram save attempted; runtime hook rejected with `Codex host session is not registered; start a new Codex session to register it.` Repository record remains durable evidence; no new session invented.
- Live/browser verification is independent coordinator/test_runner work and remains pending for overall C5 acceptance.

## Commits and outcomes
No commit.

## Handoff
Coordinator can start ego live against composed backend. Check automatic start after approved/save, reopening dedup, edits preserved across back/forward, manual units while proposal arrives, explicit replacement/apply followed by autosave/review, disabled/manual fallback, source change during pending response, mobile keyboard/layout and polling cleanup on exit. No whole-phase completion claimed; no commit or publication.

## Follow-up: Next extraction proxy
Coordinator delegated correction of live 404 at the strict Next classroom proxy; test_runner observed RED3 in `tests/classroom-ai-proxy.test.mjs`. Scope is `apps/web/src/lib/classroom-proxy.ts` and this record only. Preserve exact start/retry/apply DTOs and existing route/method/query/boolean strictness. Reviewed tests, shared domain parsers and backend extraction HTTP routes. Implementation and fresh checks pending. Engram writes remain unavailable and are not retried.

Added four explicit route/method rules and validation through shared `parseStartExtraction`, `parseRetryExtraction`, and `parseApplyExtraction` in `apps/web/src/lib/classroom-proxy.ts` (320 lines total; pre-existing large file). Forwarded bodies remain byte-for-byte unchanged; no extra confirmation field or general schema relaxation. New helper is 8 lines; no tests changed.

Follow-up observations:
- Focused `node --test --test-reporter=dot tests/classroom-ai-proxy.test.mjs`: GREEN3, exit 0.
- `node node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json --incremental false`: exit 0.
- `npm run web:build --silent`: exit 0, complete Next production output, ready for live host restart.
- `git diff --check -- apps/web/src/lib/classroom-proxy.ts`: exit 0.
- Earlier combined extraction/P5-proxy regression: 8 passed, 1 failed in existing `unknown paths/queries/methods/schema/encoding and excessive JSON never reach upstream`, with `TypeError: fetch failed`, cause `Error: read ECONNRESET`, errno `-4077`, code `ECONNRESET`, syscall `read`, at `TCP.onStreamRead (node:internal/stream_base_commons:216:20)`. Shell ended exit 0 because a later successful typecheck followed that command; test output explicitly failed. Body rejection logic was not edited. No blind retries or unrelated fix performed; coordinator notified to obtain independent baseline/triage.

Proxy implementation and required focused checks are complete. Overall record stays `in_progress` until the newly observed regression is independently resolved/attributed. Handoff: restart web against new build for live extraction; test_runner isolates the P5 oversized-body regression. No commit/publication.
