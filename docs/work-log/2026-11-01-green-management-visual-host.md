# Visual host configuration and wiring

- Agent / role: /root/green_management / slice_worker
- Session ID: /root/green_management
- Date: 2026-11-01
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Status: in_progress

## Scope
Opt-in visual configuration and host wiring; fake-provider tests only, no secrets, real network/provider or test edits. AI adapter factories owned by another agent.

## Implemented and verified
Added visual-configuration.ts, visual-host-providers.ts; updated Foxy public barrel, root configuration.ts, application.ts and .env.example. Flags default off; enabled modes require existing AI, exact prices, bounded token caps and explicit bigint private quota; DIAGRAM uses original canonical text rates; shared ledger limits passed unchanged. Host override mode never silently creates a real fallback for an omitted modality. No secrets read or provider calls. node --experimental-transform-types --test --test-reporter=dot apps/api/src/foxy-ai/foxy-visual-configuration.test.mjs passed 3/3; compiled app test apps/api/src/foxy-ai/foxy-visual-application.test.mjs passed 1/1 with fake provider and owned PG; npm run api:build --silent and npm run lint:boundaries --silent passed. Test runner requested expanded override matrix. Actual model compatibility/billing and live provider remain unverified.
An exploratory `node --test tests/backend.test.mjs` exited 1 immediately because that suite requires the owned isolated database wrapper `npm run test:api`; it did not execute functional tests. No retained database was accessed.

## Profile fence
Reviewer risk addressed after RED: worker requires exact equality between immutable queued profile and current provider profile before count/reserve/generate; previously dispatched recovery remains provider-independent. Visual worker tests passed 8/8, api build and boundaries passed; compiled host + runtime synthetic journey passed 3/3. Test runner additionally observed PG restart with changed pricing fail closed with no dispatch/charge. No real provider invocation.
Test runner reports host fake-provider matrix green for IMAGE-only, DIAGRAM-only, text override without visual fallback, explicit null, and disabled flags with injected providers; options.ai override case was still pending at handoff. The exploratory raw backend suite failure remains documented above.
Coordinator reports test runner also passed the options.ai override case. No commit by this agent; independent review and operational provider compatibility remain for coordinator.
