# P3.1 — Account/session contract and security policy

**Verified checkpoint:** all twelve backend operations and the local account web journey are implemented and independently verified. [Current independent proof](../work-log/2026-10-17-p3-verify-final.md): backend99PASS, controls39PASS, real browser10PASS, live web16PASS, rejection invariants9PASS, baseline comparisons7PASS, strict builds and owned cleanup0. [Web guide](../p3-web.md), [recovery](../password-recovery.md), [password change](../password-change.md). P3 is completed locally. Native review is off/global, disabled/unmanaged; earlier failed and partial checks remain historical evidence. This account proof predates P4/P5; the [main roadmap](../implementation-roadmap.md) records their later integration and P9 publication separately. No deployment is claimed.

## Authority and confirmed policies

Product rules come from [functional-spec sections2,3and12](../foxmind-v1-functional-spec.md); user selections are recorded in the [coordinator record](../work-log/2026-10-15-01a13fc3-p31-contracts.md). P3 completion and later integrated status are recorded in the [main roadmap](../implementation-roadmap.md); this policy section does not override them.

- Passwords:16–128Unicode code points; no silent truncation, trimming, normalization or mandatory character-class composition. Names: at most80code points each, count raw input including surrounding whitespace; reject whitespace-only required text.
- Verification token:1hour. Recovery token:15minutes. Single-use, purpose-bound; resend minimum60seconds and invalidates previous links for that purpose. Server UTC determines expiry; at the expiry instant a link is invalid.
- Unverified users may sign in but are limited to verification/resend/sign-out and necessary session/CSRF introspection. No classroom create/join/invitation acceptance/content; no profile editing before verification.
- Sessions:30minutes idle,12hours absolute. Activity does not extend the absolute deadline. Session/CSRF polling and health checks do not refresh idle activity; ordinary authorized user interactions may do so.
- Profile password change requires the current password, revokes other sessions and rotates the current identifier. Routine rotation retains the original absolute deadline; a new successful sign-in starts a new12-hour lifetime. Recovery revokes all previous sessions and does not automatically sign the user in or change email-verification status.
- Duplicate registration has the same202body as a new valid registration; it never overwrites the existing password/profile, creates a session, enrolls, accepts an invitation or silently bypasses resend controls. The duplicate path issues/replaces no account token or mail job and does not change successful-issuance cooldowns; documented abuse-attempt buckets still apply. Existing users may sign in or recover access.
- Email is read-only in the profile. No Google login, avatars, account deletion, remember-me option, public role selection, bearer/JWT/refresh flow or session-management UI is added.

## HTTP and client contract

Base path:`/api/v1`. Requests with bodies use JSON only; unknown fields are422, unsupported media415, body limit16KiB (413). Safe GETs never consume account tokens or grant authentication. All identity/account responses, including errors, use `Cache-Control:no-store` and `X-Content-Type-Options:nosniff`.204has no body. Errors contain a stable code and server-generated requestId, optional whitelisted field issues, never input/password/token/stack echoes. Frontend supplies localized copy.

| Method/path | Request | Success | Access/effects |
|---|---|---|---|
| GET `/auth/session` | none |200anonymous or authenticated state | Own identity/verification state only; invalid/expired cookie becomes anonymous and is cleared. No idle refresh. |
| GET `/auth/csrf` | none |200session-bound CSRF token | Valid session, verified or not; no idle refresh or credential disclosure. |
| POST `/auth/register` | firstName,lastName,email,password |202accepted | Anonymous flow; generic duplicate behavior; new account/token/mail job committed together, no auto-login. |
| POST `/auth/login` | email,password |200authenticated session | Same401for unknown email/wrong password; unverified login succeeds with emailVerified:false. Rotate present session on success, not on failed credentials. |
| POST `/auth/logout` | none |204 | Revoke current session only and clear cookie; absent/expired session is idempotent204. |
| POST `/auth/email-verification/resend` | none |202accepted | Authenticated unverified user;60-second minimum and configured abuse limits; verified user409. |
| POST `/auth/email-verification/confirm` | token |200verified | Single-use proof; no login/enrollment. If same user is already signed in, rotate current identifier; wrong signed-in account gets generic400without consuming the token or switching identity. |
| POST `/auth/password-recovery/request` | email |202accepted | Identical body for existent/nonexistent accounts; no account change before valid reset. |
| POST `/auth/password-recovery/confirm` | token,newPassword |204 | Valid single-use recovery; revoke all previous sessions, clear browser cookie, no auto-login. Wrong signed-in account gets generic400without mutation. |
| GET `/account` | none |200profile | Valid verified session only; own fields, no global teacher/student role. |
| PATCH `/account` | firstName and/or lastName |200profile | Verified session; at least one field, no email/role/password updates here. |
| POST `/account/password` | currentPassword,newPassword |204 | Verified session and current-password proof; revoke others, rotate current cookie and CSRF binding. |

