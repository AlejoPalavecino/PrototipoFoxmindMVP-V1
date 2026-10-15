# Run the local FoxMind backend

The NestJS backend foundation provides process liveness and PostgreSQL connectivity checks. It does **not** implement accounts, sessions, classroom permissions, activities, uploads or other product APIs yet. It is local-only and binds to `127.0.0.1`.

## Quick path

Use Node.js24 and a running Docker Desktop Linux engine. From the repository root:

```sh
npm ci --ignore-scripts
npm run test:api
```

The test command creates a disposable PostgreSQL container, applies the existing migrations, generates Prisma, compiles TypeScript and exercises real HTTP endpoints. It overrides incoming database configuration and removes only its owned container. One test pauses/resumes that owned database to observe readiness failure/recovery; no development volume is used.

For local development, configure `POSTGRES_PASSWORD` and `DATABASE_URL` in the current terminal using the [database guide](database.md). No `.env` file is loaded or required. Then:

```sh
npm run db:up
npm run db:migrate
npm run api:build
npm run api:start
```

Migrations are explicit: starting the API never applies them or resets data. A database must be separately initialized before future product features can use its tables.

## Configuration and startup

| Variable | Rule |
|---|---|
| `DATABASE_URL` | Required PostgreSQL URL with a host and database path; `postgres:` and `postgresql:` accepted. Never logged by this backend. |
| `API_PORT` | Defaults to3001 when unset. Decimal integer0–65535;0 requests an ephemeral local port. Empty, negative, nonnumeric and out-of-range values are rejected. |

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

There is no CORS policy enabled, no Swagger, no authenticated route, and no classroom endpoint. A404 on those product routes is expected; these public health endpoints must not be mistaken for an application authorization layer.

## Lifecycle and structure

- `apps/api/src/configuration.ts`: validated environment and sanitized errors.
- `apps/api/src/application.ts`: Nest module composition and versioned route prefix.
- `apps/api/src/database/`: injected database URL and shared Prisma provider/pool.
- `apps/api/src/health/`: fixed response shapes with sanitized failure handling.
- `apps/api/src/main.ts`: loopback listener and structured startup event.

The application registers SIGINT/SIGTERM shutdown hooks and calls Prisma disconnect through Nest's module destruction lifecycle. Normal framework close releases the HTTP listener and the provider-owned PostgreSQL connections; both effects are checked against the real isolated database. Forced termination cannot guarantee hooks execute (including platform-dependent Windows signal behavior); it is not claimed as a graceful-shutdown proof.

Generated Prisma TypeScript remains at `.generated/prisma`. TypeScript compiles it and backend source into ignored `.build/api`, rewriting relative `.ts` imports to `.js`. The schema, deployed migrations and database command names are unchanged. Root package scripts manage this initial backend; no extra CLI/global installation is required.

## Verification and limitations

- `npm run api:build`: generate Prisma and compile the backend.
- `npm run test:api`: isolated real-HTTP/configuration/lifecycle tests.
- `npm test`: preserve all existing38 database contracts, migration replay/drift and Prisma runtime smoke.

The initial installation reported four high-severity entries through Prisma CLI/config. The [dependency remediation](dependency-security.md) now scopes overrides to `deepmerge-ts8.0.2` and `mysql2 3.24.6`, retaining Prisma7.10.0. The complete audit reports0known vulnerabilities and the existing build/API/database suites pass. No dependency class is omitted and no force-fix or major Prisma downgrade was used. A clean scan is time-bound evidence, not a guarantee of exhaustive dependency safety.

API feature implementation, production security hardening, future dependency updates, structured operational logging and deployment require separate work and verification. No production readiness is claimed.
