# P3.3 T2 D1 — Four-operation identity HTTP implementation

- Agent / role: delegated implementation writer.
- Task ID: mva7tp2v-o-g24c (received after the preliminary unavailable-ID record).
- Date: 2026-10-15.
- Branch: feat/p33-identity-http.
- Starting commit: 37ab57911c6f4cab1b3559b6394adbbbfc7684e5.
- Phase/specs: [P3.3 T2 D1 / S1–S7](../../odd/tasks/p33-accounts-auth.md).
- Status: completed for D1 implementation/assigned checks only, not all T2/P3.3 or independent/native approval.

## Request and scope

Original request: "Vamos con el siguiente"; continuation: "Continua con la implementacion. Te autorizo a que hagas lo necesarios para cerrar esta parte de P3". Parent delegated only GET auth/session, GET auth/csrf, POST auth/login and POST auth/logout plus reusable runtime/transport/persistence, focused tests and matching docs. D2 registration/profile and T3 five token/password operations remain separate. No frontend, classroom/role/enrollment implementation, migrations, dependency changes, Git mutations, publication or native lifecycle. Parent-owned feature/coordinator changes were preserved. T1 proof was context, not rerun authorization.

## Work performed

Read both exact injected work-unit/backend skills successfully before repository inspection; read roadmap, work-record protocol, full feature header/specs/bindings/tasks/log, functional-spec sections2/3/12, full account OpenAPI/guide, B/C/mail guides and actual backend/security/database/schema/constraints/tests. Initial record preceded source writes at [unavailable-ID preliminary record](2026-10-15-unavailable-d1-p33-identity-http.md); parent subsequently supplied this actual task ID. CodeGraph status reported not initialized; initialization would write outside delegated surfaces, so scoped inspection was used.

Changed paths:

- `apps/api/src/identity/`: actual Nest IdentityModule/public index, validated configuration composition, IdentityRuntime, SQL persistence/admission helpers, transport and sanitized errors.
- `apps/api/src/application.ts`, `configuration.ts`: one DatabaseModule dynamic object shared by root/identity; mandatory B/C/mail validation and async singleton B password initialization before listen. Original main.ts/loopback/prefix/logger/health lifecycle retained.
- `scripts/p33-identity-test-env.mjs`, `test-p33-identity-http.mjs`, `test-backend.mjs`: ephemeral in-memory identity keys, cached-image fresh owned PostgreSQL/tmpfs, SQL migration fixture setup, createRequire compiler resolution, bounded foreground tests and cleanup. No development database, Mailpit data/volume, environment file, dependency mutation or account-mail producer.
- `tests/p33-identity-http.test.mjs`:21 named public HTTP contracts; `tests/backend.test.mjs`:8 health/configuration/CLI/404/body/lifecycle regressions.
- `docs/api/accounts-sessions.openapi.json`, `accounts-sessions.md`, `tests/p31-contracts.test.mjs`: exactly four implemented/eight planned; retain all twelve schemas and offline coverage.
- `docs/identity-http.md`, `docs/backend.md`, `README.md`: actual startup requirements, integration API, contracts and limits.

### Assigned-spec self-review

| Spec | D1 coverage and boundary |
| --- | --- |
| S1 | Exactly four authorized real operations. Eight later operations/classrooms404; no broader P3 completion. |
| S2 | Contract-shaped session/CSRF/login/logout, request IDs, no-store/nosniff, strict Origin/media/actual16KiB/JSON/unknown fields, raw password boundaries, cookies, expiry/revocation and no idle refresh. Registration/profile/token rules remain planned. |
| S3 | validateMailbox before lookup, broad preserved delivery spelling, uppercase-domain rejection; PostgreSQL lower(text) is the single canonical lookup/future-write rule, no JS equivalence assumption or data rewrite. |
| S4 | Real singleton B Argon2/dummy work outside user transactions, opaque fresh session and digest-only storage, active session before HMAC-CSRF, no JWT/anonymous row, mandatory validated B/C/mail startup and sanitized failures. |
| S5 | C keyring validated before listen; no D1 token/job producer, SMTP call or scheduler, so no live encrypted-mail integration claim. D2/T3 must reuse C. |
| S6 | Existing shared AccountActionControl, namespaced HMAC keys, atomic fixed windows and unknown identifiers, positive Retry-After, storage503/no memory fallback; ordered user locks and stale-hash/current-session rechecks before fresh row insert; never retarget user. |
| S7 | Source/test/docs together; parent dirty files preserved; no Git/native lifecycle action or old-lineage/T1 suite replay. All assigned commands observed foreground within30seconds. |

