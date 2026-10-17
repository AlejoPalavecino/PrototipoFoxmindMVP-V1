# Password recovery

The two contracted recovery operations are implemented and independently verified: request returns the same generic202 for existing/unknown accounts, issues a purpose-bound15-minute proof through the encrypted transactional outbox, and enforces declared admission/cooldown rules. Confirmation consumes once, updates the credential and revokes all sessions atomically, clears the cookie and never logs in or changes verification automatically.

Independent proof:16 recovery checks within backend99PASS, plus the real captured-email/browser recovery, reuse, expiry and previous-session revocation journey. See [final verification](work-log/2026-10-17-p3-verify-final.md), [account contract](api/accounts-sessions.md) and [current test bounds](p3-test-runtime.md). Run the existing three fixed public groups below or the complete build-once pipeline. Native review is disabled/unmanaged.

## Historical initial candidate evidence

The remainder preserves the earlier candidate record and its original limits/failures. Its unfinished/future wording is historical, superseded by the independently verified checkpoint above.

The two [contracted operations](api/accounts-sessions.md) now have uncommitted candidate methods/routes, not verified behavior. Accepted metadata remains nine operations, not eleven; P3/web are incomplete. Initial fixed groups observed4+4+8 expected missing-route404 failures before behavior, with actual TypeScript0/empty stderr and threeDB/threeMailpit cleanup0 reports. Those baseline results do not validate the new candidate. Its real build job-6 exited0: Prisma7.10 generation0 and strict TypeScript0, stderr only expected config/schema metadata. First fixed GREEN job-7 passed16 public checks with actual compilation/threeDBthreeMailpit cleanup0; separate streams read. Orchestration controls passed15 synthetic checks after their own expected missing-stage RED. Changed-candidate combined regression is active as job-8; its expected88 checks are not a result. No integrated/independent runtime or native approval yet.

## Fixed public checks

Declared before the first execution; no retry, automatic subdivision, timing override or weakened target rates:

| Command | Cases | Scope |
|---|---:|---|
| `node scripts/test-p33-recovery.mjs --group=request` | 1–4 (4) | Known/unknown generic response and comparable maintained work, mailbox/transport,59/60 successful cooldown, identifier attempts. |
| `node scripts/test-p33-recovery.mjs --group=issuance` | 5–8 (4) | Shared IP, concurrent issuance, cancellation/enqueue rollback, queued mail/purpose isolation. |
| `node scripts/test-p33-recovery.mjs --group=confirm` | 9–16 (8) | Real15-minute proof, no auto-login, verification/session preservation or revocation, wrong account, invalid state/purpose, raw password/transport boundaries, duplicate/stale credential/session/expiry and shared redemption. |

Every standalone command performs the real strict build and owns fresh PostgreSQL/Mailpit fixtures. Work26s/outer30s and existing query/cleanup/compile limits remain; fixture launch8s only, other Docker4s. No public skip-build option. Help/rejected options are lazy. A one-off initial-RED supervisor uses29s per child, retains separate streams/results, never converts expected failing assertions to exit0 and stops before later groups on missing HTTP404/owned-cleanup evidence. Its output still requires parent review.

SQL only arranges isolated users/proof/session timestamps and controlled contention. Assertions use public HTTP/cookies/session/credential effects and actual captured mail, not internal-storage results. Trusted dependency/commit barriers retain real native KDF work; no clock/HTTP/environment bypass or weaker password service.

The existing `node scripts/test-p33-t2.mjs` now composes D2 four groups, verification two, recovery three, mail deadline, D1/backend and offline contracts sequentially after one real generation/strict build. Trusted in-process preparation only follows that invocation's successful build; standalone groups still compile. Only obsolete recovery404 checks changed; password change remains absent. Generic closed CLI options/help and default/fail-fast behavior have synthetic proof, not authentication acceptance.

## Chosen design and retained proof limits

[Read-only design challenge](work-log/2026-10-16-mvbm1i0h-p33-recovery-design.md) found the existing model feasible with conditions. Normal attempts remain separate from a private successful-acceptance HMAC marker for both known and unknown identifiers. Marker sentinel0/1 and last_requested_at are not attempt-window timestamps; lock marker before sorted users, use fresh DB time and commit known token/cancellation/encrypted enqueue plus common marker atomically. Unknown requests create no user/token/mail. Both branches reuse maintained bounded dummyCheck outside mutation transactions to avoid account-dependent quick exits; no mathematical network constant-time guarantee.

Future reset must consume current PASSWORD_RESET proof conditionally, change the password/revoke all sessions/clear cookie atomically, without verification change or auto-login. All this still requires meaningful RED, actual GREEN/integrated checks and independent data/security/concurrency verification. Historical V-only RED exception and native disposition do not cover recovery. Parent [record](work-log/2026-10-16-01a14539-p33-recovery.md) owns current evidence; stop after P3, no P4.
