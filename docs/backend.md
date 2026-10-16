# Run the local FoxMind backend

The NestJS backend provides health checks and P3.3 D1 PostgreSQL-backed session/CSRF/login/logout. Registration, profile, account-token flows, classroom permissions, activities and uploads remain unimplemented. It binds to `127.0.0.1`. Read [identity startup and integration boundaries](identity-http.md) before starting it; this is not production readiness.

## Quick path

Use Node.js24 and a running Docker Desktop Linux engine. From the repository root:

```sh
npm ci --ignore-scripts
npm run api:build
npm run test:api
```

The build generates local Prisma source. The test command uses a cached PostgreSQL image and disposable tmpfs container, applies existing SQL migrations via the driver, compiles TypeScript via Node dependency resolution and exercises real HTTP endpoints. It overrides incoming database and identity configuration with owned ephemeral values and removes only its owned container. One test pauses/resumes that database to observe readiness failure/recovery; no development volume or SMTP inbox is used. Its work deadline is26seconds plus bounded cleanup; no timeout retry.

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

No CORS policy or Swagger is enabled. Only GET auth/session, GET auth/csrf, POST auth/login and POST auth/logout implement the [account contract](api/accounts-sessions.md); all eight remaining identity operations and classroom routes still return404. Identity responses have no-store/nosniff/request IDs and sanitized errors. These public health endpoints must not be mistaken for identity readiness or an application authorization layer.

## Lifecycle and structure

- `apps/api/src/configuration.ts`: validated environment and sanitized errors.
- `apps/api/src/application.ts`: Nest module composition and versioned route prefix.
- `apps/api/src/database/`: injected database URL and one shared Prisma provider/pool; root and IdentityModule reuse the same dynamic-module object.
- `apps/api/src/identity/`: validated B/C/mail composition, singleton async B password service, shared SQL transaction/lock/canonicalization/admission helpers and four-operation transport. No scheduler or account-token producer in D1.
- `apps/api/src/health/`: fixed response shapes with sanitized failure handling.
- `apps/api/src/main.ts`: loopback listener and structured startup event.

The application registers SIGINT/SIGTERM shutdown hooks and calls Prisma disconnect through Nest's module destruction lifecycle. Normal framework close releases the HTTP listener and the provider-owned PostgreSQL connections; both effects are checked against the real isolated database. Forced termination cannot guarantee hooks execute (including platform-dependent Windows signal behavior); it is not claimed as a graceful-shutdown proof.

Generated Prisma TypeScript remains at `.generated/prisma`. TypeScript compiles it and backend source into ignored `.build/api`, rewriting relative `.ts` imports to `.js`. The schema, deployed migrations and database command names are unchanged. Root package scripts manage this initial backend; no extra CLI/global installation is required.

## Verification and limitations

- `npm run api:build`: generate Prisma and compile the backend.
- `npm run test:api`: isolated real-HTTP/configuration/lifecycle tests after the build.
- `node scripts/test-p33-identity-http.mjs`: focused isolated D1 HTTP/session/rate/concurrency contracts after the build.
- `node --test tests/p31-contracts.test.mjs`: offline twelve-operation schema checks, with only four marked implemented.
- `npm test`: preserve all existing38 database contracts, migration replay/drift and Prisma runtime smoke.

The initial installation reported four high-severity entries through Prisma CLI/config. The [dependency remediation](dependency-security.md) now scopes overrides to `deepmerge-ts8.0.2` and `mysql2 3.24.6`, retaining Prisma7.10.0. The complete audit reports0known vulnerabilities and the existing build/API/database suites pass. No dependency class is omitted and no force-fix or major Prisma downgrade was used. A clean scan is time-bound evidence, not a guarantee of exhaustive dependency safety.

Remaining identity/product implementation, production security hardening, future dependency updates, structured operational logging and deployment require separate work and verification. No production readiness is claimed.
