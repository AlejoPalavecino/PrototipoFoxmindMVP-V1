# P3.3 security primitives — completed bounded unit

- Agent / role: delegated implementation writer B, security primitives.
- Task ID: `mva3zljz-h-adpv`.
- Date: 2026-10-15.
- Branch / worktree: `feat/p33-mail-compatibility`, shared checkout.
- Starting commit: `093d26c`.
- Phase/specs: P3.3 [T1, S1/S2/S4/S6/S7](../../odd/tasks/p33-accounts-auth.md).
- Status: completed (B primitives only; not T1 as a whole, HTTP or P3).

## Request and scope

User request verbatim: "Vamos con el siguiente". Implement standalone identity-security primitives/config through a public index, unit-only build, public-API tests and integration guide. No HTTP/DB/AppModule/mail changes, frontend, shared metadata, Git mutation, installation or sensitive environment-file access. Preserve P3.2 and other parallel writers. Parent owns integration, independent verification, branch/commit actions and phase disposition.

## Work performed

Read both injected skills, feature header/specs/tasks/implementation bindings/log, root AGENTS, roadmap, work-record protocol, relevant functional-spec sections 2/3/12 and account/session guide/OpenAPI. Actual branch/base agreed with parent. Roadmap's initial pre-authorization wording was superseded for this bounded task by parent delegation/feature record, not edited here. Pre-existing package/lock changes and untracked shared protocol/parent/map/feature records were preserved. Installed Argon2 declaration confirmed async hash/verify, Argon2id/V0x13, parseOptions and explicit cost options. Root tsconfig inspection returned ENOENT; actual API tsconfig exists and was extended narrowly. Parent supplied current official-library research and dependency verification; no installer or additional repository script ran.

This record was created before source writes. Added:

- `apps/api/src/identity-security/{index,errors,inputs,configuration,verifiers,passwords,sessions}.ts`: cohesive public exports, generic typed sanitized errors, Unicode/shape/byte guards; fail-closed supplied-object configuration with private copied keys, origin/local-mode/proxy/rate validation; canonical CSPRNG verifiers and shared-domain digest rules using exact stored uppercase purposes; bounded async Argon2id and dummy verification; fixed session policy, cookies and constant-time HMAC binding.
- `apps/api/tsconfig.p33-security.json`: only B/shared passive protocol import closure; private `.build/p33-security` output, no shared build/client regeneration.
- `tests/p33-identity-security.test.mjs`: 13 public-module behavior groups with boundary/alternate/rejection coverage. No DB, SMTP, internal storage or private source assertions.
- `docs/identity-security.md`: exact startup/config encoding/API, error/status integration obligations, commands, limits and rollback.

Coverage: S1 backend-only foundation; S2 raw scalar input/shape/size, cookie/origin/CSRF and fixed deadline/rotation primitives; S4 private validated independent keys, canonical purpose/session digests, maintained Argon2id costs/random salts/bounded capacity/dummy work and sanitized errors; S6 validated operational proxy/rate settings and HMAC bucket identifiers, without claiming shared storage/serialization; S7 separate private build, attributable evidence and cohesive delivery handoff. S3 mailbox behavior belongs A; S5 outbox belongs C. Neither is duplicated here.

Self-review read all B implementation/test sources and checked assigned S# examples, boundary failures, generic errors, no logging, secret encapsulation, fixed TTLs, cookies/clearing, public signatures and narrow compilation. Refactored scalar counting to stop beyond the limit without allocating an unbounded point array, and replaced the temporary RED-only dynamic import fallback with a normal static public-index import. No failed GREEN command required a correction. Focused alternate regression added shared-capacity rejection across hash/verify/dummy, capacity release after corrupt/excessive PHC parameters, nested freezing, local cookie clearing and absolute lifetime cap.

## Verification

Commands ran sequentially in the foreground with 30-second limits, without redirection/background jobs/retries. Outputs are in this task's tool transcript; no additional raw log files were created.

