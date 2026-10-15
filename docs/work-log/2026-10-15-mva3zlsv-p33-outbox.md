# P3.3 T1 encrypted account-mail outbox — implementation verified

- Agent / role: implementation writer C (encrypted outbox)
- Session or task ID: mva3zlsv-i-1jb3
- Date: 2026-10-15
- Branch / worktree: feat/p33-mail-compatibility / existing checkout
- Starting commit: 093d26c
- Phase and detailed task/spec links: [P3.3 T1, S1/S4/S5/S6/S7](../../odd/tasks/p33-accounts-auth.md)
- Status: completed (assigned T1 C foundation only; parent review/integration outstanding)

## Request and scope

User request: "Vamos con el siguiente". Implement independent encrypted transactional outbox primitives, leased worker and isolated PostgreSQL tests. No HTTP/frontend, schema, shared manifests/protocol, sensitive environment files, dependency mutation, Git mutation or scheduling. Preserve P3.2 state and concurrent writers. Parent owns integration/review/commits. Read injected work-unit-commits and nodejs-backend-patterns skills, feature header/specs/bindings/tasks/log, roadmap and work-record protocol before source writes. AGENTS instructions were supplied in runtime context; reread the current file during closing reconciliation.

## Work performed

Created this attributed record before writing any source/config/tests. Inspected actual branch/base/status and relevant functional sections 2/3/12, account contract, existing Prisma models/invariants and mail sender port. Initial roadmap still reported P3.3 not started; current authorization/in-progress feature superseded that checkpoint for this slice only. Parent subsequently updated shared metadata; all other writers' changes were preserved. No `.codegraph` index existed. Initialization would write outside this child's edit surface, so used scoped exact-path inspection instead of initializing it.

Changed only:

- `apps/api/src/account-mail-outbox/crypto.ts`: opaque validated environment-supplied keyring, AES-256-GCM versioned envelope/random nonce/tag/canonical AAD; shared parent protocol digest domain; sanitized errors.
- `apps/api/src/account-mail-outbox/repository.ts`: existing-transaction enqueue, user-before-token/job locking, association/digest/exact-expiry validation, no recipient/plaintext persistence; transactional cancel; parameterized atomic owned-type SKIP LOCKED claim and lease-fenced completion.
- `apps/api/src/account-mail-outbox/worker.ts`: structural sender, active-token/digest preflight and conditional attempt, no SMTP transaction/user lock, bounded exponential retries/five attempts/expiry, missing-key retention, old-key recovery and stale-owner fencing.
- `apps/api/src/account-mail-outbox/index.ts`: stable public exports with no runtime dependency on B/mail source.
- `apps/api/tsconfig.p33-outbox.json`: explicit private source/import closure and `.build/p33-outbox` output; no root app build.
- `scripts/test-p33-outbox.mjs`: private compilation, unique owned cached PostgreSQL 17.10-bookworm/tmpfs, existing migration application through pg, public tests, sanitized evidence and only owned-container cleanup; 26-second budget plus bounded cleanup.
- `tests/p33-account-mail-outbox.test.mjs`: public-module/SMTP/database-driver behavior; isolated SQL fixtures; boolean/status/count assertions, no payload dumps/counter rewrites/private imports.
- `docs/account-mail-outbox.md`: public API/config, AuthModule seam, security/concurrency limits, exact commands and rollback.
- This work record; private compiled outputs/evidence only under `.build/p33-outbox/`.

## Verification

Every command ran foreground with a 30-second outer limit; no timeout, automatic retry or failed implementation-check correction was needed.

