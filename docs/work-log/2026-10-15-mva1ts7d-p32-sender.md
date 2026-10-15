# P3.2 T1 — Standalone local SMTP sender

- Agent / role: package-owned implementation writer, sender only.
- Session or task ID: `mva1ts7d-a-edc6`.
- Date: 2026-10-15.
- Branch / worktree: `feat/p32-mail-capture`, shared FoxMind checkout.
- Starting commit: `71ce2931184e7c543f7272bee81d7d2902dac9c9`.
- Phase/tasks: P3.2 T1, S1/S2/S4 in [feature spec](../../odd/tasks/p32-local-email.md).
- Status: blocked — interaction required on dependency address normalization; implementation is partial.

## Request and scope

User request in the feature specification: "Bien vamos con P3.2". Parent delegates standalone Nest sender/templates, focused public-interface tests, independent loopback SMTP fixture and sender documentation. Exact source boundary: `apps/api/src/mail/**`; no AppModule/configuration/health changes, account/auth/token issuance or consumption, DB/outbox, frontend or root dependency edits. Nodemailer10.1.1 installation and root manifests belong to parent. Capture writer has disjoint surfaces. Parent owns native review, commits and shared roadmap/task updates.

## Work performed

Before implementation: read injected work-unit/backend skills, root AGENTS, roadmap, work-record protocol, feature spec through its Log boundary, P3.1 email contract, local-first functional-spec section and parent work record. Git matched supplied branch/starting commit; pre-existing package/lock modifications and parent untracked task/record are preserved. CodeGraph status returned not initialized; initialization would write outside this writer's allowed surfaces, so inspection is restricted to exact relevant source/type/test paths instead. No persistent memory read. Created this attributed record before source writes.

## Verification

Strict test-first requested. Planned commands (foreground, tool timeout30s): `node --test --test-concurrency=1 tests/p32-mailer.test.mjs` for initial RED and final focused proof; `npm run api:build` for generated-client/build/typecheck. No PostgreSQL, install, root scripts beyond authorized build, or real Mailpit seam in this unit. One correction per failed check, second only for same failure.

RED observed: `node --test --test-concurrency=1 tests/p32-mailer.test.mjs` exited1; stdout/stderr reported `ERR_MODULE_NOT_FOUND` for the intentionally missing compiled mail public entry,1 test file failed,0 passed, duration6326ms. Test/fixture files preceded all mail implementation writes. No token/address/SMTP response was printed. Public behavior cases cover config, module, both message purposes, validation-before-connect, refusal/unavailability/timeout and lifecycle. Matching implementation now added; build/GREEN pending. User's later explicit no `.env`/`.env.example` access constraint is preserved; neither file has been accessed; configuration consumes only its provided object.

## Implementation and observed validation

- Added standalone `apps/api/src/mail/` public index, configuration, module, injectable service, sanitized error type and Spanish plain/HTML templates. No existing application imports changed. Added independent SMTP fixture, public tests and `docs/mail-sender.md`.
- `npm run api:build` (foreground timeout30s): exit0; stdout/stderr: npm api:build→db:generate→prisma generate, loaded Prisma config/schema, generated Prisma Client7.10.0 to `.generated/prisma` in272ms; TypeScript emitted no diagnostics. No dotenv importer is present in the inspected Prisma config; no `.env` or `.env.example` read/write was performed.
- `node --test --test-concurrency=1 tests/p32-mailer.test.mjs` initial GREEN: exit0,7/7passed,0failed, duration8881ms. Both purposes and previous-purpose regression, envelope/fields/MIME, config/input rejection, sanitized SMTP failures, greeting timeout, standalone Nest lifecycle passed.
- Triangulation added final newline/control rejection, uppercase-domain spelling preservation, DATA socket timeout and in-flight close. Same exact test command: exit1,8/9passed,1failed, duration8682ms. The exact failing test is `valid address spelling is preserved without provider or case rewrites`: synthetic uppercase-domain recipient was sent with lowercased domain. No real recipient/token was printed. Other tests, including5000ms socket timeout and waiting for active send on Nest close, passed. No correction has been applied to this newly failing check.
- Scoped dependency inspection after failure confirms Nodemailer10.1.1 MimeNode `_parseAddresses`/`_normalizeAddress` normalizes domain casing for explicit envelope and headers. Structured input and explicit envelope do not prevent this. No dependency mutation or internal monkeypatch was attempted.

## Commits and outcomes

No commits by this writer; no delivery/review approval implied. S1/S2 sender behavior and S4 standalone dependency boundary implemented but not complete: exact-spelling behavior fails triangulation. Module and docs currently promise spelling preservation that is not true for uppercase domains; do not accept this candidate as complete. Tests are fixture proof only, not Mailpit proof. Capture/root manifests/shared metadata remain parent-owned; no PostgreSQL or unrelated suite ran.

## Handoff

First unfinished action: coordinator selects address-casing resolution, then make one scoped correction and rerun authorized build/focused tests. Concrete choices: (1) fail closed on uppercase domains before connection, document a lowercase-domain sender boundary while preserving local-part/plus spelling; (2) explicitly allow Nodemailer's domain-only case normalization, retaining exact local-part/plus spelling and documenting the exception; (3) defer this sender candidate. The writer does not silently narrow accepted addresses or weaken the no-rewrite contract.

Risk item2 guards: fixed loopback transport/sender, no input field spreading, shape/control validation before SMTP, fragment links, no transport logging, generic errors without cause, disabled URL/file access, bounded timeouts and lifecycle have observed focused coverage; uppercase-domain dependency normalization remains unresolved. Risk item5 dependency context: parent owns installed Nodemailer10.1.1/package/lock and reports audit0; writer independently inspected bundled types and build passed, but did not rerun audit or approve postinstalls. No validated Engram project identifier was supplied, so no speculative memory destination was written.

Rollback boundary: sender source, focused tests/fixture/guide together; coordinator handles dependency/seam rollback separately. Keep this attributed evidence, capture infrastructure and unrelated files intact. Parent owns actual Mailpit seam (T2), review disposition/independent checks/commits and shared roadmap/task reconciliation. No whole-phase completion claim.
