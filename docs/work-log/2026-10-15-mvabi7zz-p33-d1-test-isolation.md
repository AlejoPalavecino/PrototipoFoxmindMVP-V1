# P3.3 T2 D1 — bounded outage-fixture isolation

- Agent / role: package implementation writer; no independent review authority.
- Actual task ID supplied by parent: `mvabi7zz-s-g0ea`; runtime session `01a1426d-bce4-76a7-b474-1c392f299599`.
- Date: 2026-10-15 (parent work-unit date).
- Branch / worktree: `feat/p33-identity-http`, current project root.
- Starting commit: `37ab57911c6f4cab1b3559b6394adbbbfc7684e5`.
- Phase/spec: [P3.3 T2 D1, S1–S7, actual L12](../../odd/tasks/p33-accounts-auth.md).
- Status: in_progress.

## Request and scope

User authorization, verbatim: "Cual es el inconveniento, te autorizo a que hagas lo necesario para terminar con T2". This assigned unit is only test-harness decontamination with explicit successful real HTTP socket-reuse coverage; production remains read-only. Parent owns D1 disposition, D2, shared feature/roadmap/index, independent verification, native assessment and Git. Only this writer is active.

Allowed writes: `tests/p33-identity-http.test.mjs`, `docs/identity-http.md`, this record, `.test-artifacts/p33-d1-isolation-*`, compiler outputs under `.build/api/**`. Preserve all pre-existing tracked/untracked work. No environment files, development DB/Mailpit, dependencies, frontend, speculative production changes or new historical-cause probes.

## Work performed

Before test edits, read the complete injected skill, roadmap, record protocol, whole feature including Log/L12, relevant functional-spec sections 2/3/12, account contract, actual test, runner/helper, mapper and sole correlated-capture reports. Observed branch/head match the parent; dirty D1 and metadata work pre-exists and remains preserved.

Source coupling confirmed: global application starts in `before`, all default `send` calls share its origin, some earlier success bodies are unconsumed and eight synchronous startup children execute before the outage case. This couples the SQL-outage assertion to unrelated fixture/client-pool history. It does **not** establish the historical ECONNRESET cause or justify a production fix.

Implemented bounded change in `tests/p33-identity-http.test.mjs`: dedicated application through existing `start` (configuration/pool/lifecycle unchanged), consumed healthy SQL-backed session/readiness warmup, same four pause requests/assertions on its own origin, actual observed socket-object reuse plus completed responses, healthy controls after unpause, global tracker closes each app once. Fetch/policies/timeouts unchanged; no request retries.

The existing observer now filters client sends to the dedicated server's port, captures immutable per-request phase/socket identity, and observes wire headers and response completion through Undici diagnostics. Assertions require exactly one send per phase, expected wire status, completed transport and no transport error. Each of the four outage requests must share the actual client socket object of a completed healthy warm request; this is not a comparison of coincidental client/server numeric IDs. Server response callbacks retain their original phase. Only constant labels, opaque IDs, booleans/status and allowlisted error codes are emitted. All subscriptions/request listeners are removed in finally; the app is not separately closed or removed from the global tracker. The original finally-unpause and helper-owned database cleanup remain.

`docs/identity-http.md` retains historical failure/follow-up evidence and documents test decontamination, exact coverage, correction/recheck limits and pending parent disposition. Production files, other records, feature/roadmap/index, shared runner/helper and all pre-existing unrelated work were not edited.

## Verification

- Historical parent RED supplied as evidence: original full D1 seam 20/21, ECONNRESET in unidentified outage request, cleanup0. No new RED reproduction authorized or attempted.
- Strict TDD not explicitly activated: RED/GREEN lifecycle not active; changed-fixture verification will be reported separately.
- Required once-only foreground command, outer budget ≤30s: `node scripts/test-p33-identity-http.mjs`, stdout/stderr preserved under `.test-artifacts/p33-d1-isolation-*`.
- Required command executed once, foreground/30s: `node scripts/test-p33-identity-http.mjs > .test-artifacts/p33-d1-isolation-mvabi7zz.stdout.log 2> .test-artifacts/p33-d1-isolation-mvabi7zz.stderr.log`. Exit1; compiler0; 20/21 pass; runner14295ms; owned cleanup0; stderr empty. My newly added healthy readiness control incorrectly expected `{status:'ok'}` instead of the existing `{status:'ready'}`. This assertion failed before pause; no outage/reuse result from this invocation. Original historical ECONNRESET remains a separate failure and was not reproduced here.
- One bounded correction: read the unchanged health controller, corrected only the healthy readiness expected body to `{status:'ready'}`. No production change or changed outage contract. A private runner copies the existing owned fixture/compiler invocation and filters to the outage plus ordinary health/404/body control only; no full-suite repeat, new capture, retries or timeout changes.
- Sole targeted recheck executed foreground/30s: `node .test-artifacts/p33-d1-isolation-mvabi7zz-recheck.mjs > .test-artifacts/p33-d1-isolation-mvabi7zz-recheck.stdout.log 2> .test-artifacts/p33-d1-isolation-mvabi7zz-recheck.stderr.log`. Exit0; compiler0; actual2/2 pass, no failed/skipped/cancelled cases; runner8206ms; owned cleanup0; stderr empty. No further test commands run.
- Targeted reuse evidence: warm-session uses client socket1, warm-ready socket3; both complete HTTP200 with consumed bodies. Paused session503 and live200 reuse socket1, login503 and ready503 reuse socket3. Each `client-reuse-confirmed` follows full original body/security assertions and observed response transport completion; matching server requests finish normally. Restored session/readiness both return200 with their exact healthy bodies, using the same sockets1/3. This verifies fresh-fixture real reuse, not the older idle-age scenario or historical reset cause.
- Final read-only inspection: `git status --short && git diff --stat` exit0; tracked dirty surface unchanged from entry; own record added among untracked files. Git emitted LF→CRLF advisory warnings for pre-existing tracked dirty files; no files were staged, restored or otherwise mutated by Git. This command does not diff the pre-existing untracked test/guide, which were read back explicitly.
- Prior diagnostic 2/2 and correlated 147-event pass do not establish historical causation or independent acceptance.

## Commits and outcomes

No Git mutation or commit by this worker. Fixture implementation and targeted proof delivered; writer handoff is **partial**, because the required full invocation failed on the newly introduced readiness expectation and was not repeated after correction. No native assessment/review or independent acceptance by this worker.

## Handoff

First unfinished action: parent reviews the exact isolated-fixture diff and retained failures, then owns the first full independent D1 verification and disposition. Only after actual D1 disposition should parent hand off D2; D2 was not implemented here. No D1 approval, T2-seven-operation completion or P3.3 completion claimed.

Limits/risks: original ECONNRESET request and cause remain UNKNOWN; no production fix is justified. Isolation intentionally excludes unrelated precursor fixture history but does not change production idle/connection behavior or prove the prior idle-age scenario safe. Healthy public warmup establishes a usable SQL pool before pause; it is not internal tracing of every later DB connection. All four pause HTTP calls explicitly reuse successfully warmed sockets rather than proving statuses only on new connections. Independent scrutiny must assess whether that coverage is adequate. Risk2/4/5 remain parent-owned/open; their definitions were not supplied to this worker, so this report does not invent or close them. No new historical-cause probes/captures, dependency/database-baseline/security sweeps or D2/T3 acceptance were attempted.
