# Foxy chat controller W2/W3 — 2026-10-31

Status: in progress. In-memory intention, manual retry, serial polling, pagination and abort fencing; no real data/provider.

Status: completed. Controller keeps exact send intent in memory on failure and retries only explicitly; serial two-second polling fetches authoritative turn data, with abort and epoch fencing on selection/disposal. Turn pagination follows nextAfterSequence. Receipt never fabricates a full message. Teacher gate belongs to UI integration.

Checks: `node --test --test-reporter=dot apps/web/src/lib/foxy-chat-controller.test.mjs` PASS 5; `npm run web:build` PASS; `npm run lint:boundaries -- --quiet` PASS. UI wiring, authentication transitions and full enabled generation require independent integration tests; no real provider/data or deployment. No commit.
