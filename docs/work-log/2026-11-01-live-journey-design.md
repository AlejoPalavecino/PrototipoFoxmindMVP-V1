# Live Gemini publication journey — design

- Agent / role: /root/live_journey_design / architect; runtime session ID unavailable.
- Date: 2026-11-01. Branch/worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai.
- Starting commit: c81ee1b. Phase: Foxy V-INF live backend verification. Status: completed (design only).
- Sources: [real provider evidence](2026-11-01-real-provider-validation.md), [isolated service test](../../apps/api/src/foxy-ai/foxy-real-storage-scanner.test.mjs).
- ESTADO_DISENO: LISTO_PARA_TDD_RED.

## Scope and assumptions

The current user requests real Gemini generation through confirmed publication before main integration. This authorizes this attempt with at most one IMAGE and one DIAGRAM generation. Use synthetic fixed prompts, owners, classrooms and study-plan targets only. No production mutation, deployment, retained fixture, real student data, secret inspection or extra provider retry. All API-key handling is in process memory through the existing ignored local configuration; no value in output or logs.

This design verifies backend runtime, real PG/SeaweedFS/ClamAV and real provider through Library authorization. It does not by itself verify browser layout or HTTP session/CSRF transport. Those claims remain separate. Existing smoke success does not substitute for this journey.

## Contract and ownership

Create `scripts/foxy-provider-journey.mjs` (entrypoint) and cohesive helper modules under `scripts/foxy-live/` only if needed; each file <200 lines, review unit <=400 lines. Do not alter product contracts, migrations or provider behavior for this verification. Test runner owns offline guard/budget/call-count tests; worker owns runner only. Coordinator owns records and final roadmap.

CLI: `node scripts/foxy-provider-journey.mjs --live-authorized --attempt-id=<canonical UUID>`. A UUID identifies this one explicitly authorized attempt; the coordinator chooses and records it once. Missing/invalid guard or UUID must fail before env loading, Docker or network.

Before configuration/network, open `.test-artifacts/foxy-live-<attemptId>.json` exclusively (`wx`) and leave it after completion. Existing receipt must reject, never truncate/delete or silently resume. Receipt stores version, attempt UUID, modality status, local counters and safe result/error code only; no key, configuration dump, credentials, prompt, generated content, signature, storage key or raw SDK error. Atomic writes thereafter preserve monotone state, using same-directory temp rename or equivalent. Different attempt IDs require a new coordinator decision; never generate one internally on retry.

Load `.env.foxy-test` with `loadEnvFile` only after guard. Reject inherited `AI_*`/private-quota configuration consistently with existing smoke so the selected local file is authoritative. Parse via `readAiConfiguration` and `readFoxyVisualConfiguration`. Require both enabled profiles, one-dispatch configuration, positive budgets and provider deadline <=30s before any SDK operation. Use configured prices/caps/limits exactly; no new AI allowance. Validate input/output quote can fit daily budget before dispatch; runtime reserve remains authoritative. Never print env/config/error objects.

Factories are existing `createGeminiFoxyImageAdapter` and `createGeminiFoxyDiagramAdapter`, constructed from the exact frozen profile and host provider deadline. Per modality wrapper permits `countTokens` at most once and `generate` at most once, with a checked counter BEFORE delegating. Before `generate`, persist DISPATCHING; failure writing the receipt prevents the call. Return actual result/usage unchanged. SDK/fetch maxAttempts=1 remains. No manual regeneration, fallback, repeated `runOnce` or automatic smoke invocation. Unknown outcome remains consumed and failed; no second request to diagnose it.

## One isolated run