Email canonicalization is a technical identity rule: trim surrounding email whitespace, compare case-insensitively and preserve accepted delivery spelling; never apply provider-specific dot/plus rewrites. Explicit user amendment during P3.2: the domain must already be lowercase, including Unicode. Reject uppercase domains with422before account/token/outbox issuance or SMTP, regardless of account existence and before any validator/IDNA case conversion; never silently lowercase them. Preserve local-part case, dots and plus. P3.3's confirmed broad format includes quoted local parts (including spaces), UTF-8 local parts and international DNS domains, represented by OpenAPI `idn-email`. One bare mailbox only: no display names/lists/IP domains, and reject controls before outer trimming. Invalid syntax is422regardless of account existence. Names/passwords are not trimmed to make oversized input pass validation.

The shared public `validateMailbox(input: unknown): string` in `apps/api/src/mail/index.ts` uses maintained `validator.isEmail`, returning preserved trimmed delivery spelling or sanitized `MAIL_INPUT_INVALID`. Login and registration both call it before lookup/writes and translate that error to422. IdentityStore canonicalizes the accepted trimmed input with PostgreSQL `lower(text)` for lookup and future `email_normalized` writes, preserving delivery spelling separately. No existing data is rewritten, and JavaScript lowercasing is not assumed equivalent to PostgreSQL Unicode behavior. Canonicalization is not mailbox-helper behavior. Standard SMTP/MIME/SMTPUTF8/IDNA wire representation is distinct from stored identity: an international domain may appear as its ASCII A-label on the wire, while stored/displayed account input stays unchanged. The [sender guide](../mail-sender.md#delivery-spelling-versus-wire-representation) and real isolated Mailpit tests specify exact local-part preservation and domain IDNA equivalence.

### Cookie, origin and CSRF

- Browser session is an opaque32-byte CSPRNG value encoded as43base64url characters, never returned in JSON or stored in localStorage/sessionStorage. Server stores a context-bound SHA-256 digest, not the cookie value; fast digests are appropriate for random verifiers, not passwords.
- Cookie name:`foxmind_session`; HttpOnly, SameSite=Lax, Path=/, no Domain. Secure is mandatory outside explicit loopback-only local HTTP mode. Cookie lifetime never exceeds remaining server absolute expiry; clear using the same scope with Max-Age=0.
- Web uses one browser origin; the future Next.js transport proxy forwards cookies/Set-Cookie to the sole NestJS authorization owner. No second business/permission layer, wildcard CORS or arbitrary forwarded-origin trust. Exact `APP_ORIGIN` is required; all mutations reject missing, null or different Origin (403). Local example:`http://127.0.0.1:3000`; production requires HTTPS.
- Every mutation carrying a valid session also requires `X-CSRF-Token`, including otherwise-public login/registration/recovery actions. Session-required mutations always require it. Anonymous mutations use strict Origin plus JSON/body rules; there is no anonymous Session row or artificial authentication grant. Public logout without a valid session still clears the cookie.
- GET `/auth/csrf` returns a domain-separated HMAC-SHA-256 value bound to the current secret session verifier and a server CSRF key. It contains no raw session ID. Validate in constant time; rotation/revocation/expiry makes old bindings unusable. Fetch a fresh token after rotation. SameSite is defense in depth, not the only CSRF control.

### Token and email lifecycle

- Generate each account token from32CSPRNG bytes. Store only a purpose-separated digest in AccountToken; check purpose,user,expiry,consumed_at and invalidated_at atomically. No generation field or anonymous session is assumed to exist.
- Email links use a configured trusted frontend origin and a token fragment, not a token-bearing backend GET/query: `/verify-email#token=...` and `/recover-password#token=...`. The future UI removes the fragment before other resources load, holds it in memory only and requires explicit confirmation before the POST. Link scanners/prefetch must not consume a token. No raw link/token in logs or analytics; sensitive pages use no-referrer and no third-party assets before clearing the fragment.
- Hash-only tokens cannot be reconstructed for deferred mail. The technical outbox design therefore permits a short-lived **encrypted**, not plaintext, token in the existing BackgroundJob JSON payload: authenticated AES-256-GCM envelope with random nonce, keyId and tag; bind jobId,tokenId,userId,purpose,expiry as associated data. Keys remain outside PostgreSQL in the environment/keyring, never in logs or repository. This design is implemented for registration and verification replacement issuance; verification consumption/resend are independently verified. Recovery remains planned.
- Only the mail worker decrypts; wipe the encrypted secret after confirmed send or expiry/cancellation. Check token invalidation/expiry before sending and do not retry stale work. Already in-flight email may still arrive after resend, but its old link must remain invalid. Key rotation retains decryption keys for pending valid jobs; unavailable keys fail closed.
- Account/token/outbox state and successful issuance cooldown updates are transactional. SMTP failure never verifies an account, publishes a result or makes an API claim that delivery succeeded.202means durable acceptance, not delivered email. Before that commit, storage/outbox unavailability returns503without partial account/token changes.
- Verification/recovery never accept a classroom invitation; invitation7-day validity and explicit acceptance belong to P5, not these account tokens.

## Security/abuse configuration

These are the full identity design defaults. The backend enforces all declared identity, recovery and password-change policies. Do not weaken confirmed TTL/password/resend/session policies via silent environment overrides.

| Setting | Contract |
|---|---|
| Session idle / absolute |1800/43200seconds, server UTC; reject at either boundary. |
| Verification / recovery / resend |3600/900/60seconds, fixed V1 policy. |
| Password hashing |Argon2id with per-password random salt, minimum m=19456KiB,t=2,p=1; encoded PHC hash. Select/benchmark a maintained implementation in P3.3, never substitute plain SHA-256. |
| Public body cap |16384bytes, before password hashing; Unicode validation before persistence. |
| `APP_ORIGIN` |One exact configured browser origin, no credentials/path/query/fragment/wildcard; HTTPS unless explicit loopback local mode. |
| `AUTH_CSRF_HMAC_KEY` |Independent random key of at least32bytes; no hardcoded default or raw session in output. Missing/invalid key prevents identity-module startup. |
| `AUTH_ABUSE_HMAC_KEY` |Independent random key, at least32bytes, for identifier/IP bucket keys; do not persist raw rejected emails/IPs in bucket keys. |
| `AUTH_OUTBOX_KEYS_JSON` / `AUTH_OUTBOX_ACTIVE_KEY_ID` |Environment-supplied AES-256 keyring/current key ID; explicit versions and unique nonces, no plaintext persistence/fallback. |
| `AUTH_LOCAL_HTTP` |Default false. May be true only for explicit local mode with loopback-only HTTP APP_ORIGIN and API binding; never disables Secure for a remote origin. Identity startup now requires validated keys/config even for a server used only for health checks; there is no health-only bypass. |
| `AUTH_TRUSTED_PROXY_CIDRS` |Empty by default (socket peer only). D1 rejects nonempty CIDR configuration because trusted proxy-chain handling is not implemented; arbitrary forwarded headers are ignored. A future explicit implementation must not let caller headers bypass origin/IP controls. |
| `AUTH_RATE_LIMITS_JSON` |Overrides only the named action budgets below; positive integer limits/windows and resend cooldown at least60seconds. Unknown actions/invalid configuration fail identity-module startup, never disable a guard. `session-read`/`csrf-read` inherit the general identity budget. |

### Initial rate limits

Apply both IP and normalized-identifier/user buckets where listed, including nonexistent-account identifiers. All values are configurable operational limits; the fixed60-second resend rule remains a floor. Use trusted server time and atomic shared counters, not per-process memory alone. No permanent account lockout.

| Action | IP bucket | Identifier/user bucket |
|---|---|---|
| Registration |30/hour |1accepted request/60seconds per normalized email |
| Sign-in attempts |30/15minutes |10/15minutes per normalized email |
| Recovery request |20/15minutes |3/15minutes plus60-second cooldown per normalized email |
| Verification resend |60/hour |5/hour plus60-second cooldown per authenticated user |
| Verification/reset token redemption |30/15minutes |No raw-token bucket/log; purpose/token-state checks still apply |
| Password change |20/15minutes |5/15minutes per authenticated user |
| Profile updates |120/15minutes |30/15minutes per authenticated user |
| All identity/account requests (including logout and reads) |240/minute |120/minute per authenticated session when present |

429uses the same generic RATE_LIMITED code and positive integer Retry-After seconds, without account-existence or delivery-state hints. Determine identifier throttling independently of whether a user exists. Do comparable work for valid new/existing registration/recovery and known/unknown login paths; avoid account-dependent quick exits. Do not claim mathematical constant-time network responses.

Rejected validation/credentials/tokens/authorization must not change account data, passwords, verification, membership, token consumption, sessions or mail issuance. **Abuse-attempt counters may increment as explicitly designed**, including rejected attempts; tests must assert that declared delta rather than pretending every counter stays unchanged.429does not issue a token, invalidate an earlier link or restart a successful-issuance cooldown. Invalid verification/reset leaves the token/user/session states unchanged.

## Atomicity and required implementation checks

Serialize credential/token/session-changing operations for the affected user. A login that verified an old password before concurrent reset/change must recheck the credential snapshot after obtaining the mutation lock, or fail; it must not create a new valid session using a stale password after revocation. Resend/consume races must issue at most one accepted current token; a consumed/invalidated/expired link never gains enrollment or auth state. Establish consistent lock order and assert outcomes using the public API against isolated PostgreSQL in P3.3.

Full-scope acceptance examples (T2 runtime evidence is in the [identity guide](../identity-http.md) and [registration/profile guide](../registration-profile.md); verification cases now have [scoped independent proof](../account-verification.md); recovery/password-change cases now have independent backend and real-browser proof):

- 15/129-character password rejected;16/128accepted. Raw81-character name rejected even with surrounding spaces;80accepted if not whitespace-only.
- Valid registration new/existing email returns identical202shape; duplicate path preserves original account/password/session and creates no implicit invitation acceptance.
- Unknown email/wrong password share401shape; valid unverified sign-in returns authenticated state but classroom/profile gates remain closed.
- After30minutes idle or12hours absolute, old cookie cannot authorize; session/CSRF background polling cannot extend either policy.
- At token expiry, after consumption or after resend, link rejected with the same400code; rejected reset/verification leaves records unchanged except documented abuse counters.
- Resend at59seconds gives429with remaining Retry-After; at60seconds may issue if other limits permit. Recovery unknown/existing shares202and identifier controls.
- Password change rotates current cookie/CSRF, invalidates other devices, preserves current absolute deadline. Recovery invalidates every previous session and requires sign-in again.
- Missing/wrong Origin or CSRF cannot change protected state; public actions carrying a valid cookie cannot omit CSRF. Stale cookies are cleared without granting a user.
- Duplicate concurrent confirmation accepts once; concurrent reset/change/login cannot resurrect revoked credentials. A mail/key failure cannot leave plaintext or claim successful delivery.

## Verification boundary and handoff

P3.1 completion requires structural/reference/example consistency checks of the contract, independent security/requirements review, and attributed agent records. `node --test tests/p31-contracts.test.mjs` checks local structure/references, selected schema boundaries and synthetic examples without new dependencies; it is not a complete OpenAPI/JSON-Schema validator (including format assertions). Per-operation `x-error-codes` narrows the shared error-envelope union. These are documentation checks, not an authentication behavioral RED/GREEN. It does not prove these endpoints execute, passwords are hashed, email is delivered, counters are atomic or sessions are secure in runtime. Existing53foundation tests are historical baseline evidence, not identity acceptance tests.

P3.2 local captured-email preparation is completed: [capture operations](../local-email.md), [standalone sender](../mail-sender.md) and [verified handoff](../work-log/2026-10-15-01a13fc3-p32-local-email.md). P3.3 T1 mailbox compatibility now resolves the earlier ASCII-subset advisory: public helper/sender checks and real fresh Mailpit capture pass for quoted-space and Unicode-local/international-domain delivery, with unchanged mixed-case/dot/plus spelling and uppercase-domain rejection. See [writer evidence](../work-log/2026-10-15-mva3zlb4-p33-mail-compatibility.md); this is not independent review or identity HTTP evidence. The mailbox unit itself implemented no identity endpoint. Subsequent T2 implements session/CSRF/login/logout plus registration/profile/verification issuance and live outbox integration, now with accepted parent56PASS/build0 and independent33PASS/compiler0/cleanup0. These are attributed runtime results, not proof from this offline contract suite. Earlier incomplete writer checks and timeouts remain historical failures in the linked D2 evidence. Subsequent T3-V confirmation/resend passed parent72 and independent41 checks with real builds/owned cleanup; recovery request/confirmation and password change were still absent at that historical nine-operation checkpoint, then accepted by the final P3 report linked above. T2 uses shared atomic attempt admission: a denied bucket may still consume other applicable attempt buckets, while invalid bodies consume only general admission; rejected requests never issue credentials or mutate account/session state. T2 seven-operation acceptance does not complete P3.3/all P3 or authorize frontend work. Historical T2 was explicitly natively unreviewed by human choice; no native approval or future review exemption is claimed.

## Primary technical references

- [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
- [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
- [OWASP CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
- [OWASP password recovery](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).
