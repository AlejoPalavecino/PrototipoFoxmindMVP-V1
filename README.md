# FoxMind

FoxMind is a locally runnable educational application: Next.js/React web, NestJS API, PostgreSQL, private file storage/scanning and captured email. Accepted P3–P8 cover accounts/sessions, classrooms/enrollment, Plan/Library/Muro, activities/attempts and private/published grading/progress. P9 adds Inicio and joined local validation; final independent local P9 acceptance is complete; main publication is recorded separately in the roadmap. This repository is not a deployed service or a real pilot.

## Start here

- [Documentation index — product, guides, evidence and local designs](docs/README.md).

- [Current roadmap and exact next work](docs/implementation-roadmap.md).
- [Local operation and synthetic pilot preparation](docs/p9-local-operation.md): prerequisites, environment ownership, startup, actual user flows, recovery and boundaries.
- [Full 170-row V1 acceptance matrix](docs/p9-acceptance-matrix.md) and [finite independent verification plan](docs/p9-verification-plan.md): distinguish inherited acceptance, scoped own proof and final independent local acceptance.
- [Functional specification](docs/foxmind-v1-functional-spec.md) and [visual references](docs/visual-reference-index.md).

## Local development

Use Node24 and lock-matching dependencies. Product operation requires a separately provisioned/migrated PostgreSQL database, private S3-compatible bucket, ClamAV and local Mailpit, with complete identity/file/classroom configuration. Account-only startup and isolated preview identities are not the complete product. Provision only explicitly authorized resources; no environment file or secret-file read is required by the application.

After that setup, the existing package commands are:

```powershell
npm run api:build
npm run web:build
# In separate correctly configured terminals:
npm run api:start
npm run web:start
```

These commands are a developer entry point, not a verification result or permission to migrate retained data. Follow the [local guide](docs/p9-local-operation.md) for exact origin/configuration ownership and the [verification plan](docs/p9-verification-plan.md) for bounded API30s/Next180s builds and fresh owned runtime proof. Ordinary sign-in lands on `/profile`; verified accounts can open `/inicio` and `/mis-aulas`. Local captured mail is not real external delivery.

## Continue safely

Read [agent instructions](AGENTS.md) and [work-record protocol](docs/work-log/README.md) before changes. Preserve the original dirty checkout, retained development volumes/inbox, security/size/quota/freshness policies and historical failed/unavailable evidence. Do not use the retained P4-local project as disposable verification infrastructure.

Repository cleanup on2026-10-24 consolidated that historical dirty checkout into canonical `main` at the original project directory. Use that checkout for new development; old branches/worktree data are preserved in an external recovery bundle/directory. The [consolidation record](docs/work-log/2026-10-24-root-repo-consolidation.md) supersedes the historical dirty-checkout instruction above and records the active chat checkout's app-managed retirement limit. Retained development data and security policies remain protected.

Local development does not authorize deployment, remote execution, real participants/data or destructive cleanup. Current P9 main merge/push is conditional on full verified acceptance; Git publication is not deployment. Native review is off/global (`disabled/unmanaged`), with no native approval claimed.
