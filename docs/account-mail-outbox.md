# Encrypted account-mail outbox (P3.3 T1)

This is a library, not an HTTP endpoint or scheduled worker. It implements the encrypted durable-mail foundation of [S4–S7](../odd/tasks/p33-accounts-auth.md). It does not issue/consume account tokens, verify accounts, implement abuse controls or claim user delivery. Future AuthModule integration remains required.

## Public boundary

Import only `apps/api/src/account-mail-outbox/index.ts`:

| Export | Responsibility |
|---|---|
| `loadOutboxKeyring(env)` | Validate supplied configuration; never read environment files or provide defaults. |
| `sealAccountToken(ring, binding, rawToken)` | Encrypt a canonical 32-byte/base64url verifier. |
| `openAccountToken(ring, binding, envelope)` | Authenticate/decrypt; intended only for worker execution, not controllers. |
| `enqueueAccountMail(tx, ring, input)` | Insert an owned job inside an existing Prisma transaction; returns `{jobId}`. |
| `cancelAccountMailForToken(tx, tokenId)` | Cancel pending/running jobs and remove their encrypted payload inside the caller's transaction. |
| `runOnce(db, ring, sender, options?)` | Atomically claim and process at most one job; no timer or daemon. |
| `ACCOUNT_MAIL_JOB_TYPE` | Exact owned type `ACCOUNT_MAIL_V1`; unrelated jobs are never claimed/cancelled. |
| `OutboxError` | Sanitized `code`/message, without driver/SMTP/crypto causes or input echoes. |

Types include `AccountMailBinding`, `EnqueueAccountMailInput`, `AccountTokenEnvelope`, `OutboxKeyring`, `OutboxDatabase`, `AccountMailSender`, `OutboxWorkerOptions` and `OutboxRunResult`. Binding fields are `jobId`, `tokenId`, `userId`, stored enum `purpose` (`EMAIL_VERIFICATION` or `PASSWORD_RESET`) and canonical UTC ISO `expiresAt`. Enqueue additionally takes `rawToken`. UUID input is lowercase; expiry must exactly match the persisted token at JavaScript millisecond precision. Callers generate job IDs before sealing.

## Key configuration and envelope

Supply `AUTH_OUTBOX_KEYS_JSON` as a JSON object mapping key IDs to canonical standard-base64 encodings of exactly 32 random bytes. Supply `AUTH_OUTBOX_ACTIVE_KEY_ID` naming an existing entry. IDs contain 1–64 ASCII letters/digits/underscores/hyphens; 1–32 keys are supported. No missing, malformed, weak, truncated or fallback key is accepted. Generate keys with a CSPRNG outside this repository. Key material remains in an opaque in-memory keyring; its public object exposes only the active ID.

Envelopes have version `v:1`, `keyId`, a fresh 12-byte random nonce, ciphertext and a 16-byte GCM tag; binary fields use canonical base64url. AES-256-GCM AAD is the UTF-8 JSON ordered array of envelope domain/version, job ID, token ID, user ID, stored purpose and canonical expiry. Authentication rejects wrong keys, tags and any binding change. Keep old keys available until every still-valid pending envelope using them has been completed/cancelled. Missing old keys fail closed, retain valid encrypted work and do not consume SMTP attempts; restoring the old key permits recovery. Key IDs alone are not secrets.

The job stores only versioned association metadata and its envelope: no plaintext token, recipient or link. The worker loads immutable `User.email` through the active token association, preserving delivery spelling. Account-token digest is SHA-256 of the parent-owned `ACCOUNT_TOKEN_DIGEST_DOMAIN`, NUL, stored purpose, NUL, raw canonical verifier. This unit has no runtime dependency on identity-security or the mail implementation.

## Future HTTP/domain integration

1. Validate key configuration during identity startup, before enabling identity routes. Map `OUTBOX_CONFIG_INVALID`, `OUTBOX_KEY_UNAVAILABLE` and `OUTBOX_STORAGE_UNAVAILABLE` to fail-closed identity availability handling; never echo their causes or supplied values.
2. In a single caller-owned Prisma transaction, lock the affected user before token/job rows, create/update the token and successful issuance cooldown, then call `enqueueAccountMail`. The helper also obtains the user mutation lock and checks active token ID/user/purpose/digest/exact expiry before insertion. It never starts or commits a transaction. Parent integration must derive every new `email_normalized` and retain the unique index. No migration or existing-data rewrite is needed here.
3. On consumption/resend/invalidation, call `cancelAccountMailForToken` in the same transaction as token state changes. It fences running workers as well as pending work. A worker also detects stale work on its next run, but domain integration must cancel proactively to wipe ciphertext immediately.
4. Pass the ordinary **non-transactional** Prisma client to `runOnce`; never pass a transaction client. Supply a structural sender with `sendVerification({to,token})` and `sendRecovery({to,token})`, each resolving `{status:'accepted'}` only after SMTP acceptance. The existing AccountMailService matches this port. Its transport owns network deadlines; arbitrary adapters must also bound their own network operations.
5. AuthModule owns scheduling, preventing uncontrolled overlapping runs, stopping scheduling and awaiting in-flight operations at shutdown. This library opens no connections or timers itself. Never log sender arguments, decrypted results, raw links, configuration values or driver errors.

