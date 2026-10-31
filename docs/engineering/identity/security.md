# Identity security primitives (P3.3 / T1 B)

Standalone primitives, not authentication endpoints. Import from
`apps/api/src/identity-security/index.ts`. No HTTP, Prisma, SMTP, environment-file
loading, timers or startup wiring occurs on import. Only passive digest-domain
constants are shared with the outbox. P3.2 mail and health behavior are untouched.

## Startup configuration

Call `readIdentityConfiguration(providedEnv, actualApiListenHost)` and await
`createPasswordService(capacity)` **once per identity-module instance**, before
accepting traffic. Reuse that password service for every credential operation.
Neither function reads `process.env`. Identity startup must abort on failure;
the integrated identity runtime already composes these primitives; see [startup](http.md#startup-without-environment-files) and [P3 acceptance](../../work-log/2026-10-17-p3-verify-final.md). Passive imports do not replace startup validation.

| Supplied setting | Accepted value |
| --- | --- |
| `APP_ORIGIN` | Exactly one URL origin, without trailing slash, credentials, query or fragment. HTTPS by default. No URL rewriting. |
| `AUTH_CSRF_HMAC_KEY`, `AUTH_ABUSE_HMAC_KEY` | Independent CSPRNG keys, each at least 32 decoded bytes, canonical **unpadded base64url**. No defaults; equal keys and repeated-byte placeholders are rejected. |
| `AUTH_LOCAL_HTTP` | Absent/`false`, or exactly `true` with an HTTP loopback origin (`127.0.0.1`, `[::1]`, `localhost`) and actual API binding `127.0.0.1`/`::1`. Rejected with `NODE_ENV=production`. |
| `AUTH_TRUSTED_PROXY_CIDRS` | Absent/empty means socket peer only; otherwise comma-separated IPv4/IPv6 CIDRs. This validates configuration; it does **not** enable header trust. |
| `AUTH_RATE_LIMITS_JSON` | Optional partial action/budget overrides as described below. Invalid JSON, unknown keys, nonpositive/noninteger values and cooldown below 60 fail closed. |

The result is frozen and exposes no key bytes/strings. Secret copies remain in
closures, not serializable fields. Validation cannot prove entropy: operators
must generate independent random keys outside repository files/logs. Outbox AES
keyring validation remains C's separate startup obligation; B alone does not
validate outbox availability or prove readiness of the combined identity module.

Rate actions: `registration`, `login`, `recovery-request`,
`verification-resend`, `token-redemption`, `password-change`, `profile-update`,
`general-identity`. Defaults match the account/session contract. Partial overrides
have the shape `{ "login": { "ip": { "limit": 30, "windowSeconds": 900 } } }`.
Existing `identifier`/`session` budgets use the same fields. Only recovery-request
and verification-resend accept `cooldownSeconds`, at least 60. Unknown actions or
new bucket types are rejected; session-read/csrf-read use general-identity, not
independent overrides. Registration's fixed issuance floor remains a separate
60-second policy, regardless of operational bucket overrides.

`config.assertOrigin(receivedOrigin)` enforces exact equality.
`config.abuseDigest(action, identifier)` provides a domain-separated hex HMAC for
bucket keys. The integration must namespace identifier versus IP/session inputs
and derive trusted client identity from the socket, or an explicitly trusted
proxy implementation. Do not feed arbitrary forwarded headers to this helper.
No email parser or JavaScript lowercasing is supplied here: future lookup **and
write** paths must use one DB-consistent canonical-email rule while preserving
delivery spelling from A's mailbox parser. JavaScript Unicode lowercasing is not
claimed equivalent to PostgreSQL canonicalization.

## Public primitives

- `validatePassword(unknown)` preserves raw scalar Unicode, including whitespace
  and combining marks; 16–128 code points. `validateName(unknown)` preserves raw
  spelling, 1–80 points, rejecting whitespace-only text. Neither normalizes,
  trims, composes or truncates. Unpaired surrogates are rejected.
- `validateBodyShape(value, allowed, required?, nonempty?)` rejects nonobjects,
  arrays, unknown fields, missing required own fields and empty patches. It is
  **shape only**; validate values separately. Allowed field lists must come from
  the fixed operation schema, never the request. Email validation belongs to A.
- `assertBodySize(actualReceivedBytes)` accepts 0–16384 bytes. HTTP must enforce
  the cap while reading, before JSON parsing/hashing; not just trust Content-Length.
  Transport still owns JSON-only media checks and no-store/nosniff headers.
- `generateVerifier()` creates 32 random bytes as 43 canonical base64url
  characters. `parseVerifier(unknown)` rejects padding, whitespace, malformed
  lengths and alternate encodings with nonzero unused bits.
- `accountTokenDigest(purpose, token)` returns hex SHA-256 of shared domain,
  NUL, **stored purpose** (`EMAIL_VERIFICATION` or `PASSWORD_RESET`), NUL, raw
  canonical token. `sessionTokenDigest(token)` uses the distinct shared session
  domain followed by NUL and the token. Neither returns a credential in JSON.
- `config.csrfToken(sessionVerifier)` produces a 43-character domain-separated
  HMAC-SHA-256. `config.validateCsrf(sessionVerifier, submitted)` returns false
  for malformed input and compares valid 32-byte values with `timingSafeEqual`.
  It must be called only after authenticating an active, unrevoked session.
  Revocation/expiry enforcement belongs to persistence, not this stateless HMAC.
- `sessionCookie(config, token, absoluteExpiresAt, now)` emits
  `foxmind_session`, HttpOnly, SameSite=Lax, Path=/, no Domain; Secure unless
  validated explicit local HTTP. Max-Age is floored to whole remaining seconds,
  capped at 43200, never beyond absolute expiry. Subsecond remaining lifetime
  yields Max-Age=0. `clearSessionCookie(config)` uses the identical scope.
- `newSessionWindow(now)`, `sessionIsActive(window, now)` and
  `refreshSessionWindow(window, now, activity)` use server UTC epoch milliseconds.
  Idle is 1800 seconds; absolute is 43200 seconds. Equality at either deadline is
  expired. Reads/identifier rotation pass activity=false; genuine authorized
  activity may renew idle, capped by the unchanged absolute deadline.
  Routine rotation replaces the verifier using `generateVerifier()`, never
  `newSessionWindow()`. Only successful new sign-in starts a new absolute window.
- Frozen `IDENTITY_POLICY` also exports verification=3600 seconds,
  recovery=900 seconds, resend floor=60 seconds and body cap=16384 bytes.

## Password work and errors

`await createPasswordService(capacity=2)` returns `hash(raw)`,
`verify(raw, encodedHash)` and `dummyCheck(raw)`. Capacity is an integer 1–8;
there is no waiting queue. Native async Argon2id v19 explicitly uses m=19456 KiB,
t=2, p=1, outputLen=32, with library-generated random 16-byte salts. A random
startup dummy hash uses the identical policy; unknown-account sign-in calls
`dummyCheck` rather than taking a quick exit. It always returns false. Comparable
KDF work is not a mathematical constant-time network-response claim.

All three operations share one in-flight bound. Capacity exhaustion must become
sanitized SERVICE_UNAVAILABLE/503 at the HTTP boundary, not a credential failure.
Native failures release capacity and expose no native error/cause. Encoded hash
verification accepts only this exact policy and 16-byte salts, checking parameters
before native work; corrupt/excessive PHC costs fail closed. There are no legacy
hashes to migrate. Future policy upgrades require an explicit bounded migration
strategy, not silently trusting arbitrary stored work factors.

`IdentitySecurityError` carries only a stable typed code and generic message,
never submitted values, causes, recipients, raw links, passwords or tokens. The
module has no logger. HTTP owns whitelisted field issues, request IDs, status
mapping and the contract's generic authentication/link envelopes. Never serialize
or log submitted values or native errors. No key/password/hash/token fixtures
are written to output by these tests.

## Verification and integration handoff

Run sequentially in the foreground from repository root (each within 30 seconds):

```sh
node node_modules/typescript/bin/tsc -p apps/api/tsconfig.p33-security.json
node --test --test-concurrency=1 tests/p33-identity-security.test.mjs
```

The private build writes only `.build/p33-security`, includes B plus the passive
protocol constants, and does not regenerate Prisma or compile other writers.
Tests use the public compiled index, with locally measured two-hash timing (not
upstream benchmark claims). This verifies primitives only, not HTTP/auth journeys.

HTTP/domain integration must authenticate before CSRF validation (including
otherwise-public mutations with a valid session), enforce strict Origin for all
mutations, atomically persist digests and fixed token TTL/single-use state,
serialize per-user credential changes, recheck stale credential snapshots after
locking, revoke/rotate according to contract, and use shared atomic abuse storage
that fails closed on outage. Safe session/CSRF/health polling cannot renew idle.
No anonymous Session row, JWT, bearer alternative, invitation or
email restriction is introduced here.

Rollback boundary: remove this standalone directory, its private tsconfig/test
and this guide/attributed record only before integration; do not remove shared
protocol constants, installed shared dependencies, other writers' outputs or
Mailpit volumes. Parent owns commit/review disposition and integration rollback.
