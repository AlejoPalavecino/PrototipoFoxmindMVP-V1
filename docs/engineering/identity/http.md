<a id="identity-http--p33-t2-seven-operation-verified-checkpoint"></a>

# Identity HTTP — account/session integration

**Accepted account checkpoint:** all twelve operations and the real local web journey are complete; see [final P3 proof](../../work-log/2026-10-17-p3-verify-final.md), [account contract](../../api/accounts-sessions.md) and [current main roadmap](../../implementation-roadmap.md). The table and D1/T2/T3-V observations below describe their narrower historical slices, not missing endpoints today. Historical parent56/independent33 and parent72/independent41 results retain their scope; no new tests or native approval are claimed.

Human selected "Continuar esta unidad sin revisión nativa" for ONLY that historical T2 candidate’s code/tests/docs. This is an explicit natively-unreviewed disposition, not native approval, global authority change or future review exemption. D1 remains closed; historical investigation sections below preserve earlier failures, not instructions to reopen D1.

| Operation under `/api/v1` | Public result |
| --- | --- |
| `GET /auth/session` | 200 anonymous or own authenticated identity; invalid cookie cleared |
| `GET /auth/csrf` | 200 session-bound HMAC; 401 without an active persisted session |
| `POST /auth/login` | 200 own identity plus fresh opaque cookie; generic 401 for wrong/unknown credentials |
| `POST /auth/logout` | 204, revoke current only and clear matching cookie; absent/expired is idempotent |
| `POST /auth/register` | 202 generic acceptance; new user/token/encrypted mail job atomic, no auto-login |
| `GET /account` | 200 own minimal profile; verified persisted session required |
| `PATCH /account` | 200 own updated names only; verified session and CSRF required |

At the historical D1 checkpoint, four operations were implemented and eight later operations were404. T2 added registration/profile and a transactional mail worker; T3-V then added confirmation/resend, reaching nine. Recovery/password change were absent at that intermediate checkpoint, not on current main. [P3 closure](../../work-log/2026-10-17-p3-verify-final.md) and [later classroom integration](../classrooms/integration.md) record the subsequent acceptance. Unverified accounts can sign in and inspect session/CSRF/sign out, not access profile. Public response examples in [the account guide](../../api/accounts-sessions.md) remain normative. Session JSON never includes a cookie, password hash, role or internal state. Errors contain only stable code and generated requestId; field issues are optional and omitted in D1.

## Startup without environment files

Use Node 24, installed dependencies and a separately migrated PostgreSQL database. Starting the API never migrates or resets data. Supply `DATABASE_URL` and optional `API_PORT` through the terminal environment as described in [backend setup](../local-development/backend.md). Also supply all identity settings below **before** `npm run api:start`:

