# P3.3 D2 — Registration and own profile

- Agent / role: bounded implementation writer.
- Task ID: `mvad21p6-u-458h`.
- Date: 2026-10-15.
- Branch: `feat/p33-registration-profile`.
- Starting commit: `3f63c58327508b31063c3ca91bce5d1f7be4c4f1`.
- Phase/spec: [P3.3 T2 D2, S1–S7](../../odd/tasks/p33-accounts-auth.md).
- Status: in_progress.

## Request and scope

Implement only POST /auth/register and GET/PATCH /account, transactional verification issuance and existing encrypted worker/sender lifecycle. Five T3 operations remain planned/404. No frontend, publication, schema/dependency changes or environment files. Parent owns review, Git and shared metadata. User authorization: "Cual es el inconveniento, te autorizo a que hagas lo necesario para terminar con T2".

## Work performed

Read injected skills, roadmap, work-record protocol, complete feature header/specs/bindings/tasks/log through actual L12/L13, coordinator record, current identity runtime/store/transport and account guides. Actual tree matches baseline; only parent-owned feature/coordinator metadata were dirty. D1 is closed; no historical reset investigation or review replay. CodeGraph status reports not initialized; index creation is outside the writer's allowed edit surfaces, so inspect exact scoped paths instead.

## Verification

Test-first active. RED observed before any production source writes: first runner exit1/10628ms, compiler subprocess unavailable at existing 6s cap, owned database cleanup0, no behavioral proof. Bounded runner correction removed redundant compilation (explicit api:build prerequisite, existing compiled D1 baseline inspected). Second attempt exit1/28878ms reached 17 failures but timed out because failing missing stopMail left the SMTP fixture open. Bounded cleanup correction moved scheduler-stop inside try/finally. Third RED exit1/21285ms: 0/17 pass, 17 fail, completed test report in14530ms; actual public404 versus expected202/422/401/403/415/503/200, missing profile boundary and missing stopMail. Both owned Mailpit container/volume and database cleanup0, stderr empty. The test suite covers D2 behavior before handlers exist; none of these failures is treated as GREEN. Initial harness failures are retained, no timeout extension or historical D1 probe. GREEN and required final checks pending. Required commands, each foreground at most 30 seconds: npm run api:build; node scripts/test-p33-registration-profile.mjs; node scripts/test-p33-identity-http.mjs; node scripts/test-backend.mjs; node --test tests/p31-contracts.test.mjs. No T1/baseline/audit repeat.

### Required final commands, once each in foreground

1. `npm run api:build`: tool timed out at30000ms; no successful command exit observed. Output reached npm api:build/db:generate and Prisma7.10.0 generation to .generated/prisma in2.46s; no TypeScript diagnostic was printed. Compiled candidate runtime was subsequently present, but emitted output is NOT a successful build-exit receipt. No timeout extension or rerun. A process-name-only inspection found no newly active compiler at that time; no process was killed by this writer.
2. `node scripts/test-p33-registration-profile.mjs`: exit1/27904ms. stdout reported seven PASS: durable registration/Spanish captured mail/no auto-login; raw Unicode16/128password and80name/quoted-international delivery; exact input and rejected boundaries/uppercase-domain/no issuance; generic duplicate preserving credentials/profile/session/no extra mail; concurrent case-variant one identity/issuance; default shared new/existing canonical identifier budget/positive Retry-After; shared IP denial. It then hit the existing26s work deadline before case8 reported. stderr: `Registration/profile tests unavailable or timed out`. Cleanup stdout: `Owned registration Mailpit container/volume cleanup: exit 0`, `Owned identity database cleanup: exit 0`. No final17-test count or child application destruction receipt. Do not call this GREEN17 or infer any remaining case ran.
3. `node scripts/test-p33-identity-http.mjs`: exit1/9951ms, stdout `API TypeScript compilation: exit unavailable` and owned database cleanup0; stderr `Identity HTTP runner unavailable (sanitized)`. Zero HTTP cases ran. Existing compiler6s deadline unchanged; no retry or timeout extension.
4. `node scripts/test-backend.mjs`: exit1/10384ms, stdout `API TypeScript compilation: exit unavailable`, owned database cleanup0 and runner exit1; stderr `Backend test runner unavailable (sanitized)`. Zero backend cases ran. Existing compiler6s deadline unchanged; no retry or timeout extension.
5. `node --test tests/p31-contracts.test.mjs`: exit0,9/9PASS,0fail/cancel/skip,261.5956ms, no stderr observed. These retain published four-status D1 checkpoint; no D2/profile runtime proof or seven-status claim is implied.

No named environmental failures were supplied, so these required failures force a partial handoff. Final working-tree inspection/`git diff --check` exited0 (LF→CRLF warnings only); parent-owned feature/coordinator dirty paths remain untouched. No broad suite, baseline/T1 rerun, audit, retry, after-timeout grouping or historical reset capture.

### S1–S7 coverage and explicit gaps

