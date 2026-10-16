# P3.3 T3-V — Verification/resend candidate, partial proof

- Agent / role: bounded serial implementation writer.
- Task ID: mvb7th8c-9-alnm; writer session 01a145a9-e0a9-7405-b2f7-1172d3a9a059.
- Parent session: 01a14539-ab7b-77dc-8eee-546a8c3dd168.
- Date: 2026-10-16.
- Branch / worktree: feat/p33-token-flows / shared repository.
- Starting commit: 33fd80f62b9735e43124dc2df1a4d12c81f01c8a; source base 2c1b4df.
- Phase / tasks: P3.3 T3-V, odd/tasks/p33-token-flows.md S1–S2/S5–S7; main P3.3 S1–S7.
- Status: in_progress / partial handoff; required confirm RED unavailable, despite passing final checks.

## Request and scope

Implement only the two existing verification confirmation/resend contracts, with public HTTP/captured-mail tests and established build-once pipeline integration. No recovery/password/frontend/P4, new dependencies/schema/infrastructure, sensitive-file access or Git/native lifecycle actions. Public accepted implementation-status remains seven until parent acceptance. T2-only native opt-out is not T3 approval or waiver.

## Reconciliation

Read injected nodejs-backend-patterns and work-unit-commits skills before repository work, then roadmap/protocol, current parent/map/feature records, protected main feature specs read-only, functional sections 2/3/12, normative guide/OpenAPI verification operations, and scoped source/fixture/pipeline helpers. Also loaded cognitive-doc-design before the new guide. Actual branch/HEAD matched parent; initially only the two protected historical records were modified. Neither was written by this worker. Later inspection also shows parent-owned coordinator/feature updates, which this worker did not alter.

CodeGraph index is missing; initialization cannot write within this writer's allowed surfaces, so attributed map and scoped direct reads were used. No Git/tooling repair attempted. This record was created before any implementation/test writes.

## Work performed and changed paths

- apps/api/src/identity/runtime.ts: conditional single-use confirmation and existing-user resend, sorted user locks, authoritative session/verification rechecks, successful token-history cooldown, atomic invalidation/cancellation/encrypted enqueue; same-user rotation preserves original idle and absolute deadlines. Existing helpers/services/lifecycle reused.
- apps/api/src/identity/transport.ts and errors.ts: only the two contracted routes plus exact LINK_INVALID400 / EMAIL_ALREADY_VERIFIED409; shared security/error transport retained.
- tests/p33-verification.test.mjs: sixteen public-interface cases in two fixed groups of eight; actual registration/resend SMTP capture, token/session/account effects, races, boundaries and owned contention fixtures. No internal storage assertions.
- scripts/test-p33-verification.mjs: closed lazy confirm/resend CLI, existing owned database/inbox/actual compile prerequisite and 26s work/30s outer budget. No retries, redivision or bypass flags.
- tests/p33-verification-runner.test.mjs: standalone closed CLI, exact selection, preparation/failure cleanup and separate synthetic stream assertions.
- scripts/test-p33-t2.mjs and tests/api-build-pipeline.test.mjs: both groups inserted after D2 into real build-once sequential/fail-fast orchestration; synthetic order/fixture/default compiler/help expectations updated. No receipt/cache framework.
- tests/p33-identity-http.test.mjs, p33-registration-profile.test.mjs and backend.test.mjs: only two newly obsolete planned-404 route entries removed/replaced; remaining three T3 routes and every unrelated assertion preserved.
- docs/account-verification.md: candidate/partial operation guide and proof limitations. Public accepted status metadata/roadmap left untouched.
- This record: attributed scope, observations and handoff. Generated .build/api and .generated/prisma emitted only by authorized commands. Synthetic CLI fixtures remain in the granted .test-artifacts/p33-d2-plan-c2-mvb4asm3 subtree; no evidence-log file was created.

## Verification — exact commands, observed evidence

All commands ran serially in the foreground with tool timeout 30 seconds. Tool output is merged stdout/stderr, not separately captured log streams. Runners forward their child streams separately; pure synthetic tests assert exact streams/exits. No unobserved stream separation or elapsed build time is invented.