- `APP_ORIGIN`: exact sole browser origin, no path/trailing slash or forwarded-origin inference.
- `AUTH_CSRF_HMAC_KEY`, `AUTH_ABUSE_HMAC_KEY`: independent CSPRNG values, each at least 32 bytes, canonical unpadded base64url; no defaults.
- `AUTH_OUTBOX_KEYS_JSON`: JSON object of key IDs to canonical standard-base64 32-byte CSPRNG AES keys; `AUTH_OUTBOX_ACTIVE_KEY_ID` names a member. Keep pending-job old keys available.
- `AUTH_LOCAL_HTTP=true` only for explicit loopback HTTP development with non-production NODE_ENV; otherwise HTTPS APP_ORIGIN and Secure cookies are required. API listener stays `127.0.0.1`.
- `MAIL_SMTP_PORT`: optional, default1025. T2 uses this fixed-loopback SMTP peer asynchronously; unavailable SMTP does not prevent startup. See its worker/retry/drain limits above.
- `AUTH_RATE_LIMITS_JSON`: optional named budget overrides from [B's guide](security.md); no guard-disable value. `AUTH_TRUSTED_PROXY_CIDRS` must be absent/empty: D1 rejects nonempty configuration because a trusted-chain implementation is not yet provided. Socket IP only; X-Forwarded-For is ignored.

Do not put secrets in Markdown, command history examples, `.env` or `.env.example`. Generate and provision independent random keys outside repository files/logs using an operator-approved secret mechanism; this guide contains no live/example key values. Builds and test runners do not load environment files.

```sh
npm run api:build
npm run api:start
```

Database URL and API port validation retain their original order/messages, ahead of identity validation. Identity B configuration, separate C keyring and mail configuration are validated before Nest creation; one asynchronous B password service is awaited before listen. Missing/invalid configuration yields only `Backend startup failed.`. There is no health-only or production bypass. Database connections remain lazy: liveness is process status, readiness is `SELECT 1`, and identity SQL failures are sanitized 503, never in-memory fallback.

## Security and transaction boundary

All nine implemented operations' responses/errors use no-store, nosniff and fresh server-generated UUID request IDs. Middleware intercepts only implemented method/path pairs before Nest's ordinary JSON parser. Other health/404/parser behavior is preserved. Mutations require exact Origin, JSON media and an actual-received 16 KiB cap before parsing/KDF work; malformed JSON/unknown fields are 422. An absent logout body is allowed, but an actual body is JSON-only. UTF-8 decoding is strict. Inputs are never echoed.

An active SQL session is authenticated before computing/validating CSRF. Every mutation carrying such a cookie, including public login, requires its HMAC token. No anonymous session or JWT is created. Invalid/revoked/idle-expired/absolute-expired cookies cannot authenticate CSRF; rejected requests never reactivate sessions. Session, CSRF and health reads do not renew idle. The stored absolute expiry is 12 hours from successful fresh sign-in; idle expiry is last_seen_at + 30 minutes, checked at equality. D1 had no authorized activity endpoint that renews idle; verified T2 account GET/PATCH adds that behavior without extending absolute expiry.

Login validates the maintained broad mailbox helper before lookup. Delivery spelling is preserved. `IdentityStore.canonicalEmail` uses PostgreSQL `lower(validatedTrimmedEmail::text)` under the database's collation for both lookup and future application writes to unique `email_normalized`; do not substitute JavaScript lowercasing, provider rewrites or an existing-data rewrite. Registration calls this same helper when creating users. Uppercase domains are still rejected before lookup. This is a technical identifier rule, not an assertion that JavaScript and PostgreSQL Unicode case mappings agree.

Known/wrong and unknown sign-ins perform the singleton B maintained Argon2 work (unknown uses dummyCheck), outside user transactions. Successful proof then takes user locks in ascending UUID order, reloads the user and rechecks the exact credential snapshot and canonical key before insert. A concurrent replacement/reset cannot use old verified credentials to create a later session. A present session's user is also locked, and persisted active state is rechecked. Existing session rows are revoked, **never retargeted to another user**. New sessions persist only the purpose-separated digest. Logout serializes on the same user lock and revokes current only. Cookie scope is HttpOnly, SameSite=Lax, Path=/, no Domain; Secure except validated local HTTP. Clear matches scope with Max-Age=0.

Abuse admission uses shared `AccountActionControl` rows: one deterministic-order transaction for the applicable IP/identifier/session buckets, conflict-safe row initialization, row locking, database clock and fixed windows. HMAC namespacing separates action and IP/identifier/session subjects; no raw email/IP/session verifier is stored in keys. General defaults are 240/minute/IP and 120/minute/active session; login additionally 30/15 minutes/IP and 10/15 minutes/canonical identifier, including nonexistent users. Counts saturate at budget. 429 has positive integer Retry-After. Storage/counter failures return 503.

Declared security deltas: rejected attempts can consume general and validated action buckets; if one bucket rejects, the other applicable buckets are still consumed in that admission transaction. Denial never restarts a window or a future successful-issuance cooldown, issues a token/job/cookie, or changes account/session state. Invalid bodies consume only the general admission. This is bounded comparable work, not a constant-time network timing claim.

## Stable D2/T3 integration API

Import `apps/api/src/identity/index.ts`:

- `IdentityModule.register(databaseDynamicModule, validatedConfiguration, ports?)`: use the **same DatabaseModule.register object** in root and identity imports. One PrismaService/pool; no global duplicate provider.
- `IdentityRuntime`: owns `configuration`, `store`, and one initialized `passwords` service. Reuse it for all later credentials, never instantiate another B password service. D1 methods: `generalAdmission`, `login`, `logout`.
- `IdentityStore`: `transaction`, `now`, `canonicalEmail`, `findUser`, `lockUsers`, `authenticate`, `activeInTransaction`, `admit`. `IdentityTransaction` is the existing Prisma transaction client. Hash/send outside transactions; user locks precede session/token/job changes. Recheck active contexts under the user lock for later mutations.
- `AuthenticatedContext`: sessionId, persisted user, verifier and absoluteExpiresAt, internal only; never serialize it. `publicUser` returns only whitelisted fields.
- `AdmissionBucket`, `IdentityHttpError`, `publicIdentityError`, `readSessionCookie`, `readIdentityJson` and `installIdentityTransport`: common persistence/error/transport contracts. Extend the explicit route allowlist when implementing a real later operation, not before.
- `readIdentityRuntimeConfiguration`: composes B security, C opaque keyring and mail configuration from a supplied env object. It does not read files.

`createApplication(configuration, {identity: {beforeCredentialCommit}})` has an optional trusted composition-only observability/synchronization callback after real KDF proof and before mutation locking. Tests use it to orchestrate a deterministic competing password writer. It cannot replace password work or authorization and is never supplied from HTTP/environment/test flags. Ordinary CLI startup supplies no callback.

C continues to own crypto and transactional mail primitives. T2 integrates one caller-owned issuance transaction and nonoverlapping worker; all17 D2 cases and the real SMTP deadline passed parent and independent checks, including lifecycle/rollback/outage/profile paths. The original writer timeout remains a historical failure. Reuse that runtime for T3, not another worker. See [lifecycle, cooldown integration and retained limits](registration-profile.md#live-worker-ownership-and-shutdown).

## Focused verification and limits

Run sequentially, each foreground with a 30-second outer budget:

```sh
npm run api:build
node scripts/test-p33-identity-http.mjs
node scripts/test-backend.mjs
node --test tests/p31-contracts.test.mjs
```

The build generates unchanged Prisma source locally. Both runners use cached `postgres:17.10-bookworm` (`--pull=never`), fresh unique owned containers and tmpfs, apply existing SQL migrations with the driver, and compile via Node createRequire resolution into `.build/api`. They require generated Prisma source from the build; they do not install dependencies, regenerate a client independently, use Compose, load env files or access development PostgreSQL/Mailpit data/volumes. Keys/credentials are generated in memory. No SMTP fixture is needed for D1. Each runner has a 26-second work deadline and bounded owned cleanup, no timeout retry.

Public HTTP assertions cover credentials, mailbox/Unicode/body boundaries, session/CSRF/revocation/cookie effects, general/IP/identifier/session rates, shared/atomic admission, fixed-window expiry, deterministic stale-hash interleaving, startup failures, SQL outage, health/404/body regressions and Secure configuration. Owned fixture SQL seeds users/sessions; a competing writer performs the password replacement. Assertions use public responses, not post-request storage reads or debug routes. The backend regression separately checks CLI startup, original config priority and framework close/pool release. Offline OpenAPI checks retain all twelve operation contracts and now verify seven implemented/five planned statuses; they are not runtime security proof. Current combined and grouped commands/evidence are in the [registration/profile guide](registration-profile.md#reproduce-and-evidence-limits); the D1 commands above are not a request for a new sweep.

### Historical outage evidence: earlier failures retained, D1 subsequently closed

The following paragraphs describe the earlier investigation and then-pending disposition. D1 subsequently passed independent build0/HTTP21/backend8/contracts9 and its native disposition was closed at the D1 checkpoint. Current T2 parent regressions also passed D1 21/backend8/contracts9; current T2 remains explicitly natively unreviewed by human choice, not covered by old D1 approval. Historical reset causation is still unknown.

The original writer observed21/21pass, but the parent's later once-only seam returned20/21pass with fetch/read ECONNRESET in the SQL/counter outage case. The original capture did not identify which of its four requests failed. Preserve both observations; the self-pass does not override the parent failure.

The existing outage test now emits constant phase labels and bounded socket/status metadata, never request inputs, headers, payloads or arbitrary error messages. It still requires actual wire503/session and503/login with full identity error envelopes,200/liveness with its fixed body, and503/readiness with its fixed unavailable body. A reset is a failure, never a substitute HTTP status. Finally-unpause and owned-container cleanup remain mandatory.

One bounded diagnostic and one fixed two-case recheck (existing outage case plus existing normal health/404/body control) passed. The diagnostic observed idle socket reuse but did not reproduce a reset, so pooled-client causation remains unproven. At that follow-up no production transport/persistence change or fixture isolation was selected. This was partial diagnosis, not a corrected root cause, a new full21 pass or independent approval. See [the attributed follow-up](../../work-log/2026-10-15-mva7tp2v-p33-identity-http.md#follow-up--parent-seam-failure-task-mva8ozc1-p-bg99) for exact commands and retained evidence. No general CLI test-filter option or production test flag was introduced.

Under L12, the outage case now starts its own application through the existing configuration/pool/lifecycle helper. Earlier tests' unconsumed responses and synchronous startup children therefore no longer share this fixture's application/origin lifetime. That is source-level test decontamination, **not evidence of the historical reset's cause or a production fix**. The original failed request and cause remain unknown, including after the separately recorded successful correlated capture.

Before pause and after unpause, consumed session/readiness HTTP responses must be healthy (`200 {authenticated:false}` / `200 {status:'ready'}`), with the existing security/cache assertions. Warm reads exercise the dedicated SQL pool before outage. All four original pause requests still require `503 SERVICE_UNAVAILABLE`, `503 SERVICE_UNAVAILABLE`, `200 {status:'ok'}` and `503 {status:'unavailable'}`, including their original body/security conditions. Each must use the identical client socket object as a completed healthy warm request, with exactly one observed send, expected wire status, completed response transport and no transport error. Only sanitized phase/socket/status metadata is emitted; numeric client/server IDs are not treated as TCP pairing proof. Fetch defaults, dispatchers, timeouts and connection policy are unchanged; no request retry or reset-as-503 allowance exists. The global app tracker closes the dedicated app once; observer subscriptions/listeners are removed in finally, and pause has finally-unpause plus owned-container cleanup.

The once-only changed-fixture full run returned20/21: my newly added healthy-readiness assertion initially expected `ok` instead of the existing `ready`, failing before pause. After that single expectation correction, the authorized targeted recheck passed2/2, with all four outage responses confirmed on warmed client sockets and healthy controls before/after; compiler0/cleanup0/stderr empty. This is **not** a corrected full-suite pass or independent approval. Exact results/logs and the partial handoff are in [the isolation writer record](../../work-log/2026-10-15-mvabi7zz-p33-d1-test-isolation.md). Parent must independently scrutinize the isolation/reuse adequacy and dispose D1 before any D2 handoff.

Normal framework close is exercised; Windows signal-driven graceful shutdown and production proxy/provider behavior remain unproven. D2 registration/profile concurrency now has scoped independent public proof; Verification token/resend concurrency subsequently received scoped independent proof; recovery/password-change concurrency was unimplemented/unproven at that historical checkpoint and later received [full P3 proof](../../work-log/2026-10-17-p3-verify-final.md). This cohesive source/test/doc unit exceeds a 400-line review target; do not compress or drop cases. Parent owns independent review, disposition, Git and phase status.