## Lease, retries and race boundary

A parameterized `SELECT ... FOR UPDATE SKIP LOCKED` CTE atomically claims one owned pending/due or expired-lease job. Claims contain random UUID ownership and a bounded lease. Every attempt/completion/retry is conditional on running status, ownership and a live lease. SMTP runs outside database transactions and user locks. Just before submission, a conditional attempt update rechecks the active token metadata and digest; already stale/expired/consumed/invalidated tokens do not send.

Default lease: 30 seconds (configurable 50–300000ms). SMTP sender deadlines must be shorter than the lease. At most five SMTP attempts are made; retry starts at 1000ms (configurable 10–60000ms), doubles per attempt and caps at 60000ms. A retry that cannot fit strictly before token expiry is cancelled instead. Ciphertext is removed on accepted owned completion, cancellation, detected stale/expired work, invalid envelope/digest, or exhausted retries. A missing old key retains valid work without consuming an attempt. Retry/cancel updates preserve existing schema claim/completion constraints.

Results are only `idle`, `accepted`, `discarded`, `retry`, `key-unavailable` or `lease-lost`, plus a non-secret job ID when claimed. `accepted` means SMTP acceptance, not delivery or verification. SMTP and PostgreSQL cannot form an atomic transaction: crash/lease expiry after SMTP acceptance can cause duplicate email. A stale worker cannot complete/retry/clear a successor's payload. Resend may race with already in-flight mail; that old message can arrive but its token must remain invalid. No exactly-once guarantee or lease heartbeat is claimed.

JavaScript strings cannot be reliably zeroized. Temporary plaintext buffers are wiped; decrypted string references are released promptly. Database encryption does not protect against a compromised worker or keyring. This is not an external-provider security/deployment assessment.

## Focused verification

Run in the repository root, each foreground with a 30-second outer budget:

```text
node node_modules/typescript/bin/tsc -p apps/api/tsconfig.p33-outbox.json
node scripts/test-p33-outbox.mjs
```

The private compiler emits only into `.build/p33-outbox`, avoiding concurrent writers' outputs. The runner compiles the private unit, creates a unique disposable cached `postgres:17.10-bookworm` container with tmpfs data, applies the three existing SQL migrations using the database driver, executes `tests/p33-account-mail-outbox.test.mjs` and cleans up only its owned container. It uses an in-memory random password and supplied test URL, not Compose/environment files/development databases/inboxes/volumes. There is no migration replay/drift sweep, client regeneration, root build or dependency mutation. Total runner budget is 26 seconds plus bounded cleanup; a timeout is reported, never automatically retried. Sanitized logs are saved under `.build/p33-outbox/verification-<timestamp>.log`.

Tests invoke public exports, SMTP and database driver ports. Isolated fixtures assert booleans/status/counters, never dump private payloads or token/recipient material. Coverage includes randomized authenticated envelopes, each AAD binding, rollback/no plaintext, association/digest mismatches, simultaneous claims/owned-type isolation, no user lock during SMTP, both sender purposes, stale state/cancellation, rotation/missing-key recovery, bounded retries/expiry and lease-takeover fencing of both old completion and retry. No live SMTP/Mailpit or HTTP journey is claimed here; mailbox and parent integration verify those separate boundaries.

## Limits and rollback

This cohesive unit exceeds a single 400-line review target with its fixtures and owned runner. Parent may split pure envelope/config tests from repository/worker integration for review; do not omit tests/docs or compress code to meet a budget. Only the parent owns review disposition and Git actions.

Rollback is limited to the new outbox source, private config/runner/test/guide and attributed work record. No schema, generated Prisma client, P3.2 infrastructure or data was changed. Before withdrawing a future live integration, stop its scheduler and preserve keys needed by pending work; do not erase active job data as a rollback shortcut.
