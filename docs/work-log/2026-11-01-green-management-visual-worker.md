# Visual worker and budget

- Agent / role: /root/green_management / slice_worker
- Session ID: /root/green_management
- Date: 2026-11-01
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Status: in_progress

## Scope
Implement visual worker and conservative shared monetary budget; no tests, real provider requests or edits to job schema/queue owned by other agent.

## Implemented
Added visual-worker.ts, visual-worker-types.ts, visual-worker-heartbeat.ts and visual-budget.ts. AI text-budget allowlist now admits visual jobs and AI barrel exports quoteFoxyImageBudget. Worker uses durable dispatch fence, shared budget, exact authorized grounding projection, provider once, settlement before custody, recovery-only for already dispatched jobs, and serial heartbeat handoff. Preserves original signal and waits running operation on shutdown.

## Verification
node --test apps/api/src/foxy-ai/foxy-visual-worker.test.mjs passed 5/5 fake-port tests; node --test --test-concurrency=1 apps/api/src/ai/foxy-text-budget.test.mjs apps/api/src/ai/foxy-image-budget.test.mjs passed 7/7; npm run api:build --silent and npm run lint:boundaries --silent exit 0 before final bounds-only validation. Real PostgreSQL budget/integration proof and linked job/asset authority, queue, completion and runtime wiring remain pending; this is not end-to-end completion. No real provider or storage call, no commit.

Architect clarified expired settlement: settleExpired now returns true for a matching expired job already settled (zero reservation), false when no expired job exists; this enables safe recovery without double charge. Budget PostgreSQL tests still pending.

## Linked visual authority and completion
Added visual-claim-check.ts, visual-claim-authority.ts and visual-completion.ts; modified private-asset-authority.ts and private-asset-authority-db.ts to acquire linked job before asset and revalidate live job/source for asset operations. Linked visual jobs require explicit maxJobAgeMs in asset authority; READY completion requires explicit maxJobAgeMs, proof and freshness. Standalone assets preserve prior behavior. node --experimental-transform-types --test --test-concurrency=1 apps/api/src/foxy-ai/foxy-visual-authority-recovery.test.mjs passed 7/7 with owned temporary PostgreSQL; focused standalone custody cases passed 3/3; api:build and boundaries passed. Requested additional completion success/failure ledger tests. Real provider/storage and end-to-end wiring remain pending.

## Runtime composition and review fixes
Created visual-runtime.ts; wired visualConfiguration/visualProviders/visualBudgetLimits into runtime.ts with independent kind gates, queue, authority, loader, custody, budget, worker, recovery and ordered worker/custody shutdown. Added exports to Files public barrel. Runtime RED and worker tests pass 12/12; api build and boundaries pass. Initial runtime test import failed because Files root barrel parses Nest decorators under native Node; moved narrow exports to approved Files public barrel; first boundaries attempt rejected a private subpath, corrected; subsequent tests and boundaries passed.
Reviewer-reported defects fixed: known token usage above profile caps is charged in full and marks INVALID_AI_OUTPUT before custody; discarded linked asset blocks claim/budget; PG two focused tests pass. Transactional freshness now holds advisory queue/budget then user/classroom/conversation share locks through dispatch marker; focused writer-lock race passes. Architect audit of every source writer/fence and integrated proof remain outstanding. Expired dispatched job without READY proof is failed, not exact-blob recovery; no claim of that recovery.

## Integrated runtime evidence
node --experimental-transform-types --test --test-concurrency=1 --test-reporter=dot apps/api/src/foxy-ai/foxy-visual-runtime-journey.test.mjs passed 2/2: owned PostgreSQL, real runtime/inspector/renderer/custody, synthetic provider/scanner/storage; IMAGE GENERAL and DIAGRAM CLASSROOM yielded one dispatch, READY and authorized private read. Real provider, S3, ClamAV, HTTP and restart proof remain outstanding.

## Recovery correction
Queue now fails stale QUEUED jobs visibly, and reclaims expired dispatched jobs with bound payload using a fresh shared nonce after conservative budget settlement. Worker attempts only custody.recover; no count/generate or overwrite. Architect specified missing bytes -> PROVIDER_OUTCOME_UNKNOWN. Focused recovery tests pass with PNG present/absent, real inspector/custody and synthetic scanner/storage; missing bytes retain full private charge. Physical deletion remains disabled. No actual provider or object-store proof.