## Test-first and correction timeline

1. RED — `node scripts/test-p33-identity-http.mjs`: exit1;18 tests,1pass/17fail. Intended first failure was session404 !=200; login/CSRF/logout likewise absent. Startup invalid-key case failed because baseline did not reject it; child timeout was reported, not hidden. Elapsed26347ms, owned cleanup0. Existing unrelated health/404/body contract passed. No implementation yet.
2. First build — `npm run api:build`: exit1, TS2305 (MailError is not re-exported by mail/index) plus related TS18046. One bounded correction imported the existing exported class from mail/mail-error.ts; no mail source change or dependency workaround.
3. Build after correction — same exact command exit0; Prisma7.10.0 generated locally and TypeScript compiled.
4. GREEN — `node scripts/test-p33-identity-http.mjs`: exit0,18/18pass, elapsed19915ms, cleanup0. No product-test correction was needed.
5. TRIANGULATE/REFACTOR — added alternate exact-byte/IP-budget/logout-login-interleaving assertions without changing their already implemented behavior; reused B policy/window exports and removed dynamic imports while retaining the four-operation boundary. Runners now compile locally via createRequire and backend starts mandatory real identity config.
6. Offline metadata RED — `node --test tests/p31-contracts.test.mjs`: exit1,8pass/1fail, expected partially-implemented versus existing contract-only-not-implemented. Updated only truthful four-operation statuses after observed HTTP proof; retained all schema/policy/example checks.
7. Final checks below all passed. No automatic timeout retry, A/B/C suite, full baseline or audit rerun occurred.

## Final verification of assigned snapshot

All commands ran one at a time in the foreground with30second tool limits:

| Exact command | Observed result |
| --- | --- |
| `npm run api:build` | exit0; Prisma Client7.10.0 generated in233ms; no TypeScript errors. Build tool supplied combined stdout/stderr, not separately persisted streams. Output included normal Loaded Prisma config/schema and Generated Prisma Client messages. |
| `node scripts/test-p33-identity-http.mjs` | exit0; compiler0;21 tests/21pass/0fail/0skip/0cancel; Node duration14189.1948ms; runner elapsed18091ms; owned cleanup0. Captured child stderr had no diagnostics. |
| `node scripts/test-backend.mjs` | exit0; compiler0;8 tests/8pass/0fail/0skip/0cancel; Node duration7931.3444ms; runner elapsed11855ms; owned cleanup0. Captured child stderr had no diagnostics. |
| `node --test tests/p31-contracts.test.mjs` | exit0;9 tests/9pass/0fail/0skip/0cancel; duration71.6781ms; no stderr diagnostics observed. |

Additional safe inspection: `git diff --check && git diff --stat && git status --short` exited0 before final checks; only CRLF conversion warnings, no whitespace defects. Generated source/build outputs stayed within authorized `.generated/prisma`/`.build/api`; no tracked schema/migration/package changes. No build/functional check was omitted or substituted with a review claim.

Named HTTP contracts cover: anonymous session and protected CSRF; verified/unverified preserved mailbox login; wrong/unknown credentials and DB case comparison; exact Origin/forwarded-header rejection; JSON/media/fields/raw Unicode; chunked and exact byte limits; authenticated public-mutation CSRF and failed-login preservation; logout/current-only/matching clear; logout/login interleaving; expired/revoked/malformed cookies; safe-read idle expiry; cross-instance unknown-ID windows; concurrent atomic unknown-ID admission; distinct-ID sign-in IP limits; general/session limits and spoofed XFF; deterministic stale-hash interleaving; missing/invalid B/C/mail/proxy config before listen; Secure cookie configuration; real SQL/counter outage and liveness; unchanged health/unknown-body/eight planned404s. SQL seeds owned fixtures; the race uses a competing locked password writer, never post-request storage assertions. No admin/debug route.

## Public runtime handoff for D2/T3

Public entry: `apps/api/src/identity/index.ts`.

- IdentityModule.register(sharedDatabaseDynamicObject, validatedConfiguration, trustedPorts?) and IdentityRuntime.
- Runtime owns configuration, store, passwords (one async initialized B service), generalAdmission/login/logout.
- IdentityStore.transaction/now/canonicalEmail/findUser/lockUsers/authenticate/activeInTransaction/admit; IdentityTransaction, AuthenticatedContext and AdmissionBucket types.
- publicUser whitelist, IdentityHttpError/publicIdentityError, readIdentityJson/readSessionCookie/installIdentityTransport and readIdentityRuntimeConfiguration.
- Optional beforeCredentialCommit trusted DI callback only synchronizes observation after real proof; no HTTP/env flag or alternate authentication path. CLI supplies none.

