# Standalone account mail sender

P3.2 prepares Spanish verification/recovery messages over local SMTP. It does **not** register routes, verify accounts, issue/consume tokens, persist jobs, retry messages or implement the web journey. The existing health application does not import this module and retains its startup requirements. See [P3.1 email contracts](api/accounts-sessions.md#token-and-email-lifecycle) and the [P3.2 task](../odd/tasks/p32-local-email.md).

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
| `to` | One ASCII dot-atom mailbox with valid DNS-style dotted **lowercase domain**; local part≤64characters, address≤254. Uppercase ASCII domain letters are rejected with `MAIL_INPUT_INVALID` before connecting or sending; they are never silently lowercased. Local-part case, dots and plus tags are preserved exactly. Display names, quoted local parts, internationalized addresses, lists, whitespace and controls are rejected rather than rewritten. Upstream identity comparison remains separate from this delivery-input restriction. |
| `token` | Canonical unpadded43-character base64url encoding of32bytes. The caller owns secure issuance, purpose/expiry/consumption; this sender only validates shape. |

The user explicitly selected uppercase-domain rejection because Nodemailer10.1.1 lowercases domains even with structured recipient fields and an explicit envelope. Supply a lowercase domain intentionally; this sender performs no case conversion and does not require lowercase local parts. The coordinator owns matching P3.1/public-schema/functional-policy amendments.

Verification links use `/verify-email#token=...` and say **1 hora**. Recovery links use `/recover-password#token=...` and say **15 minutos**. Both include plain text and escaped HTML with no remote resources. Links never use token-bearing queries/backend GETs and never automatically confirm anything. P3.3 must implement encrypted transactional outbox/expiry checks and token security; nothing here persists plaintext tokens.

Local SMTP intentionally ignores STARTTLS only because the host is fixed loopback and the peer is a capture inbox. Do not repurpose this configuration for production delivery. Connection/greeting timeouts are3000ms, socket inactivity timeout5000ms. File/URL content resolution is disabled at both transport and message levels. There is no automatic retry, verification-on-send, relay configuration or delivery-state storage.

## Focused proof and limits

Run in order, with the parent-installed dependencies:

```sh
npm run api:build
node --test --test-concurrency=1 tests/p32-mailer.test.mjs
```

The tests use `scripts/mail-smtp-fixture.mjs`, an independent ephemeral loopback SMTP peer with in-memory capture. They exercise public configuration, Nest resolution/close, both wire-level MIME messages/envelopes, previous-purpose regression, malformed/header-injection rejection before connection, uppercase-domain rejection with unchanged SMTP counters/capture, exact mixed-case/dotted/plus local-part preservation for both purposes, unavailable/rejecting/stalled SMTP and sanitized failures. They require no PostgreSQL or development inbox and do not read real tokens or account records. This fixture is **not Mailpit evidence**: the coordinator owns the real sender→Mailpit SMTP/API seam and independent review. These checks do not prove authentication, token expiry enforcement, durable outbox, browser behavior or delivery to a person.

## Review and rollback boundary

This sender is the second review unit after capture infrastructure; Nodemailer10.1.1 and its root package/lock change belong to the coordinator's dependency boundary. It provides bundled types and requires Node≥20 (the project requires Node24); no `@types/nodemailer` or postinstall approval is needed. Parent-reported audit0 is dependency context, not a security guarantee or a check rerun by this writer.

Rollback the standalone `apps/api/src/mail/` module, `tests/p32-mailer.test.mjs`, `scripts/mail-smtp-fixture.mjs` and this guide together, with parent-owned dependency/seam changes reviewed separately. Do not revert capture infrastructure, existing application/health/configuration, database data or another agent's work record. No commit/publication or whole-P3 completion is implied.
