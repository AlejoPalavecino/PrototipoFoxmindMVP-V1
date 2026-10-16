# Email confirmation and resend — independently verified backend

The two contracted T3-V operations passed the parent combined regression (72 checks/real build) and independent security/concurrency/environment verification (41 checks/own real build), without blocking findings. This is scoped backend proof, not completion of T3 or P3: recovery, password change and the frontend/full journey remain unfinished. The [normative contracts](api/accounts-sessions.md) still own schemas; implementation-status reconciliation is a separate closure slice. Native assessment was unavailable, not approved or waived; T2's human choice is not inherited.

Initial confirmation RED was unavailable during fixture setup. The human accepted documenting only that historical exception (S8), never relabeling it as meaningful RED or retroactive GREEN. The original failed preparation and later corrected independent snapshot retain separate reports.

## Run the focused checks

```text
node scripts/build-api.mjs
node scripts/test-p33-verification.mjs --group=confirm
node scripts/test-p33-verification.mjs --group=resend
```

Each standalone group strictly compiles and owns a fresh PostgreSQL/Mailpit fixture. The fixed groups contain eight cases each, with the existing 26-second work/30-second outer budget. There is no retry, timing bypass, automatic redivision or public skip-build option. Help and invalid CLI options load no fixture resources.

### Fixture launch exception, not functional acceptance

Human-approved S10 changes only the owned PostgreSQL Docker `run` ceiling to8000ms. Other work-phase Docker commands stay4000ms, clamped with run to the remaining26000ms global work deadline (minimum1ms); outer scheduling stays30000ms. SQL query2000ms/connect1000ms, cleanup inspection/unpause1000ms each/removal2000ms and compilation6000ms are unchanged. There is no fresh8s allowance after less global time remains, no retry/configuration/bypass and no ownership/default/argument change.

The [T3-F record](work-log/2026-10-16-fixture-launch-budget-mvbjmtkq.md) owns meaningful pure budget RED/GREEN and the sole real setup-only result, separately from auth proof. The [earlier4s diagnostic](work-log/2026-10-16-mvbj715b-p33-fixture-diagnosis.md) remains failed evidence: launch4015ms/ETIMEDOUT, cleanup inspection1/removal0. This is an operational allowance, not proof of Docker latency or historical cause fixed. Setup alone proves no HTTP/account operation; the subsequent parent72 and independent41 results supply separate actual functional/security evidence.

## Existing public contracts

Base path: `/api/v1`. The [normative guide](api/accounts-sessions.md) and [OpenAPI](api/accounts-sessions.openapi.json) retain ownership of schemas and errors.

| Operation | Effect |
|---|---|
| POST `/auth/email-verification/confirm`, `{token}` | `200 {status:"verified"}` for current one-hour, purpose-bound, single-use proof. No auto-login or enrollment. |
| POST `/auth/email-verification/resend`, empty body | Authenticated unverified user, `202 {status:"accepted"}` for durable encrypted issuance, not SMTP delivery. Verified users get `409 EMAIL_ALREADY_VERIFIED`. |

Both preserve exact Origin, conditional/session-required CSRF, strict JSON/shape/16KiB, no-store/nosniff and sanitized error envelopes. Malformed request proof is a `422 VALIDATION_ERROR`; well-formed wrong-purpose/unknown/expired/consumed/invalidated/wrong-account proof is `400 LINK_INVALID`. Rejected requests do not rotate active cookies or mutate account/token/mail state; applicable attempt budgets may still increment. Rate rejection uses generic `429 RATE_LIMITED` and positive integer Retry-After.

## Transaction boundaries

- Existing `IdentityStore` serializes sorted user UUIDs before token/session/job mutations. Confirmation's conditional SQL update checks purpose, digest, owner, expiry and unused/current state at consumption time, after lock waits.
- Wrong signed-in account cannot consume the proof or switch identities. Same-user confirmation revokes the old session binding and creates a new cookie/CSRF binding, preserving both original absolute and idle deadlines. Anonymous confirmation creates no session; other devices remain signed in.
- Resend rechecks persisted active session and verification under the user lock. Successful token creation history, including invalidated/consumed history, anchors the minimum 60 seconds. Shared IP/user attempt counters are separate; rejected attempts do not move this anchor.
- Replacement invalidates only verification-purpose proof, cancels its queued encrypted mail, creates a new purpose-bound token/encrypted outbox job and renews session idle in one transaction. Absolute expiry is unchanged. Cancellation/enqueue failure rolls back all these mutations, retaining prior usable proof and successful cooldown history.
- The existing mail lifecycle performs actual SMTP outside request transactions. Already in-flight old mail can arrive but cannot restore invalidated proof. No schema, keys, dependencies, infrastructure or parallel password/config services were added.

## Evidence and limits

The [writer record](work-log/2026-10-16-t3-verification-mvb7th8c.md), [original incomplete independent preparation](work-log/2026-10-16-mvbk7it5-p33-verification-review.md) and [corrected independent PASS](work-log/2026-10-16-mvbkihar-p33-verification-recheck.md) retain separate attribution. Corrected178-file input preflight included schema/all migrations; the four first executions passed25 pure controls, a fresh build and both8-case public groups, with twoDB/twoMailpit cleanup reports0. Parent72/build0/cleanup0 remains separate integration evidence. Tests use captured registration/replacement mail and public HTTP observations; owned SQL only arranges fixture state/contention, never post-request acceptance assertions. No real recipient/token outputs.

Advisories remain: later reset redemption usability awaits recovery; idle preservation does not prove separate aging for every rejection; source review is not exhaustive scheduling of every worker/stale-session race; smaller configured limits are not a default-budget exhaustion run. In-flight stale mail can arrive without restoring invalidated proof. The two obsolete planned404 entries were removed from D1/D2 regressions; three later T3 operations stay absent. No full T3/P3 or native approval follows.