D2 must use PG canonicalEmail for new email_normalized writes and existing unique index, reuse password instance/ordered user lock/counters, implement real registration/account GET/PATCH and transactional C issuance before expanding the route allowlist. T3 adds remaining five operations. C continues to own crypto. No mail scheduler or token producer needs shutdown in D1; a later scheduler must be bounded/nonoverlapping, outside transactions, and stop/await on close.

## Risks and limits

- Risk2 / security: D1 checks pass, but independent security review is parent-owned; no production readiness, mathematical constant-time claim, trusted proxy-chain implementation or production SMTP provider. Nonempty proxy CIDRs deliberately fail startup rather than silently trusting XFF.
- Risk4 / concurrency: D1 atomic admission, stale-credential and logout/login outcomes pass. Actual D2/T3 registration/reset/change/verification/outbox races remain future proof; this slice does not claim them.
- Risk5 / startup/environment: mandatory keys/origin/outbox/mail config is an intentional startup change, including health use. Cached PostgreSQL image and build-generated Prisma source are test prerequisites. Windows signal-driven graceful shutdown is unproven; framework close is observed. Build output streams were combined by the tool.
- Cohesive implementation/test/doc workload exceeds400authoredlines; no compression or test removal. Parent owns review-workload disposition and final seam check. No native approval is claimed.

## Commits and outcomes

No commit/stage/publication action. Starting commit remains the only observed implementation boundary; parent will record a resulting commit later. Shared roadmap/feature/coordinator metadata is parent-owned and was not edited by this writer.

## Handoff

D1 source and all four assigned final commands pass. Parent next action: review the D1 candidate/record and perform its once-only seam check and independent/native disposition as applicable, then delegate D2's three operations using the public runtime above. Do not mark all T2/P3.3 complete or replay burned T1 lineages. Preliminary unavailable-ID record is retained only to preserve before-source attribution; this actual-ID record is authoritative for outcomes.

## Follow-up — Parent seam failure (task mva8ozc1-p-bg99)

- Agent / role: bounded correction writer, newly started continuation.
- Actual follow-up task ID: mva8ozc1-p-bg99. Original implementation remains attributed to mva7tp2v-o-g24c; inherited same-ID wording was incorrect. Parent reports the first correction dispatch failed schema validation with zero worker starts; this is the sole running correction.
- Status: partial — diagnostic observability and targeted recheck completed, but original ECONNRESET causation remains unproven; no root-cause correction selected. Prior completion/self-PASS does not establish a green parent seam.
- Parent observed RED: `node scripts/test-p33-identity-http.mjs`, exit1/compiler0/20PASS/1FAIL/cleanup0, elapsed15810ms. Captured proof: `.test-artifacts/p33-d1-parent-http.stdout.log` and empty `.stderr.log`. Failure: named SQL/counter outage test, fetch failed/read ECONNRESET. The four calls are session503, login503, liveness200, readiness503; original evidence does not identify the failing call or cause.
- Before repair writes: reread both injected skills, actual complete updated feature including Log, current branch/HEAD/dirty state, parent stdout/stderr and this original record. Preserve all prior evidence/parent edits. CodeGraph index remains absent and initialization is outside allowed surfaces; use narrowly scoped source/phase/socket inspection.
- Bounded plan: diagnose with constant phase/socket metadata before selecting a correction, then one targeted outage+normal-control recheck within30seconds. No full21 suite, automatic retry, sleep/poll, policy weakening, exception-as503, dependency/Git/native action or D2/T3 implementation. If causation is not proven, report partial rather than label a client/fixture/product cause speculatively.

### Source inspection and bounded diagnostic

The original failure was at `tests/p33-identity-http.test.mjs:264–272` before instrumentation. Current source context: the shared fetch helper is at line42; preceding invalid-startup checks synchronously spawn eight CLI children at line256; the instrumented outage case now starts at line303. A synchronous precursor plus existing pooled HTTP sockets is a hypothesis, not a proven diagnosis. Production `transport.ts` returns sanitized errors without destroying the HTTP socket; `persistence.ts` maps SQL transaction failures to503. Inspection alone cannot exclude a product socket fault or locate the original reset.

