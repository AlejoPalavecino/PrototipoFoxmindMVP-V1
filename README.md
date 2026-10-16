# FoxMind

FoxMind is a local-first educational platform in development. The current repository contains the PostgreSQL/Prisma model, a minimal NestJS backend and verification tooling; it is not yet a finished classroom application.

## Continue development

- [Implementation roadmap and current phase](docs/implementation-roadmap.md): start here to find the next unfinished product work.
- [Agent entry instructions](AGENTS.md) and [per-agent work records](docs/work-log/README.md): leave an attributable handoff for the next session.
- [Functional specification](docs/foxmind-v1-functional-spec.md) and [visual references](docs/visual-reference-index.md): agreed product rules and design direction.

## Run and verify the existing foundation

- [Database setup and isolated verification](docs/database.md).
- [Backend setup, commands and limits](docs/backend.md).
- [Identity HTTP startup and D1 verification](docs/identity-http.md): session/CSRF/login/logout only; provision required identity keys/origin before `npm run api:start`. Registration/profile/token flows and frontend remain separate.
- [Dependency remediation and audit evidence](docs/dependency-security.md).

Follow the setup guides before running persistent services. Credentials come from the terminal environment, not committed files. Roadmap items and historical work records do not authorize publication or destructive operations; follow the current user's scope.