1. RED — `node scripts/test-p33-outbox.mjs`: exit 1, private compilation exit 0, migrations applied, 13 tests/12 failures/1 pass, cleanup exit 0, elapsed 3111ms. Evidence `.build/p33-outbox/verification-1792103451455.log`. Failures were the expected missing public API behavior (`OUTBOX_NOT_IMPLEMENTED`) and invalid configuration not rejected. The mismatch-negative test already passed the reject-all scaffold; do not represent it as a distinct negative-rule RED. Deeper rule assertions were present before implementation but their initial failures were at the missing enqueue/crypto prerequisite, not independently observed internal rule failures.
2. `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.p33-outbox.json`: exit 0, empty stdout/stderr before GREEN.
3. GREEN — `node scripts/test-p33-outbox.mjs`: exit 0, 13/13 PASS, private compilation exit 0, migrations applied, cleanup exit 0, elapsed 4451ms. Evidence `.build/p33-outbox/verification-1792103702372.log`.
4. TRIANGULATE/REFACTOR — self-reviewed assigned S1/S4/S5/S6/S7 boundaries/source/tests/errors; copied enqueue metadata before asynchronous boundaries and hardened malformed public binding/keyring rejection. Focused existing-rule cases added for simultaneous claims, no verification/consumption side effects, both stale-owner acceptance/failure paths and sanitized unavailable DB ports. No broad/adversarial sweep.
5. `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.p33-outbox.json`: exit 0, empty stdout/stderr on final source. Evidence summary `.build/p33-outbox/typecheck.log`.
6. `node scripts/test-p33-outbox.mjs`: exit 0, 14/14 PASS, private compilation exit 0, migrations applied, cleanup exit 0, elapsed 4688ms. Evidence `.build/p33-outbox/verification-1792103957958.log`. Test process elapsed 1396ms, zero skipped/cancelled/todo.

Named coverage: configuration fail-closed; AES-GCM randomized round-trip/all AAD fields/wrong key/tag; unavailable DB errors without SMTP; transactional rollback/no plaintext/recipient; mismatch rejection; simultaneous and in-flight concurrent claims/owned-type isolation/no user lock during SMTP; recovery sender spelling and no account-verification effects; expiry/consumption/invalidation; transactional cancellation; key rotation/missing-key recovery; SMTP retry/backoff/success cleanup; five-attempt/expiry bounds; old completion AND retry fenced by a successor; tampered digest/AAD/tag refusal.

No independent verification/native review, HTTP journey, live SMTP/Mailpit, previous P3.2 suites, root build, baseline/audit sweep, installs, shared Prisma regeneration or development state changes were performed/claimed. Parent's provided dependency versions/audit are context, not checks rerun by this child. Final source/status inspection found other writers' expected surfaces; none was altered by C.

## Commits and outcomes

No commits; child Git mutation prohibited. Implementation foundation is locally verified, not whole P3.3/P3 completion. This cohesive source/tests/owned runner/docs exceeds the 400-line single-review target; the parent owns actual branch-chain slicing and may separate envelope/config from transactional worker integration rather than compress or omit proof.

## Handoff

First unfinished task: parent independently verify/review this T1 C unit, then consume `apps/api/src/account-mail-outbox/index.ts` for T2/T3. Load keyring before identity startup. Enqueue with the same transaction as user/token/cooldown mutation; cancel in the same transaction as consume/invalidate/resend. Run `runOnce` only with the ordinary non-transactional client and existing AccountMailService structural port; AuthModule owns scheduling/shutdown. Map availability errors to generic 503 without input/driver echoes. Shared domain constant stays parent-owned; no B runtime import is needed.

Risk item 2 (security): JavaScript decrypted strings cannot be reliably zeroized; buffers are wiped and references released. Keyring retention/rotation and generic availability mapping need parent wiring. Only worker integration should call decrypt. Database encryption does not defend against a compromised worker/keyring.

Risk item 4 (concurrency): SMTP/DB are not one transaction and lease expiry/crash can duplicate mail; in-flight old mail may arrive but domain must leave its token invalid. Both stale completion/retry fences and simultaneous claim-once passed. Use sender-owned network deadlines shorter than lease, no transaction client for worker, and consistent user-before-token/job ordering. Parent must cancel proactively with token mutations; worker-only cleanup occurs on its next run.

Risk item 5 (dependencies/environment): isolated cached PostgreSQL and existing installed/generated dependencies were available; all three owned containers were cleaned (including RED). No dependencies/schema/environment files or P3.2 volumes were mutated. Full application/live SMTP integration remains outside this verification.

Rollback: only the new assigned source/config/runner/test/guide/record and private build output; no DB/data rollback. If later wired live, stop scheduler and retain pending-job decryption keys before withdrawing code. Parent owns terminal Git actions, review disposition, shared records/phase reconciliation and the next exact integration task.
