# P7 consultation-only first TP opening — bounded B1 correction

- Agent / role: `/root/p7_consultation_fix`, bounded writer, not coordinator or independent verifier.
- Session identity: unavailable; actual task identity above, no invented session ID.
- Date: 2026-10-18.
- Branch / worktree: `codex/p7-activities`, managed `p4-p3-integration/ProtipoFoxMind`.
- Starting commit: `84b917ea3b9f9c3958aa342f4faed483da55420c`.
- Phase / specs: P7 T2/T7, S1–S3, [whole feature](../../odd/tasks/p7-activities.md), section 8 and L9/L29.
- Status: completed for this bounded writer correction and own focused proof; independent targeted B1 acceptance remains pending.
- skill_resolution: paths-injected; loaded nodejs-backend-patterns, work-unit-commits and cognitive-doc-design.

## Request and scope

First independent-verifier correction batch B1 only: actual current-student TP instruction opening must record the initial read-only DRAFT/content lock even when submission is not expected or reception is closed. Ordinary reads cannot reveal those instructions first or create an attempt. Preserve future first authorization on that same initial draft, archived write-free consultation, and existing security/editor/history constraints. No UI/schema/dependency change, P8, Git mutation, remote operation, native review or shared tracker edit.

Pre-existing dirty feature/coordinator records and attributed independent report are outside this writer's edit surface and remain preserved. Historical failed preparation and the latest successful default verification remain distinct; this correction does not rerun a full sweep.

## Work performed

Read the roadmap, work-record protocol, whole feature through L29, functional section 8, independent B1 report/probe, participation/file guards and existing controlled tests. Added a permanent controlled public-service/private-file regression and adapted the independent actual HTTP/browser reproduction into a versioned targeted integration test.

The single source correction batch removes expected-work gating from first TP instruction disclosure/start and direct file access while preserving membership/publication/obligation checks. Editor issuance still requires expected work and open reception. First authorization accepts only no attempt or a sole initial unsubmitted TP DRAFT, updates its applicable individual deadline in the same locked transaction, and preserves identity, number and confirmed data. Submitted/history/reopened rows stay rejected.

## Verification

- RED: `node --test --test-concurrency=1 tests/p7-consultation.test.mjs`, exit1, 16,062ms. Three meaningful leaf failures: `canStart=false` instead of true, direct private file read failed to reject, and explicit opening returned FORBIDDEN. Parent total 4FAIL, 4 dependent skips. Owned disposable SQL cleanup exit0. No source changes preceded this RED.
- Retained external scratch: `foxmind-p7-consultation-fix-lHJIqr` under the OS temp directory, containing exact RED stdout/stderr/result. No recursive cleanup.
- `node scripts/build-api.mjs`: exit0, 4,760ms; fresh Prisma generation and API TypeScript compilation both0 within the unchanged aggregate30s budget. One execution, no retry or limit increase.
- `node --test --test-concurrency=1 tests/p7-consultation.test.mjs tests/p7-participation.test.mjs tests/p4-session-bridge.test.mjs`: exit0, 16,731ms wrapper /16,668ms TAP;26PASS, fail0/skip0. Both owned disposable SQL cleanup routines reported0; no retained development fixtures/services were touched.
- New B1 controlled proof covers actual code enrollment after expiration, hidden nonmutating detail/session, private file read/status denial before start, teacher read, concurrent/idempotent one-DRAFT opening, unchanged eligibility/files/quota-custody/notification/grade state, content-save rejection with exact domain hash, closed consultation, future initial authorization preserving all confirmed attempt fields except the authorized deadline/update timestamp, explicit editor transfer, later general extension, expected TP/quiz preservation, private/foreign/current-revoked denial, actual submitted-history/reopening guards, and archived no-attempt write-free reads.
- `node --check` for both new test files: exit0. `git diff --check -- <seven allowed writer files>`: exit0. Fatal UTF-8 readback/no-BOM inventory7 passed; source/test/diff/guide/record read back. LF-to-CRLF Git notices are informational; no formatter or source normalization ran after the functional check.
- The new actual integration regression is syntax-checked but **not run by this writer**; fresh immutable targeted independent recheck belongs to the coordinator/verifier. No actual browser PASS or full-sweep repetition is claimed. No new unrelated finding was identified.
- External scratch retains RED/build/focused outputs/results, static checks and final writer SHA256 inventory. Only own SQL fixtures were cleaned by their ownership-checking helper; no OS recursive removal or other-agent cleanup was performed.

## Changed paths

- `apps/api/src/classrooms/activity-participation.ts` — disclosure/start/first-authorization invariants.
- `apps/api/src/files/access.ts` — active-room first-open instruction-file guard.
- `tests/p7-consultation.test.mjs` — permanent controlled SQL/public service/file regression.
- `tests/p7-consultation-integration.test.mjs` — permanent independent-derived actual browser/HTTP regression, unrun here.
- `tests/p7-participation.test.mjs` — replace obsolete consultation-bypass expectations; retain all other previous cases.
- `docs/p7-participation.md` — corrected opening and future-authorization contract.
- This attributed record only; shared task/coordinator/independent records were not edited by this writer.

## Commits and outcomes

No commit by this writer; coordinator owns Git and immutable targeted independent recheck.

## Handoff

Parent spot-checks own proof, commits/freezes these seven files with appropriate parent tracking, then routes the original independent Sol/xhigh verifier to a fresh immutable **targeted B1 and necessary authorization/archive recheck only**. New actual command: `node --test --test-concurrency=1 tests/p7-consultation-integration.test.mjs` after the verifier's authorized fresh preparation; retain330s test/360s child bounds. No new full sweep, merge or push until accepted independent proof. Source remains uncommitted by this writer at the starting HEAD above.

S1: bounded B1 behavior and necessary invariants implemented/own-verified. S2: observed meaningful RED/build/focused GREEN; independent targeted acceptance pending. S3: bug/discovery saved in canonical Engram with session ID omitted; shared full-document mirror remains parent-owned. S4 is parent-only and unperformed here.

Risk: items 1, 2, 3, 4 (persisted attempt/deadline transitions, authorization/private access, shared service contracts, serialization).