- S1: candidate source contains only the three D2 operations and required mail integration; no T3/front-end/classroom expansion. Seven registration tests passed; profile proof remains missing.
- S2: actual HTTP registration validation,16/128accept15/129reject,raw Unicode80/81names,mailbox errors,generic duplicate/session preservation and body/error/privacy paths passed in the first seven tests. Dedicated profile/access/CSRF/media/idle tests exist but did not finish execution. Do not infer rejected-profile or safe-read activity proof from source alone.
- S3: registration→C worker→actual sender→owned Mailpit capture passed for quoted-space and Unicode-local/international-domain input; public login preserved stored delivery spelling and name text. Uppercase-domain422/no issuance cases passed. Wire IDNA equivalence asserted with boolean predicates, never recipient/token/password assertion diffs.
- S4: code reuses one B password service, random32-byte purpose-digested tokens and existing key config, no plaintext persistence/logging/JWT/env files/dependencies. Registration KDF paths executed; new profile and exceptional mail deadline/shutdown behavior remain unproven. Startup D1 regression could not execute due compiler timeout.
- S5: new user/token/C-envelope enqueue are caller-owned one transaction in source; first registration mail was really captured asynchronously. Controlled rollback, SMTP failure queue/restart, nonoverlap/drain and SQL/counter503 tests exist but were after the timeout. Five-attempt exhaustion and exceptional12s deadline are not independently exercised here. C production implementation remains unchanged; do not restate its T1 proof as D2 proof.
- S6: actual case-variant concurrency returned generic acceptance instead of conflict503 and public login resolved the same ID; one current captured issuance. Default new/existing identifier controls and shared IP denial passed with intentionally shared HMAC/keyring. Persisted profile recheck, rollback and outage cases remain unverified. No post-request storage assertions/debug HTTP were used.
- S7: own actual-ID record predates source; parent metadata preserved; skills read; no stage/commit/push/review/delegation. Parent owns seam, independent high-risk proof, native disposition and acceptance/status updates.

## Changed paths and architecture

- apps/api/src/identity/runtime.ts: registration and own profile methods, two trusted composition-only observation/failure callbacks, lifecycle ownership. New registration atomically inserts conflict-safe normalized user, B-digested verification token and C-sealed job. AccountToken.created_at is the successful-issuance/resend cooldown anchor, so duplicates cannot advance it.
- apps/api/src/identity/mail-lifecycle.ts: actual AccountMailService, sequential runOnce every250ms after completion,12s sender deadline inside30s lease; exceptional deadline stops future ticks and tracks outstanding sender promises. Stop drains before closing sender. No plaintext/decrypt/request transaction mail code.
- apps/api/src/application.ts: root destroy drains runtime before imported shared Prisma teardown; same DatabaseModule object and singleton services retained.
- apps/api/src/identity/errors.ts and transport.ts: EMAIL_VERIFICATION_REQUIRED, explicit three-route extension and PATCH Origin/CSRF/body handling; old login/logout flow retained.
- scripts/test-p33-registration-profile.mjs and tests/p33-registration-profile.test.mjs: one predeclared all17-case group, fresh owned resources, RAM-only keys and shared instances, private inbox API observation and controlled fixture arrangement. Explicit api:build prerequisite avoids redundant compiler in work deadline. No grouping added after timeout.
- tests/backend.test.mjs and tests/p33-identity-http.test.mjs: only intentional three-route404 expectations updated; five T3/classroom404, outage isolation/reused-socket and all old regressions retained. Their runtime proof did not execute.
- README.md, docs/backend.md, docs/identity-http.md, docs/api/accounts-sessions.md and new docs/registration-profile.md: candidate vs approved checkpoint, exact commands/failed evidence, mail lifecycle and T3 interfaces. OpenAPI and p31-status expectations intentionally NOT advanced to7/5 because profile/full D2 HTTP proof is missing. This is an explicit candidate/published-contract status discrepancy, not hidden acceptance.

T3 must reuse IdentityRuntime.configuration/store/passwords, existing transaction/normalization/user-lock/admission ports and this same worker. No extra daemon or hasher. beforeRegistrationCommit is inside the real issuance TX after user/token/job writes; beforeProfileCommit is before user lock and cannot bypass the persisted recheck; neither is an HTTP/environment flag. Ordinary CLI supplies neither callback.

## Commits and outcomes

No worker Git mutations. No D2 completion, full T2/P33 completion, publication or independent/native approval claimed. Production mail/security/outbox/schema/migrations/rootmanifest unchanged. Parent-owned source baseline remains3f63c58 plus this uncommitted candidate.

## Handoff

**Partial, not accepted.** First unfinished task is complete bounded execution of registration-profile case8 onward, plus successful build and D1/backend regression commands. Under this task's no-after-timeout-grouping/no-timeout-extension rule the writer did not redesign or rerun the required checks. Parent must choose an explicitly budgeted next verification plan before claiming D2 acceptance; no routine product decision is needed.

Review risk2/security: profile verified gates/strict patch/CSRF, raw-sensitive-data handling, exceptional deadline tracking and transaction rollback still need independent public proof. Risk4/concurrency: case-variant registration/budgets passed; persisted active-session/profile recheck, issuance rollback and post-request no-idle-change proof remain unrun. Risk5/startup/lifecycle: required build and regression compiler deadlines failed; no startup/outage/drain or Windows signal proof. Scheduler halts rather than overlaps after an exceptional12s deadline; underlying private Nodemailer operation cannot be forcibly cancelled by this composition API, so shutdown tracks and awaits it. Shared-contract risk: implementation statuses remain4/8 until complete profile proof permits7/5; docs explicitly identify that boundary.

Minor inspection/tool errors were nonmutating: one guessed mail-runner path was absent (actual scoped mail helpers then read), one nonunique exact replacement and one unsupported process-list option failed before changes; corrected scoped operations were used. No product/security evidence is inferred from them. Do not reopen D1 review lineage or historical reset causation.
