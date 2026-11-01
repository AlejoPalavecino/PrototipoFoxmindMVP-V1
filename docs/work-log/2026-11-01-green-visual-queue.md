# Visual queue — in progress

- Agent / role: /root/green_diagram, slice worker
- Task ID: /root/green_diagram
- Date: 2026-11-01
- Branch/worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Phase: visual durable generation queue, docs/work-log/2026-11-01-architect-visual-generation-integration.md
- Status: in_progress

## Scope
Shared lease claim/renew and safe expired-work handling; no provider calls, secrets, tests or retained databases. Migration 0004 error code list updated with coordinator authorization before freeze.

## Work performed
- Implemented shared owner/context/job/asset locks, shared 90-second nonce/lease claim and renewal under shared queue advisory lock; undispatched expired work can reclaim with new nonce.
- Recovery requires injected monetary budget and obtains queue then budget advisory locks. Expired dispatched work settles original reservation as unknown exactly once, reconciles a proven READY asset only with current ownership and grounding, otherwise fails GENERATION_INTERRUPTED. No automatic redispatch or storage action.
- Updated not-yet-frozen migration 0004 error-code CHECK with AI_BUDGET_EXCEEDED, CONFLICT and GENERATION_INTERRUPTED by coordinator instruction.

## Verification
- Visual journey: four PostgreSQL cases pass. Authority/recovery suite: seven cases passed, then new settlement=false case passed separately. Additional synthetic 2-second expired paid claim confirms full settlement and no retry. All databases disposable.
- npm run api:build --silent and npm run lint:boundaries --silent exit 0 after implementation.

## Handoff
Independent review ongoing. Other queues still need shared global/per-owner visual concurrency integration; no real provider/storage proof or UI is implied. Runtime must supply budget to queue and maxJobAgeMs to linked asset authority/completion.