1. RED — `node --test --test-concurrency=1 tests/p33-identity-security.test.mjs`: exit 1, 0 PASS / 13 FAIL, 83.9745 ms. Each behavior group failed on a missing public function before implementation; temporary missing-module fallback allowed per-rule evidence rather than a single import failure. No secret-bearing values were emitted.
2. GREEN compile — `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.p33-security.json`: exit 0, no stdout/stderr.
3. GREEN behavior — `node --test --test-concurrency=1 tests/p33-identity-security.test.mjs`: exit 0, 13 PASS / 0 FAIL, 268.6806 ms. Local two-hash diagnostic 28 ms; no password/hash output.
4. Final focused compile — `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.p33-security.json`: exit 0, no stdout/stderr.
5. Final focused alternate/regression — `node --test --test-concurrency=1 tests/p33-identity-security.test.mjs`: exit 0, 13 PASS / 0 FAIL, 230.4441 ms. Local two-hash diagnostic 27 ms; capacity/error test also observed zero public console log/warn/error calls.

Assertions compare booleans for raw secrets, never print password/hash/token/link/key/recipient values in assertion diffs. Local timing is not production sizing or an upstream performance claim. No applicable command timed out, no broad suite/audit or Prisma generation ran. No existing HTTP/SMTP/DB source was changed by B, and their runtime regression commands were not authorized for this writer.

Read-only Git reconciliation/closing inspection exited 0. At close other writers/parent had concurrently changed mail/shared metadata/package/tests and created outbox/mail artifacts; these remain untouched by B. A line-count inspection observed 729 lines across B's source/build-config/test/guide and then-current 36-line record (record subsequently expanded). This cohesive unit exceeds the 400-line review target; parent owns slicing/exception disposition. No compression/code-golf or review exception claim.

## Commits and outcomes

No commits or Git mutation; parent owns terminal Git actions. B's unit passes its authorized checks; no independent security/concurrency/native approval is claimed. No source outside allowed surfaces or P3.2 volume was modified by B.

## Risks, limits and rollback

- Item 2 / security: operators must supply genuinely random independent canonical unpadded base64url keys (at least 32 bytes); syntax/placeholder checks cannot prove entropy. Password service accepts only its exact current PHC policy/16-byte salt; future policy changes need explicit bounded migration. HMAC is stateless: session expiry/revocation must be checked by the caller first. No mathematical constant-time network guarantee.
- Item 4 / concurrency: capacity is bounded per reused service instance (default 2, configurable 1–8, no queue), not across incorrectly created per-request instances/processes. Actual stale-password recheck, per-user serialization, atomic counters, token consumption, DB state effects and races are T2/T3/T4 integration work, not proved by primitive tests.
- Item 5 / dependencies/environment: installed 2.2.2 types/native async library were exercised locally; other operating-system prebuilt availability and production capacity remain unverified. Parent reported exact dependency versions/audit 0; B did not rerun audit/install. Combined startup must separately validate C's outbox keyring/storage and abort if any prerequisite fails.
- No trusted-forwarded-header implementation, email normalization/parser, HTTP JSON media/status/envelope handling or complete auth journey is supplied. Unicode email canonicalization must agree with DB writes/lookups; no JavaScript/PostgreSQL equivalence claim.
- Rollback before integration: B's standalone directory, private tsconfig/test/guide/record and private build output only. Parent must preserve shared protocol/dependencies/other writers/P3.2 and owns actual rollback; no deletion command was run.

## Handoff

Public integration index: `apps/api/src/identity-security/index.ts`; complete signatures/config encoding are in `docs/identity-security.md`. Startup calls `readIdentityConfiguration(providedEnv, actualApiListenHost)` and awaits one reused `createPasswordService(capacity)`; no automatic process/environment access. HTTP maps typed failures, validates each body value after shape/byte guards, uses A's mailbox parser plus DB-consistent canonicalization, authenticates before HMAC CSRF, and persists only context-bound digests. Use millisecond server timestamps; rotation generates a new verifier while retaining the original absolute window. Fixed verification/reset/resend policy constants are seconds.

First unfinished action: parent assesses actual B diff and independent verification, chooses the security slice's review workload boundary, then wires stable exports into T2/T3 with C's startup/outbox controls and shared DB transactions. Do not mark full T1/P3 complete or infer publication permission.