1. `withP4Services` once, default ephemeral resources and new *_test database; no `.p4-local` helper. Apply sorted existing migrations to the new DB; configure `pg.Pool`, `transactionDatabase`, production `S3Storage` and `ClamdScanner`. Start readiness before creating jobs. No raw connection string in output. A readiness failure is unavailable and stops before Gemini.
2. For each modality create a separate `homeFixture` teacher, member and owned classroom inside that DB. Update only that synthetic classroom quota to 20 MiB; fixture default1MB can reject a legitimate image. Separate owners avoid exceeding a configured10MiB private quota on a second max-sized reservation. Do not modify configured private quota or AI budget.
3. Use production `createFileAccess({authenticate: async(_tx,req)=>req.id, authorizeAttemptWrite: deny})` and `FileService`; direct synthetic request identity still passes real verified-account, membership, ownership and publication policies. This is not HTTP/session authentication proof.
4. Create runtime with text off, visual configuration/providers and EXACT configured `dailyBudgetUsd/dailyActorRequests/dailyGlobalRequests`. Keep visual max job age and deadline from config. Never call `runtime.onModuleInit`; worker and publication polling remain disabled. Use only explicit `visualWorker.runOnce()` once per modality.
5. Create GENERAL conversation with synthetic fixed prompt and empty source selection, enqueue one job for kind with unique stable request ID, then run once. Assert job READY, dispatch_count=1 and asset READY; otherwise write safe failure and do not rerun. Per-kind failures may proceed to the other kind once; assertion/output handling must still close resources.
6. Read asset through `privateAssetReader` (owner only) and compare byte length/hash with real stored bytes; assert raster MIME, validation and scan proofs and nonzero dimensions within production bounds. DIAGRAM must have structured metadata and safely rendered PNG. Do not persist payload outside the owned storage.
7. `prepareVisual` uses current asset revision, owned classroom/unit/topic and fixed reviewed title. Repeat SAME request and require same publication, no additional copy. Run publicationWorker once; require READY and validated/scanned P4 file, exact source bytes and a NEW storage key.
8. Before confirm require zero matching Library materials, student `files.read` denied for the prepared P4 file and outsider denied. Owner can preview publication with production reader. No provider call during preparation or confirmation.
9. Confirm with current publication/classroom revisions and `confirm:true`; replay SAME request must return same receipt. Exactly one material references this file at chosen unit/topic. Member `files.read(...,'preview')` now returns exact bytes/secure MIME; outsider still denied. Read via FileService authorization, not raw storage alone.
10. Query local visual job/budget ledger: 1 dispatch per kind, no outstanding reservation, local used amount/usage safe counters. Label local cost as configured estimate, not actual provider billing. If usage unknown, runtime conservative charge remains and output says unknown; do not infer free or exact remote cost.

Finally always await runtime shutdown, storage drain and pool end; then let helper remove only its labeled containers/network and credential temp files. Receipt remains without secrets so the same attempt cannot bill twice. Cleanup errors are explicit failures. Never remove other containers or mutate retained tests. A second offline reviewer run must NOT run this paid CLI; review the recorded receipt and reproduce plumbing with synthetic providers.

## DoT and command checks

Offline RED cases: missing authorization/id => no config/network; receipt exists => no config/network; count/generate duplicate => second call denied; receipt write failure => zero dispatch; unknown first call => no retry; real return preserved; safe errors expose no payload/key; both profiles/lifecycle guards validated. Synthetic integration may run same orchestration with provider doubles and fresh helper resources, asserting two generation calls total and Library before/after behavior.

Live: one command above, one generation each maximum. PASS requires both backend journeys and cleanup; partial failures remain partial and list effective call counts. Do not rerun live for independent review. Current live provider compatibility and amount billed remain observed-run scoped. Physical cleanup of discarded private source/quota release remains out of scope and disabled pending remote PUT fence proof.

## Verification and handoff

Read named fixtures/runtime/adapters/config/helper and reviewed public FileService policy. Git at start had only generated next-env change. No provider, Docker service, key, implementation or memory operation performed by architect. Structural/link check follows; no functional tests required for design-only record. Worker/tester received this executable contract. Coordinator may proceed with RED/GREEN and one authorized attempt after offline guards pass.
Structural check: 50 lines, two existing local Markdown targets, zero trailing-whitespace lines; exit 0.