Created a private diagnostic driver/probe under the explicitly allowed `.test-artifacts/p33-d1-outage-*` surface. It uses the existing owned PostgreSQL fixture/compiler helpers, real application/public HTTP, the original eight invalid-startup precursor scenarios and secure-login precursor, and constant phase/socket observability. No payload/header/recipient/key/URL/error-object logging, injected delays, timer overrides, retries, new adversarial sweep or production change. Fixture credentials/keys stay in memory; the four outage requests remain real HTTP assertions. Finally unpause and owned cleanup are retained.

`node .test-artifacts/p33-d1-outage-diagnose.mjs` ran once in the foreground with30second limit: exit0/compiler0/child0/cleanup0, elapsed13094ms, child timeout=false. Child stdout/stderr retained separately at `.test-artifacts/p33-d1-outage-diagnose.stdout.log` and `.test-artifacts/p33-d1-outage-diagnose.stderr.log` (empty).

Observed trace, without extrapolation:

- Default server keepAliveTimeout5000ms, keepAliveTimeoutBuffer1000ms, requestTimeout300000ms; not modified.
- One primed client socket closed during the secure-startup precursor; a different socket was reused for session after5117ms since its prior send.
- Session reached the server and finished503; login reached the server and finished503; liveness finished200; readiness finished503. A resumed normal-session control finished200. Response-close events reported finished=true.
- No client-error/ECONNRESET event occurred. Therefore neither the original failing call nor pooled-client causation is proven. Do not label this a fixed fixture race or exclude a production fault.

### Bounded instrumentation change and single targeted recheck

Changed only the existing outage test's observability/assertions, the guide and this record, plus private diagnostic/recheck artifacts. No production TypeScript, shared fetch/fixture helper, runner CLI, socket timeout, rate policy or routing change.

`tests/p33-identity-http.test.mjs:265–302` now attaches scoped diagnostics during the outage case only: constant phase labels, local numeric socket IDs, seen-during-case/destroyed booleans, server received/finish/response-close and whitelisted client error codes. It never logs request objects, headers, bodies or arbitrary error messages. Subscriptions/listeners are removed in finally. The original four wire statuses remain503/503/200/503; both identity errors still use the existing security/request-ID/envelope assertions. Health liveness/readiness now also assert their complete fixed JSON envelopes and no-store. Any fetch reset still fails the test. Finally-unpause and owned cleanup remain unchanged in intent.

A private driver has a fixed two-name allowlist, not an arbitrary user-supplied CLI test filter or production/test bypass flag. It runs the **existing** outage test and the unchanged existing normal health/404/body control only. No other21-suite equivalent was launched.

`node .test-artifacts/p33-d1-outage-recheck.mjs` ran ONCE in the foreground with30second limit: exit0/compiler0/child0/cleanup0, elapsed8257ms; Node2tests/2pass/0fail/0skip/0cancel, duration4303.8463ms; child timeout=false. Captured stdout/stderr: `.test-artifacts/p33-d1-outage-recheck.stdout.log` and `.test-artifacts/p33-d1-outage-recheck.stderr.log` (empty); result summary `.test-artifacts/p33-d1-outage-recheck.result.log`.

The exact emitted phase/status sequence was session503, login503, live200, ready503, then finally-unpause; every server-response-close during outage was finished=true. The existing normal health/unknown-route/body/eight-planned404 control passed after resume. No retry or second correction/recheck occurred. `npm run api:build` was not run: production TypeScript was unchanged; the existing helper resolved the compiler and compiled unchanged source for each private owned probe as authorized. No complete21 test rerun, backend/contract/T1/audit rerun or native action.

### Current correction outcome and missing proof

**Partial, not green final D1.** Root cause/path:line is not established: only the original failure site (old test lines264–272) and relevant source context above are known. The diagnostic and targeted recheck both passed, which cannot explain the parent's earlier ECONNRESET. One client-idle reuse observation is insufficient to prove that the failure was client pooling. No speculative fixture isolation, exception acceptance, fetch retry, timeout extension or product fix was made.

Missing proof, reported once: a phase/socket trace of the original reset that distinguishes stale pooled-client reuse from a server/product socket failure and identifies which of the four requests failed. The latest parent seam remains20/21exit1; the original writer21/21self-PASS remains historical; the new two-case PASS is narrower evidence, not a replacement. Parent owns any further diagnosis authorization, first independent full D1 verification and review disposition. D2/T3 remain unimplemented; no publication/Git action or production readiness claim.
