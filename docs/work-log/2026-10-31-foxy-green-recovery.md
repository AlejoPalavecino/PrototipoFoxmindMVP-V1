# Foxy recovery — 2026-10-31

Status: in progress. Provider-independent recovery and fail-closed runtime configuration; synthetic database only.

Status: completed pending independent integration. Recovery locks admission, budget, then expired turns; validates durable price/usage snapshots and both historical ledger rows before settling, with transaction rollback on corruption. Undispatched work is requeued; dispatched work fails conservatively. Queue shares the same recovery, and disabled runtime runs serial maintenance, waits for active transaction on shutdown, and never closes shared infrastructure. Configuration amounts must be strictly positive.

Checks: `node --experimental-transform-types --test --test-reporter=dot apps/api/src/foxy-ai/foxy-turn-recovery.test.mjs apps/api/src/foxy-ai/foxy-runtime.test.mjs` PASS 10 (isolated synthetic PostgreSQL); `npm run api:build` PASS; `npm run lint:boundaries -- --quiet` PASS. Queue/completion regression currently fails on SyntaxError importing concurrently added host export from Foxy barrel under native Node (decorator parsing); coordinator notified. No retained database, actual provider or host mounting.
