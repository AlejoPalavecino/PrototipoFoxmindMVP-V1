# P3.3 T2 D1 — Independent verification completed

- **Verifier:** `mvabvep1-t-7wce`; child session ID unavailable.
- **Role:** read-only independent functional/security/concurrency verifier.
- **Record persistence:** coordinator to persist `docs/work-log/2026-10-15-mvabvep1-p33-d1-verification.md`; verifier wrote no report/source/test.
- **Candidate:** supplied baseline `37ab579` plus uncommitted D1 and declared metadata overlay.
- **Workspace:** `.test-artifacts/p33-verify-d1-LMdZds`.
- **Provenance:** parent-supplied 150-file manifest/SHA256 `8f9246aba671796871f3b83abe5df03b564699bdc647f3392c1465c4c50d62ef`; no independent checksum command authorized.
- **Scope:** feature `odd/tasks/p33-accounts-auth.md`, T2 D1, S1–S7, actual L12. Whole feature including Log read.
- **Status:** **completed for independent D1 verification only. Adequacy accepted for D1, not T2/P3.3.**

## Commands and observed evidence

Executed sequentially, once each, synchronously inside the copy, with **30-second outer limits**. Each command redirected stdout/stderr separately. No retries, fallback checks or new probes.

Log prefix below:
`.test-artifacts/p33-verify-d1-LMdZds/verification-mvabvep1-`

| Exact verification command | Observed result | stdout / stderr suffix |
|---|---|---|
| `npm run api:build` | Successful shell return; Prisma Client **7.10.0** generated in **220ms**, no compiler diagnostics | `build.stdout.log` / `build.stderr.log` |
| `node scripts/test-p33-identity-http.mjs` | **exit0**, compiler0, **21/21 PASS**, no skips/cancellations; runner **18820ms**; owned cleanup0 | `http.stdout.log` / `http.stderr.log` |
| `node scripts/test-backend.mjs` | **exit0**, compiler0, **8/8 PASS**, no skips/cancellations; runner **11949ms**; owned cleanup0 | `backend.stdout.log` / `backend.stderr.log` |
| `node --test tests/p31-contracts.test.mjs` | **exit0**, **9/9 PASS**, no skips/cancellations; **73.2274ms** | `contracts.stdout.log` / `contracts.stderr.log` |

All test stderr logs were empty. Build stderr contained normal npm/Prisma notices, not errors. No timeout observed. Build elapsed time was not separately recorded.

Expected outputs were local generated/build files, these logs and runner-owned disposable PostgreSQL fixtures. Both runners reported successful cleanup. No unexpected mutation was observed; no separate post-run mutation audit was authorized.

## Per-spec D1 verdict

| Spec | Verdict and boundary |
|---|---|
| **S1** | **PASS, D1 scope.** Four real operations execute; eight later operations remain404. No frontend, classroom or whole-P3 completion inferred. |
| **S2** | **PASS, D1.** Session/CSRF/login/logout behavior, strict transport, raw password boundaries, generic authentication errors, cookie rotation/revocation, expiration and no idle renewal exercised. Registration/profile/token requirements deferred. |
| **S3** | **PASS, D1 integration.** Shared broad mailbox validator precedes lookup; preserved international spelling, case-insensitive PostgreSQL lookup and uppercase-domain rejection exercised/read back. No new account writes or SMTP delivery claimed. |
| **S4** | **PASS, D1.** Singleton bounded Argon2 service, digest-only fresh sessions, persisted authentication before CSRF, sanitized errors and fail-closed startup confirmed. No anonymous session/JWT alternative. |
| **S5** | **PASS for applicable D1 boundary.** Outbox keyring startup validation and SQL/counter503 behavior confirmed. D1 produces no account token/job and schedules no worker; transactional issuance/live-mail proof remains D2/T3. |
| **S6** | **PASS, D1.** Ordered user locks, stale-password/context rechecks, current-only logout and shared atomic unknown-identifier admission confirmed. Future application writes must derive normalized email; registration/token races remain deferred. |
| **S7** | **PASS for assigned verification.** Backend regressions and truthful four/eight contract metadata pass. No Git/native/publication action taken; branch and native disposition remain coordinator-owned. |

## Security/concurrency readback

Supporting paths relative to the copy:

- `apps/api/src/application.ts:14–18` and `identity/identity.module.ts:16–18`: shared DatabaseModule object and one runtime/password-service factory.
- `apps/api/src/identity/runtime.ts:43–55`: ordered mutation locks, credential snapshot/current-session recheck, revoke rather than retarget, fresh digest-only session insert.
- `apps/api/src/identity/runtime.ts:59–65`: current-only serialized logout.
- `apps/api/src/identity/persistence.ts:38–60`: ordered SQL user locks, persisted expiry/revocation authentication and locked-context recheck.
- `apps/api/src/identity/persistence.ts:65–95`: deterministic shared bucket locking, conflict-safe initialization, database-clock fixed windows, saturating counters and429.
- `apps/api/src/identity/transport.ts:60–92`: authenticate before CSRF, socket IP, exact Origin, common request/error handling.
- Prisma schema and existing migrations retain unique normalized email/session digests/bucket keys and relevant constraints; no new migration required by D1.

Public tests additionally passed deterministic stale-hash replacement, concurrent logout/login, shared cross-instance unknown-ID limits and concurrent admission accepting exactly the configured budget.

## Outage-isolation adequacy

**Accepted for D1.** `tests/p33-identity-http.test.mjs:328–387` retains actual socket-object comparison and a dedicated application/origin without production transport changes.

Observed full-suite evidence:

- Healthy consumed warm session/readiness responses:200/200.
- Paused sequence: **503 / 503 / 200 / 503**, with required bodies/headers.
- All four requests reused actual completed warm client sockets: session/liveness socket1; login/readiness socket3.
- Transport completed; matching server responses finished normally.
- Restored session/readiness:200/200 on those same sockets.
- Finally-unpause, observer removal and owned cleanup remained effective.

No reset-as503 allowance, request retry, custom dispatcher, Connection-close workaround or timeout extension was introduced.

The historical20/21 ECONNRESET remains unexplained. This pass neither establishes its cause nor proves the older production idle-age scenario safe.

## Findings, risks and handoff

**Blocking findings:** none observed in delivered D1. No mandatory functional proof remains missing for this bounded D1 assignment.

- **Risk2 — security:** D1 adequacy accepted; not exhaustive security or production-readiness certification.
- **Risk4 — concurrency:** D1 adequacy accepted; registration/reset/change/verification/outbox races require later proof.
- **Risk5 — startup/environment:** fail-closed configuration, CLI startup, SQL outage and framework cleanup passed. Windows signal-driven graceful shutdown and production proxy/provider behavior remain unverified.
- **Advisory:** historical idle-age/reset coverage remains a documented limit, not a speculative blocker.

CodeGraph initialization was unavailable/prohibited; inspection stayed on scoped supplied paths. No environment files, development database, Mailpit/volume, dependencies, Compose, frontend, Git or native lifecycle were accessed through commands.

**Next:** coordinator persists this attributed record and completes applicable D1 native disposition—no HTTP native approval is claimed here—then proceeds to D2 registration/profile’s three operations. **Do not mark T2 or P3.3 complete.**
