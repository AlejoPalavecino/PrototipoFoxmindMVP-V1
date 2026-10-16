# P3.3 D2 C2 — Finite orchestration correction

- Agent / role: C2 implementation writer.
- Actual task ID: `mvaeya2u-x-4373`; runtime session `01a142c6-0e82-736a-8a05-f1f025e85243`.
- Date: 2026-10-16.
- Branch / starting commit: `feat/p33-registration-profile`, `3f63c58` plus pre-existing uncommitted D2 changes.
- Specs: [complete correction plan C2/S1–S2](../../odd/tasks/p33-t2-execution.md), [main S2/S5/S7 and L12](../../odd/tasks/p33-accounts-auth.md).
- Status: in_progress.

## Request and scope

User: "Cual es el inconveniento, te autorizo a que hagas lo necesario para terminar con T2". Parent delegates only build receipt/wrapper, fixture grouping, response consumption and associated pure tests/docs. Parent owns package alias, combined compiler/integration, review and Git. C1 `mvaeya07-w-2cpw` owns mail/runtime/private component surfaces. Preserve all pre-existing work and the original D2 partial record. No API production/config/schema/dependency edits, sensitive file access, integration execution or review tools.

## Fixed finite plan before execution

1. Test-first pure receipt and public CLI tests, in synthetic projects confined to `.test-artifacts/p33-d2-plan-*`; no root API compilation or network.
2. Strict unchanged Prisma generation then TypeScript compilation wrapper, createRequire CLI resolution, successful-exit-only content-hashed receipt. Validated reuse reports reuse, never a fabricated compiler exit; missing/stale/unsafe/malformed receipt retains explicit legacy compiler fallback.
3. Predeclared fresh-fixture groups, no all-groups loop: registration cases1–7 (case4 requires case1), account8–12, sessions13–14, lifecycle15–17. Sum17. Existing26s work plus cleanup/30s outer per public invocation; no retries/subdivision/timeout extension.
4. Consume status-only HTTP responses without weakening existing body/state/security assertions, session fixture timestamps, real1.6s idle wait, race/signal behavior or actual worker/Mailpit flow.
5. Parent C3 alone runs one new combined build after C1/C2 settle, then four separate groups and regressions if build exits0. Original build30s/full17/D1/backend compiler6s failures stay explicit. Compiler latency cause remains unknown. D2 unaccepted/OpenAPI4/8 until C3 proof.

## Exact pure command forms (each once, foreground <=30s)

RED, before matching implementations:
- `node --test tests/api-build-receipt.test.mjs`
- `node --test tests/p33-d2-runner-options.test.mjs`

GREEN, after implementations (distinct once-only combined command):
- `node --test --test-concurrency=1 tests/api-build-receipt.test.mjs tests/p33-d2-runner-options.test.mjs`

Only a bounded correction to a failed pure check is permitted; any further same failure is a partial handoff. No build/tsc/integration/Docker/mail baseline or audit runs by C2.

## Inspection / reconciliation

Read injected skill, roadmap/protocol, whole correction plan/main feature, mapper and original D2 partial record, exact scoped runner/helper/test/docs/config/package paths. Starting tree has D2 source and parent metadata; no pre-existing change is discarded. Historical first7PASS is not all17 acceptance. Root outputs from failed build are not eligible for a manufactured receipt. No CodeGraph index writes authorized or needed for these exact supplied edit targets.

## Verification / handoff

Pending pure checks and implementation. No C2 commit, compiler, HTTP or T2 acceptance claimed. Parent package proposal and observed command results will be appended here before handoff.
