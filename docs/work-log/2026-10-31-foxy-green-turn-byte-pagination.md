# Foxy turn byte pagination — 2026-10-31

Status: in progress. Scope: H2 turn service and repository pagination, UTF-8 response limit and cursor. Tests are owned by test runner; synthetic database only.

Status: completed. Service returns {items,nextAfterSequence}, checks serialized UTF-8 envelope against 2 MiB, and fails RESPONSE_TOO_LARGE for an oversized first item. Repository permits the service's limit+1 lookahead (maximum 101); cursor is the last emitted sequence.

Checks: `node --experimental-transform-types --test --test-reporter=dot apps/api/src/foxy-ai/foxy-turn-service.test.mjs apps/api/src/foxy-ai/foxy-turn-repository.test.mjs` PASS 15; `npm run api:build` PASS; `npm run lint:boundaries -- --quiet` PASS. Integration tests use isolated temporary PostgreSQL; no retained database or provider.

Handoff: HTTP error mapping currently sanitizes RESPONSE_TOO_LARGE as SERVICE_UNAVAILABLE; coordinator informed to integrate an explicit HTTP mapping. Existing test fixture corrected by test owner. No commit created.
HTTP follow-up: `http.ts` maps RESPONSE_TOO_LARGE to sanitized 413. Focused HTTP test PASS; build and boundary lint PASS again. Initial focused run failed 503 because PowerShell Set-Content rejected -NoNewline; corrected file write and rerun passed.
