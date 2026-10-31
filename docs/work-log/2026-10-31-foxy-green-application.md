# Foxy application integration R3 — 2026-10-31

Status: in progress. Mount application root using real identity/files/classroom services and explicit provider override; no retained database or real provider.

Status: completed. Root application registers FOXY_RUNTIME when classroom/file infrastructure is enabled, reuses actual services and authentication, mounts transport, accepts an explicit injected text provider and shuts Foxy down before shared files and DB. No provider is constructed; absent AI configuration stays disabled.

Checks: `npm run api:build` PASS; `node --test --test-reporter=dot apps/api/src/foxy-ai/foxy-application.test.mjs` PASS 1 with isolated synthetic PostgreSQL and real HTTP sessions/CSRF; `npm run lint:boundaries -- --quiet` PASS. Enabled provider and full generation are not covered by this application test; no retained DB, deployment or real provider. No commit.