1. RED `node scripts/test-p33-verification.mjs --group=confirm`: exit 1, runner 4455ms, owned database cleanup exit 0; sanitized fixture unavailability before compiler/test output. No meaningful confirm RED was observed, cause unproven. No retry. This unavailable required proof forces partial status.
2. RED `node scripts/test-p33-verification.mjs --group=resend`: actual unchanged-T2 compilation exit 0; 8 tests, 0 pass, 8 expected missing-route failures (404 versus required statuses); test 2019ms, runner exit 1 / 6738ms. Owned inbox and database cleanup both exit 0.
3. `node scripts/build-api.mjs`: exit 0; actual Prisma7.10.0 generation exit 0 (209ms reported), strict API compilation exit 0. No weakening flags or dependency mutation.
4. GREEN `node scripts/test-p33-verification.mjs --group=confirm`: compilation exit 0, 8/8 pass, 0 failures/cancelled/skipped, test 8549ms; runner exit 0 / 13163ms. Owned inbox and database cleanup both exit 0.
5. GREEN `node scripts/test-p33-verification.mjs --group=resend`: compilation exit 0, 8/8 pass, 0 failures/cancelled/skipped, test 9167ms; runner exit 0 / 13766ms. Owned inbox and database cleanup both exit 0.
6. `node --test --test-concurrency=1 tests/api-build-pipeline.test.mjs tests/p33-d2-runner-options.test.mjs tests/p33-verification-runner.test.mjs`: exit 0, 18/18 pass, 0 failures/cancelled/skipped, 7395ms. Synthetic fixture files intentionally retained; their internal database cleanup markers and exact failure/stream assertions passed. No real Docker opened by these pure checks.

No failing final check needed correction, and no required command was retried. One rejected exact-edit tool call (nonunique no-op region) changed nothing; a corrected exact edit succeeded before build/GREEN. Initial safe inspection exited 0; final safe status/diff/count inspection exited 0 with existing Windows LF/CRLF Git advisories. These are not compilation/test failures. No broad suite/audit or combined real pipeline ran in this worker.

## S# self-review and limits

| Spec | Candidate coverage / observed evidence |
|---|---|
| S1 | Only authorized T3-V source/tests/docs changed; no recovery/password/frontend/P4 source, protected-record edits, publication or native inference. |
| S2 | Captured anonymous/same-user proof, no auto-login, wrong-account preservation and later usable proof, verified409, exact accepted/verified shapes; cookie/CSRF rotation, original absolute expiry and other-device continuity passed. |
| S5 | Invalid shape/canonical proof, Origin/CSRF/media/16KiB/sanitization/headers; expired-at-boundary/consumed/invalidated/wrong-purpose/unknown rejection; 59s denial/60s issuance, successful-anchor versus attempt-counter distinction, positive generic Retry-After/shared user/IP controls; queued stale cancellation and replacement mail, contention rollback/prior-proof preservation passed. |
| S6 | Conditional consumption, duplicate cross-instance race, resend/consume race and concurrent resend passed. Sorted user ownership/rechecks reuse established persistence; no demonstrated persistence/schema gap. Existing stale-password/login behavior was not rewritten. |
| S7 | Two fixed groups, meaningful resend RED, missing confirm RED retained, actual build/16 focused/18 pure checks observed. Differential public standalone/closed CLI controls pass; old assertions preserved apart from two intentional route expectations. Parent real combined regression and independent review remain required. |

Coverage advisories: expiry test seeds the expiry instant and observes the following request, not a mocked exact-time request. IP/redemption shared-limit tests use an operational smaller limit after prior real attempts; they do not exhaust all default60/30 slots. Wrong-purpose reset proof is rejected without verification/session/mail effects, but its later redemption usability cannot be publicly proven until the separately scoped recovery route exists. Public contention cases prove503, rollback, prior proof usability and healthy retry; no internal instrumentation claims which SQL statement failed. The idle case explicitly proves confirmation rotation does not renew idle; it does not separately age every rejected-confirmation category. Already-in-flight SMTP delivery races and stale-session mutation scheduling need independent scrutiny. No exhaustive security claim follows from passing tests.

## Commits, workload and handoff

No commits created; parent owns terminal Git, independent security/concurrency verification and native disposition/metadata. T3/P3 are not complete. The source/test/guide candidate is 644 authored changed lines excluding this record and generated output: tracked108 additions/15 deletions, new verification test353, runner controls78, focused runner50, guide40. Including this70-line record, the total is714 authored changed lines,314 over400; this cohesive workload is reported without compression. The independent verification/mail/transaction boundary should be reviewed as one serial work unit; no split was manufactured after tests ran.

First unfinished action: parent assess unavailable confirm RED and run `node scripts/test-p33-t2.mjs` once on this materially changed pipeline, then obtain independent security/concurrency proof and current candidate-native disposition. Preserve initial unavailability evidence; do not represent later GREEN as prior RED or accept nine-operation metadata before parent acceptance. Parent alone may authorize a distinct missing-proof investigation. Continue recovery only after this serial unit is dispositioned.

## Key Learnings

- Verification confirmation rotates the session binding without renewing either existing lifetime deadline.
- Successful token creation history anchors resend cooldown independently of shared attempt counters.
- Owned SQL contention can prove public rollback without reading persisted secret state.
- A passing final test cannot retroactively supply an unavailable preimplementation failure.
