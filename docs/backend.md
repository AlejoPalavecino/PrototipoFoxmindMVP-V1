# Run the local FoxMind backend

The verified checkpoint provides health, all twelve account/session operations and the real Next.js account web. [Independent P3 proof](work-log/2026-10-17-p3-verify-final.md): backend99PASS, controls39PASS, real browser10PASS, live web16PASS and actual owned cleanup0. [Web guide](p3-web.md), [recovery](password-recovery.md), [password change](password-change.md). This account checkpoint preceded P4/P5; current main also contains integrated files/classrooms and later V1 flows. See the [main roadmap](implementation-roadmap.md), [P4 host](p4-host.md) and [P5 host](p5-host.md) for those opt-in modules. Native review is off/global, disabled/unmanaged; no production-readiness or publication claim.

## Quick path

Use Node.js24 and a running Docker Desktop Linux engine. From the repository root:

```sh
npm ci --ignore-scripts
npm run api:build
npm run test:api
```

The parent-adopted build alias is `node scripts/build-api.mjs`: direct Node-resolved Prisma generation then strict TypeScript project compilation, without receipts/cache. For T2, the combined `node scripts/test-p33-t2.mjs` (alias `npm run test:p33:t2`) runs: build once in that invocation, then all four D2 groups, C1 deadline, D1, backend and offline contracts sequentially/fail-fast. No public skip-build option or persistent approval exists. Standalone backend/D1/D2 test commands retain their actual compiler at the unchanged6s cap. The backend test uses a cached PostgreSQL image and disposable tmpfs container, applies existing SQL migrations via the driver, and exercises real HTTP endpoints. It overrides incoming database and identity configuration with owned ephemeral values and removes only its owned container. One test pauses/resumes that database to observe readiness failure/recovery; no development volume or SMTP inbox is used. Its work deadline is26seconds plus bounded cleanup; no timeout retry.

