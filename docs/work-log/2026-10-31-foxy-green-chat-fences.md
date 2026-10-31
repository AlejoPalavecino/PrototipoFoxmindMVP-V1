# Foxy controller recovery W2/W3 — 2026-10-31

Status: in progress. Clear prior account state, retain active receipt and serial polling, detect active turn on later pages.

Status: completed. Reinitialization clears all identity-bound state and fences stale work; accepted receipt is retained as active until a terminal authoritative read, blocking new sends. Active turns found on later pages begin serial polling; in-flight reads cannot schedule overlapping polls.

Checks: `node --test --test-reporter=dot apps/web/src/lib/foxy-chat-controller.test.mjs` PASS 8; `npm run web:build` PASS; `npm run lint:boundaries -- --quiet` PASS. Poll failure retains active fence; selecting the conversation again reloads state. UI integration and enabled generation remain unverified; no provider/data or deployment.
