# P3.3 T3-I / T3-V / T3-F — Scoped independent technical PASS

- Agent / role: read-only independent technical verifier.
- Task: mvbkihar-d-klou.
- Parent / persisted by: coordinator01a14539-ab7b-77dc-8eee-546a8c3dd168 from final report; verifier wrote no repository report/source.
- Date: 2026-10-16.
- Branch/HEAD: feat/p33-token-flows /33fd80f62b9735e43124dc2df1a4d12c81f01c8a, actual dirty candidate.
- Source baseline:2c1b4df71e6abd725d44eaf0c7db170eb88f66dd.
- Phase/specs: T3-I/T3-V/T3-F, current T3 S1/S2/S5–S8/S10.
- Status: completed for assigned technical verification only;41 checks PASS plus actual fresh build, no blocking application finding.
- Commits/source mutations: none; scratch-only preparation, fixtures, logs/client/build outputs.

## Scope and corrected inputs

Applied the single bounded scratch-preparer correction, then all four prescribed commands for their FIRST execution, serially. [Original incomplete147-file partial report](2026-10-16-mvbk7it5-p33-verification-review.md) remains separate and unchanged, not relabeled PASS. Current goal P3 only then STOP; no P4 work, future recovery/password implementation or native authority.

Fresh scratch /tmp/p33-verifier-mvbkihar.J3h3QM; native C:/Users/alejo/AppData/Local/Temp/gp6ujMrn/gaKsFbov/p33-verifier-mvbkihar.J3h3QM. Preparation exit0 copied178 actual dirty files. Sensitive-path filtering preceded read/copy; no extension allowlist. Preflight verified copied hashes, all14 mandatory files, complete API source and EVERY original migration input, including3SQL migrations and migration_lock.toml. Installed dependencies read through scratch junction; generated client/build owned by scratch.

inputs.sha256 manifest SHA-256:5f7f8993d6a341aa85cd7edb9b98f1e66698f062a18a9c9dfe209de091b84f70. Manifest was read/returned through verifier tool evidence; parent did not read external scratch.

| Selected input | SHA-256 |
|---|---|
| prisma/schema.prisma | 0bb598cb107977f65c48895533816c9de747df2f41ed7e2d1678304c5bb24ba7 |
| apps/api/src/identity/runtime.ts | a32aad8f1743c42d87c0d295fe066ae10536b4b43a50a8eb92058dfef8ef5584 |
| apps/api/src/identity/transport.ts | 8ee73b70750866fbfe9ce43d19c5b23e0f0c2c67316ac18a5015c60c95f83d68 |
| scripts/p33-identity-test-env.mjs | 74aaa6ee8bdfe9efc601056d67c785a4e59e72cea62b63750f9959a12728a22b |
| tests/p33-verification.test.mjs | 7deaa53cca662453a08174d14403fcf4b20d1577360736d368becb55743312d9 |

## Exact commands and observed results

Each executed once through scratch run.cjs with29s child/30s foreground tool ceiling; exits0, signals/errors null.

| # | Exact command | Observed proof |
|---|---|---|
| 1 | `node --test --test-concurrency=1 tests/p33-fixture-budget.test.mjs tests/api-build-pipeline.test.mjs tests/p33-d2-runner-options.test.mjs tests/p33-verification-runner.test.mjs` | 25PASS,0fail/cancel/skip; test8137.2661ms,supervisor8199ms |
| 2 | `node scripts/build-api.mjs` | actual Prisma7.10 generation0/strict TypeScript0;3322ms |
| 3 | `node scripts/test-p33-verification.mjs --group=confirm` | actual default compiler0,8PASS/0fail/cancel/skip; test9204.2644ms,runner18883ms,supervisor18990ms |
| 4 | `node scripts/test-p33-verification.mjs --group=resend` | actual default compiler0,8PASS/0fail/cancel/skip; test9908.6028ms,runner14798ms,supervisor14913ms |

Total41PASS plus actual fresh generation/compilation. Separate check-{1..4}.stdout.log/.stderr.log and .result.json were retained in scratch as reported.

