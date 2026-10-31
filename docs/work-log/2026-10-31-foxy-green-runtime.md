# Foxy runtime R1 — 2026-10-31

Status: in progress. Scope: runtime composition and lifecycle, no host installation, real provider or retained database.

Status: completed. Runtime composes teacher UoW, read services and disabled/enabled textual worker; capabilities report text only when configuration and injected provider are valid. Construction does not query or schedule; worker owns idempotent lifecycle and does not close shared infrastructure. Durable reader is imported lazily on document access.

Checks: `node --experimental-transform-types --test --test-reporter=dot apps/api/src/foxy-ai/foxy-runtime.test.mjs` PASS 2; `npm run api:build` PASS; `npm run lint:boundaries -- --quiet` PASS. Initial test run failed because native Node cannot parse decorators loaded by eager files barrel; lazy import corrected construction and tests. Actual runtime document read through compiled host, injected provider, real session and scheduling end-to-end remain unverified. No retained DB, actual provider or host mounting.