For local development, configure `POSTGRES_PASSWORD` and `DATABASE_URL` in the current terminal using the [database guide](database.md), and provision the required identity origin, independent HMAC keys and outbox keyring from [identity startup](identity-http.md#startup-without-environment-files). No `.env` file is loaded or required. Then:

```sh
npm run db:up
npm run db:migrate
npm run api:build
npm run api:start
```

Migrations are explicit: starting the API never applies them or resets data. A database must be separately initialized before identity operations can use its tables.

## Configuration and startup

| Variable | Rule |
|---|---|
| `DATABASE_URL` | Required PostgreSQL URL with a host and database path; `postgres:` and `postgresql:` accepted. Never logged by this backend. |
| `API_PORT` | Defaults to3001 when unset. Decimal integer0–65535;0 requests an ephemeral local port. Empty, negative, nonnumeric and out-of-range values are rejected. |
| Identity settings | Required APP_ORIGIN, independent AUTH_CSRF_HMAC_KEY/AUTH_ABUSE_HMAC_KEY, AUTH_OUTBOX_KEYS_JSON/AUTH_OUTBOX_ACTIVE_KEY_ID. See [exact encodings/local HTTP/mail/rate configuration](identity-http.md#startup-without-environment-files). Missing/invalid values fail before listen; no health-only bypass. |

Binding host is fixed to `127.0.0.1`; there is no remote/public deployment configuration in this slice. On success stdout contains one JSON startup event: `{"event":"api.listening","host":"127.0.0.1","port":3001}` (actual selected port when0).

Invalid configuration exits1 before listening, with empty stdout and one exact stderr line:

- `Invalid configuration: DATABASE_URL must be a PostgreSQL connection URL.`
- `Invalid configuration: API_PORT must be an integer from 0 to 65535.`

Other startup failures use `Backend startup failed.` without connection strings or exception stacks. Nest's default logger is disabled in this minimal foundation. Operational logging with redaction belongs to a later bounded change, not an implication of production readiness.

## HTTP contract

| Endpoint | Successful response | Failure response |
|---|---|---|
| `GET /api/v1/health/live` |200, `{"status":"ok"}` | Only proves process responsiveness, not database health. |
| `GET /api/v1/health/ready` |200, `{"status":"ready"}` |503, `{"status":"unavailable"}` when a real Prisma query fails or times out. |

Both endpoints set `Cache-Control:no-store`. Readiness executes `SELECT 1`: it proves connectivity, **not migration completeness, permissions or functionality of the academic model**. Database connections are lazy, so liveness can remain available while the database is unavailable. The pool is bounded to5 connections with1-second connection/query/statement limits. Recovery after a temporary database pause is tested.

No CORS policy or Swagger is enabled. All twelve [account-contract](api/accounts-sessions.md) operations are implemented: session/CSRF, login/logout, registration, account GET/PATCH, verification confirmation/resend, recovery request/confirmation and authenticated password change. Classroom routes were outside the P3 checkpoint; current opt-in routing is documented in the [P5 host guide](p5-host.md). OpenAPI marks twelve implemented. Identity responses retain no-store/nosniff/request IDs/sanitized errors; health alone remains no proof of academic product flows.

## Lifecycle and structure

- `apps/api/src/configuration.ts`: validated environment and sanitized errors.
- `apps/api/src/application.ts`: Nest module composition and versioned route prefix.
- `apps/api/src/database/`: injected database URL and one shared Prisma provider/pool; root and IdentityModule reuse the same dynamic-module object.
- `apps/api/src/identity/`: validated B/C/mail composition, singleton async B password service, shared SQL helpers and identity/account transport. T2 adds transactional token/job issuance and one bounded nonoverlapping C worker/sender lifecycle; see its scoped proof and limits above.
- `apps/api/src/health/`: fixed response shapes with sanitized failure handling.
- `apps/api/src/main.ts`: loopback listener and structured startup event.

The application registers SIGINT/SIGTERM shutdown hooks. Root-module destruction first drains identity worker/sender, then imported Prisma destruction disconnects the shared pool; the grouped lifecycle proof passed parent and independent checks. Normal framework close releases the HTTP listener and the provider-owned PostgreSQL connections; both effects are checked against the real isolated database. Forced termination cannot guarantee hooks execute (including platform-dependent Windows signal behavior); it is not claimed as a graceful-shutdown proof.

Generated Prisma TypeScript remains at `.generated/prisma`. TypeScript compiles it and backend source into ignored `.build/api`, rewriting relative `.ts` imports to `.js`. The schema, deployed migrations and database command names are unchanged. Root package scripts manage this initial backend; no extra CLI/global installation is required.

## Verification and limitations

### Historical identity fixture launch allowance (T3-F / S10)

The following allowance describes that historical candidate. Current separately bounded setup/startup/work/cleanup is documented in [P3 verification runtime](p3-test-runtime.md), adopted under the later full P3 completion authorization. Old failures are retained, not retroactively passed.

The human-approved operational exception gives only Docker `run` an8000ms ceiling in `withIdentityDatabase`. All other work-phase Docker calls retain4000ms; each call remains clamped to the remaining26000ms global work deadline (minimum1ms), never a fresh8s when less time remains. Outer scheduling stays30000ms; PostgreSQL connect1000ms/query2000ms, cleanup inspect/unpause1000ms each/removal2000ms and standalone compilation6000ms are unchanged. Names, ownership labels, image/arguments and cleanup/defaults remain unchanged; no new configuration, retry or bypass is provided.

[Task evidence](work-log/2026-10-16-fixture-launch-budget-mvbjmtkq.md) separates pure fake-Docker budget/orchestration tests from the single permitted real setup-only validation. Setup readiness/migration replay is not app/auth regression proof. The [prior diagnostic](work-log/2026-10-16-mvbj715b-p33-fixture-diagnosis.md) observed launch ETIMEDOUT at4015ms under4000ms, cleanup inspection1/removal0; those failed observations are not rewritten. Docker latency and historical causality remain unknown: this allowance does not prove their cause fixed. Subsequent parent combined regression passed72 checks with a real build; independent auth/environment verification passed41 checks with its own real build and actual fixture cleanup. These are separate candidate evidence, not proof of Docker latency causality or completion of T3/P3. Native assessment remains unavailable, not approved.

### Commands and retained limits

- `npm run api:build`: directly generate Prisma then strictly compile the backend via the adopted wrapper. No receipts, dependency fingerprinting or old-output acceptance. Historical failed receipt controls are retired, not passed; see the [unchanged C2 record](work-log/2026-10-16-c2-sequential-mvb4asm3.md).
- `node scripts/test-p33-t2.mjs`: one actual strict build, then all fixed registration/profile/session/lifecycle, verification, recovery and password-change groups, mail deadline, identity, backend and offline checks. Sequential/fail-fast, with trusted preparation only after this invocation succeeds. See [current setup/startup/work/cleanup bounds](p3-test-runtime.md). Independent99PASS; no retry, source receipt or persisted build bypass.
- `npm run test:api`: isolated real-HTTP/configuration/lifecycle tests after the build.
- `node scripts/test-p33-identity-http.mjs`: focused isolated D1 HTTP/session/rate/concurrency contracts after the build.
- `node scripts/test-p33-registration-profile.mjs --group=<registration|account|sessions|lifecycle>`: mandatory fixed groups with owned PostgreSQL/Mailpit. Functional work remains26s after separate initialization; see current runtime bounds. Cases remain7/5/2/3. Historical timeout evidence remains in the attributed records.
- `node --test tests/p31-contracts.test.mjs`: nine offline checks of the twelve implemented operation schemas/statuses and unchanged policies; not a substitute for public runtime proof.
- `npm test`: preserve all existing38 database contracts, migration replay/drift and Prisma runtime smoke.

The initial installation reported four high-severity entries through Prisma CLI/config. The [dependency remediation](dependency-security.md) now scopes overrides to `deepmerge-ts8.0.2` and `mysql2 3.24.6`, retaining Prisma7.10.0. The complete audit reports0known vulnerabilities and the existing build/API/database suites pass. No dependency class is omitted and no force-fix or major Prisma downgrade was used. A clean scan is time-bound evidence, not a guarantee of exhaustive dependency safety.

Historical T2 parent56/independent33 and T3-V parent72/independent41 remain separately attributed. Current full P3 acceptance is the independent99/39 backend/control and corrected10/16 browser/web evidence linked above, with cleanup0. Prior failed receipt/fixture/snapshot/browser checks remain recorded with their resolved causes. Other academic modules and production hardening remain outside P3; no native approval is claimed.