| Check | stdout bytes | stderr bytes |
|---|---:|---:|
| 1 | 7008 | 0 |
| 2 | 132 | 93 |
| 3 | 1185 | 0 |
| 4 | 1148 | 0 |

Build stderr only:

```text
Loaded Prisma config from prisma.config.ts.

Prisma schema loaded from prisma\schema.prisma.
```

Actual public groups each reported Mailpit container/volume cleanup0 and owned DB cleanup0: twoDB/twoMailpit cleanup reports. Pure-check synthetic cleanup0/intentional1 and fake compiler failures are expected assertions, not actual removal/build results. No inventory sweep.

## Specification verdict and source evidence

| Spec | Scoped verdict |
|---|---|
| S1 | PASS: P3-only scope, no P4/publication/acceptance-authority inference. |
| S2 | PASS: real captured confirmation/resend, wrong-account preservation, cookie/CSRF rotation, original deadlines, no auto-login and exact responses. |
| S5 | PASS: transport rejection, token purpose/state/expiry/single-use, successful cooldown versus attempts, shared rates, rollback and queued cancellation. |
| S6 | PASS: duplicate consumption/resend-consume/concurrent-resend races, mutation/session/worker ordering inspected. |
| S7/T3-I | PASS for assigned independent workflow: complete corrected inputs, own fresh build and41 prescribed checks. |
| S8 | Historical initial confirm RED remains unavailable under explicit accepted exception; not reconstructed/relabelled. |
| S10/T3-F | PASS: pure budget assertions and both actual fixture groups, run8000/other4000/remaining26000 clamp, other prescribed limits unchanged. |
| S3/S4/S9 | Future recovery/password implementation or historical diagnosis, not implemented/replayed here. |

Causal source review:
- identity/runtime.ts:112–136: sorted owner locks, wrong-account/active-session checks, conditional consumption and preserved rotation deadlines.
- runtime.ts:149–173: session recheck, successful issuance history, atomic replacement/invalidation/cancellation/enqueue.
- runtime.ts:56–61: existing credential snapshot/current-session rechecks preserved.
- account-mail-outbox/repository.ts:46–53,75–81: cancellation clears payload/lease; completion requires current claim ownership.
- account-mail-outbox/worker.ts:32–47,50–73,114–122: active-token checks/bounded retry/lease ownership/SMTP outside mutation transactions.

Existing key validation, Argon2id parameters, purpose-separated verifiers, cookie/Origin/CSRF,16KiB and sanitized uncached transport inspected; no new bypass identified.

## Advisories and retained limits

- Wrong-purpose recovery rejection covered at tests/p33-verification.test.mjs:161; later reset-token redemption usability cannot be publicly proved until recovery exists.
- Idle test:210–217 directly proves rotation preserves idle, not separate aging of every rejected-confirmation category.
- Stale-session/in-flight-worker protections scrutinized in source, not every interleaving forced by controlled scheduling. In-flight stale mail can arrive, but consumption/invalidation/lease ownership prevents proof resurrection.
- Smaller operational IP budgets prove shared admission; no extra default-budget exhaustion attempted.
- Parent72PASS integrated proof is separately attributed, not independently rerun. Native assessment unavailable/unapproved, no inherited T2 waiver.
- Seven source reads using MSYS/tmp paths were unsupported by read tool; native-path reads succeeded. No preparation or prescribed command repeated; no optional final probe/mutation sweep. These path-read errors are not application/test failures.

## Handoff

Parent persists this report and reconciles technical proof with actual native availability/disposition and local closure. No further test/source correction requested by this verdict. No nine-operation/full-T3/P3/native approval authority claimed by verifier. Remaining recovery/password and frontend/full journey are separate P3 work; stop after P3, no P4.

## Key Learnings

- Required-input preflight verifies migration files as well as the Prisma schema.
- Synthetic cleanup markers differ from actual owned-resource cleanup reports.
- Successful issuance history anchors cooldown independently of rejected attempts.
- Cancelling an outbox lease cannot retract already in-flight mail delivery.
