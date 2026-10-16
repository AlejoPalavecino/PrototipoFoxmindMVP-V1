# Standalone account mail sender

P3.2 prepares Spanish verification/recovery messages over local SMTP; P3.3 T1 adds broad mailbox compatibility with real isolated Mailpit proof. This sender does **not** register routes, verify accounts, issue/consume tokens, persist jobs, retry messages or implement the web journey. The existing health application does not import this module and retains its startup requirements. See [P3.1 email contracts](api/accounts-sessions.md#token-and-email-lifecycle) and the [P3.2 task](../odd/tasks/p32-local-email.md).

## Future integration seam

Import from `apps/api/src/mail/index.ts` (compiled entry: `.build/api/apps/api/src/mail/index.js`):

```ts
const configuration = readMailConfiguration(process.env);
// Import MailModule.register(configuration) in the future account worker module.
// Resolve AccountMailService through Nest; callers supply an already-issued token.
await service.sendVerification({ to, token });
await service.sendRecovery({ to, token });
```

Each method resolves to exactly `{ status: "accepted" }` only after SMTP reports one accepted recipient and no rejected recipients. This is **SMTP acceptance, not user delivery**. An unavailable peer, recipient refusal or DATA refusal rejects with `MailError`, `code`/`message` `MAIL_DELIVERY_UNAVAILABLE`. There is no raw SMTP response or nested cause. Input/configuration errors use `MAIL_INPUT_INVALID` / `MAIL_CONFIGURATION_INVALID`. Do not log request inputs, complete links, recipient addresses, message bodies or transport errors; this module emits no logs and disables Nodemailer logging.

Nest registration validates and snapshots configuration without connecting. The service is injectable/exported by the module; Nest close prevents new sends, awaits outstanding bounded SMTP operations and closes the transport. No pooling, SMTP credentials, external provider, cc/bcc, attachments or caller-controlled message headers are supported. Extra input fields are ignored, never merged into mail options. Both the envelope and visible To header contain exactly one recipient; From is fixed `no-reply@foxmind.test`.

## Configuration and input boundary

| Input | Rule |
|---|---|
| `MAIL_SMTP_PORT` | Default `1025`; canonical decimal integer1–65535, no whitespace/leading zero. SMTP host is fixed `127.0.0.1`. |
| `APP_ORIGIN` | Default `http://127.0.0.1:3000`; one operator-trusted canonical origin, no credentials/path (including trailing slash), query, fragment, wildcard or controls. HTTPS, or HTTP only for `localhost`, `127.0.0.1`, `[::1]`. Noncanonical spellings are rejected, not silently rewritten. This is not read from a request/forwarded header. |
| `to` | One bare mailbox accepted by maintained `validator.isEmail`, including quoted local parts with spaces, UTF-8 local parts and international DNS domains. The domain must already be lowercase, including Unicode, before validator or transport conversion. Local part≤64UTF-8bytes and address≤254JavaScript code units (library limits). Controls (C0/C1, including surrounding CR/LF/TAB) and invalid Unicode scalars reject before trimming; other surrounding whitespace is trimmed. Preserve remaining delivery spelling/local-part case/dots/plus. No display names, lists, IP domains, single-label domains or provider-specific rewriting. Errors use `MAIL_INPUT_INVALID` before connection. |
| `token` | Canonical unpadded43-character base64url encoding of32bytes. The caller owns secure issuance, purpose/expiry/consumption; this sender only validates shape. |

The user explicitly selected uppercase-domain rejection because Nodemailer10.1.1 lowercases domains even with structured recipient fields and an explicit envelope. `validateMailbox(input: unknown): string`, exported from the public mail index, checks controls and the original domain before calling `validator.isEmail`; it returns the trimmed delivery input or throws sanitized `MailError`/`MAIL_INPUT_INVALID`. The same helper is used by both unchanged sender methods. It explicitly enables UTF-8 local parts, requires a TLD, and disables display names, IP domains, underscores and provider-specific checks. No `normalizeEmail`, URL pre-normalization or home-made RFC grammar is used.

Future HTTP validation should call this helper **before any account lookup/write or durable token/mail issuance**, translate invalid input to the contract's422, and persist/display its returned spelling. Case-insensitive identity comparison is a separate operation; never substitute that comparison value for delivery spelling. The public schema uses `idn-email` plus a Unicode domain-case precondition; it does not implement identity endpoints.

### Delivery spelling versus wire representation

Account spelling is the helper's exact trimmed result. Standard transport encoding is distinct: Nodemailer can emit an IDNA ASCII A-label for an international domain, preserve a UTF-8 local part via SMTPUTF8, and retain required local-part quotation in SMTP/MIME. For example, a quoted local part containing a space keeps its quotes and case; the international-domain case in the focused proof preserves its local part exactly and decodes to the original Unicode domain through IDNA. These are semantic wire representations, not permission to lowercase/rewrite the account identifier. The real Mailpit test compares the captured local part exactly, allows only the original U-label or its standard A-label domain, and checks IDNA equivalence. It does not depend on a particular inbox renderer displaying punycode or Unicode.

Verification links use `/verify-email#token=...` and say **1 hora**. Recovery links use `/recover-password#token=...` and say **15 minutos**. Both include plain text and escaped HTML with no remote resources. Links never use token-bearing queries/backend GETs and never automatically confirm anything. P3.3 must implement encrypted transactional outbox/expiry checks and token security; nothing here persists plaintext tokens.

Local SMTP intentionally ignores STARTTLS only because the host is fixed loopback and the peer is a capture inbox. Do not repurpose this configuration for production delivery. Connection/greeting timeouts are3000ms, socket inactivity timeout5000ms. The public Nodemailer `getSocket` hook receives a service-owned loopback `net.Socket` only after connection; ownership begins before `connect()`, with a3000ms setup timer and one-shot error/close/connect completion. File/URL content resolution is disabled at both transport and message levels. There is no automatic retry, verification-on-send, relay configuration or delivery-state storage.

## Focused proof and limits

For the disjoint P3.3 mailbox unit, run in order with parent-installed dependencies:

```sh
node node_modules/typescript/bin/tsc -p apps/api/tsconfig.p33-mail.json
node --test --test-concurrency=1 tests/p33-mailbox.test.mjs tests/p33-mailbox-flow.test.mjs tests/p31-contracts.test.mjs
```

The private config extends the API config, includes only `src/mail/**/*.ts` and its import closure, and emits to `.build/p33-mail`; new tests import that output. It does not regenerate Prisma or compile another parallel unit. Observed RED19tests/11pass/8fail became GREEN19pass/0fail, including real SMTP capture of quoted-space and Unicode-local/international-domain inputs for both purposes. See the [attributed P3.3 record](work-log/2026-10-15-mva3zlb4-p33-mail-compatibility.md) for the bounded type-import correction and exact evidence. The previous P3.2 sender-subset advisory is resolved for this seam; no identity/outbox/HTTP completion is implied.

After parallel writers settle, the coordinator owns `npm run api:build` and the existing `tests/p32-mailer.test.mjs`/`tests/p32-mail-flow.test.mjs` baseline against refreshed root output. They were not rerun against stale output by this writer.

The existing P3.2 baseline tests use `scripts/mail-smtp-fixture.mjs`, an independent ephemeral loopback SMTP peer with in-memory capture. They exercise public configuration, Nest resolution/close, both wire-level MIME messages/envelopes, previous-purpose regression, malformed/header-injection rejection before connection, uppercase-domain rejection with unchanged SMTP counters/capture, exact mixed-case/dotted/plus local-part preservation for both purposes, unavailable/rejecting/stalled SMTP and sanitized failures. They require no PostgreSQL or development inbox and do not read real tokens or account records. Run `npm run test:mail` for the combined public checks, including `tests/p32-mail-flow.test.mjs`: the actual standalone Nest service sends both purpose-specific fixture messages through SMTP to a fresh owned Mailpit instance; its public inbox API verifies recipients, plain/HTML fragment links/lifetimes and unchanged inbox count after uppercase-domain rejection. It never uses or purges the persistent development inbox. This is mail-transport evidence, not account verification or token consumption.

The focused SMTP fixture alone is **not Mailpit evidence**. The P3.3 `tests/p33-mailbox-flow.test.mjs` proof uses the fresh owned `withMailpit` helper and its public inbox API; it does not read or purge the development inbox. The coordinator retains independent verification/review ownership. These checks do not prove authentication, token expiry enforcement, durable outbox, browser behavior or delivery to a person.

## Terminal cancellation and lifecycle deadline

`AccountMailService.cancelPending(): void` is an idempotent **terminal** emergency operation. It prevents new valid sends and synchronously destroys all owned sockets, including connecting sockets. Queued socket-provider calls also fail closed; already-submitted operations settle through the same sanitized `MAIL_DELIVERY_UNAVAILABLE` boundary. Input validation still runs first. It neither retries nor claims acceptance. Do not use nonpooled `transport.close()` as a per-send cancellation API.

Ordinary `onModuleDestroy()` remains graceful: prevent new sends, drain already-submitted sends (including socket setup not yet started), then close the transport. It does not invoke emergency cancellation. The existing `IdentityMailLifecycle` instead invokes terminal cancellation **before** rejecting its absolute12000ms deadline, stops future ticks, and drains the underlying sends on shutdown. The existing `runOnce` and30000ms job lease are unchanged. This bounds SMTP activity, not arbitrary database teardown; no exactly-once delivery claim follows from cancellation.

Private component checks (no Docker, whole-API build or sensitive files):

```sh
node node_modules/typescript/bin/tsc -p apps/api/tsconfig.p33-mail.json
node --test --test-concurrency=1 tests/p33-mail-cancellation.test.mjs
node scripts/test-p33-mail-cancellation.mjs --regressions
```

The regression command runs the unchanged P3.2 sender tests and P3.3 mailbox component tests. A process-local public Node resolution hook redirects only the P3.2 mail entry to current private output, avoiding stale `.build/api` results without modifying tests, compiler flags or root output. It does not run the Mailpit/Docker flow checks. All child tests run serially under a26000ms cap.

**Deferred parent integration check**, only after C2 settles and a successful combined strict API build:

```sh
node scripts/test-p33-mail-cancellation.mjs --deadline
```

This prepares an owned fresh PostgreSQL fixture and exercises HTTP registration, actual lifecycle/runOnce sending, a trickling incomplete SMTP DATA response beyond the inactivity timeout, absolute deadline cancellation/destruction, responsive HTTP, no overlapping send, prompt idempotent stop/close and durable retry after a replacement lifecycle starts. It uses the production12000ms deadline without timing bypasses; no Mailpit or development data. This writer does not claim that deferred integration check has run. See [sequential C1 evidence](work-log/2026-10-16-c1-sequential-mvb3yfqi.md); historical timeouts and prior runtime failures remain separate evidence.

## Review and rollback boundary

This sender is the second review unit after capture infrastructure; Nodemailer10.1.1 and its root package/lock change belong to the coordinator's dependency boundary. It provides bundled types and requires Node≥20 (the project requires Node24); no `@types/nodemailer` or postinstall approval is needed. Parent-reported audit0 is dependency context, not a security guarantee or a check rerun by this writer.

P3.3 compatibility rollback is the new `mailbox.ts` helper/index export, sender validation change, private tsconfig, new mailbox tests, the surrounding-space baseline amendment and matching Email contract/guide changes, reviewed together with the parent-owned validator dependency boundary. Keep the existing P3.2 service, configuration, templates, capture infrastructure and its evidence intact. A separate full P3.2 sender rollback would remove the standalone module/fixture/tests/guide as one older work unit, not as part of this compatibility change. Do not revert capture infrastructure, existing application/health/configuration, database data or another agent's work record. No commit/publication or whole-P3 completion is implied.
