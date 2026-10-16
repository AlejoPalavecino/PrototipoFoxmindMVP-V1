# P3.3 D2 — Attributed correction map

Actual read-only mapper task: `mvaeddt8-v-tvir`. Parent persists this report; no commands, probes or source writes were performed by the mapper. The following is its final report, not a runtime failure claim.

## Decision map — `mvaeddt8-v-tvir`

### S5: 12-second race does not cancel SMTP

**Source-backed, not an observed runtime failure:** Nodemailer 10.1.1’s nonpooled transport creates a per-send `SMTPConnection` inside `send()` and closes it when its callback/error fires. Its public transport `close()` only releases transport resources; it cannot reach that active connection. See `node_modules/nodemailer/dist/esm/smtp-transport/index.js:127,142,170,201,213,330`. The public types expose no per-send abort API; `getSocket` can supply a `net.Socket` (`.../smtp-transport/index.d.ts`; `.../mailer/index.d.ts:73-82`).

D2 races the sender against 12 seconds, but shutdown then awaits the underlying send: `apps/api/src/identity/mail-lifecycle.ts:30-45,55-59`; `apps/api/src/mail/account-mail.service.ts:85-88`. Therefore, if the send stays pending past the race, shutdown can remain blocked. This is a **possible liveness gap**, not a reported runtime failure.

If S5 requires a true bound, the minimal supported direction is a service-owned socket-cancellation port: use Nodemailer’s public `getSocket` callback to track the actual socket and destroy it on deadline/close, handling connection-in-progress too. That requires changes beyond the old D2 worker surface—`apps/api/src/mail/account-mail.service.ts`, lifecycle wiring, and focused stalled-SMTP/shutdown tests. A timer-only change or `transport.close()` would not address it. Parent decision needed on this scope expansion.

### Session fixture: no invalidity established

`tests/p33-registration-profile.test.mjs:41-45` omits `created_at`, but the SQL column defaults to `CURRENT_TIMESTAMP` (`prisma/migrations/202610150001_initial/migration.sql:65-75`; Prisma model at `prisma/schema.prisma:134-145`). The invariant is only `expires_at > created_at` (`prisma/migrations/202610150002_invariants/migration.sql:10`). The negative idle offset seeds `last_seen_at`, not `created_at` (`tests/p33-registration-profile.test.mjs:231-238`). Source does **not** support calling this fixture invalid or prescribing a correction.

### Seventeen-case dependency map / finite plan

`tests/p33-registration-profile.test.mjs`: 1–3 registration/mailbox/validation; 4 duplicate preservation; 5 concurrency; 6–7 rate limits; 8 issuance rollback; 9–10 profile gates/validation; 11 Origin/CSRF; 12 media/body/T3 routes; 13 idle/absolute windows; 14 persisted-session race; 15 SMTP failure/recovery; 16 shutdown/nonoverlap; 17 counter/SQL outage and health. **Only 1–7 are reported PASS**; the rest were not observed after timeout.

Before new checks, minimally change `scripts/test-p33-registration-profile.mjs:1-25` to run explicit name-selected groups against **fresh owned DB fixtures** (the file’s setup seeds fixed identities: `tests/p33-registration-profile.test.mjs:18-40`). Proposed groups: 1–3, 4–8, 9–12, 13–14, 15–16, 17. Preserve all cases and the existing per-run deadline; split further rather than extend a timeout or count a timeout as success. This is a proposed plan, not executed.

### Compiler status / handoff

`package.json` defines `api:build` as Prisma generation then `tsc -p apps/api/tsconfig.json`; the config includes the whole API and generated client (`apps/api/tsconfig.json:1-24`). The helper’s compiler cap is six seconds (`scripts/p33-identity-test-env.mjs:20-27`). Reported build timeout had no TypeScript diagnostic; the HTTP/backend runners exited before cases. **Compiler cause remains unknown**; no source-backed type error or blind retry recommendation.

No commands or tests were run. Parent decision: authorize the bounded, fixture-isolated verification plan and decide whether true SMTP cancellation warrants the additional mail-service surface.
