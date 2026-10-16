# FoxMind

FoxMind is a local-first educational platform in development. The current repository contains the PostgreSQL/Prisma model, a minimal NestJS backend and verification tooling; it is not yet a finished classroom application.

## Continue development

- [Implementation roadmap and current phase](docs/implementation-roadmap.md): start here to find the next unfinished product work.
- [Agent entry instructions](AGENTS.md) and [per-agent work records](docs/work-log/README.md): leave an attributable handoff for the next session.
- [Functional specification](docs/foxmind-v1-functional-spec.md) and [visual references](docs/visual-reference-index.md): agreed product rules and design direction.

## Run and verify the existing foundation

- [Database setup and isolated verification](docs/database.md).
- [Backend setup, commands and limits](docs/backend.md).
- [Identity HTTP startup and verified T2 checkpoint](docs/identity-http.md): provision required identity keys/origin before `npm run api:start`. Seven operations are implemented and independently verified: session/CSRF/login/logout/register/account GET/account PATCH; five T3 operations remain not implemented. [Registration/profile proof and limits](docs/registration-profile.md), [attributed independent PASS/no blockers](docs/work-log/2026-10-16-mvb63m78-p33-t2-verification.md), [current coordinator](docs/work-log/2026-10-16-01a14539-p33-t2-resume.md) and [execution plan C3](odd/tasks/p33-t2-execution.md) record accepted parent56PASS/build0 and independent33PASS/compiler0/cleanup0. Human selected "Continuar esta unidad sin revisión nativa" only for current T2 code/tests/docs: explicitly natively unreviewed, not native approval or a future review exemption. T3, P3 and the full web journey remain unfinished.
- [Dependency remediation and audit evidence](docs/dependency-security.md).

Follow the setup guides before running persistent services. Credentials come from the terminal environment, not committed files. Roadmap items and historical work records do not authorize publication or destructive operations; follow the current user's scope.
