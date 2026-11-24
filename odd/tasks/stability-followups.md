# Feature: Stability follow-ups after security hardening (2026-11-23)

- **Spec:** #specification
- **Design:** #technical-design
- **Approval:** approved
- **Evidence mode:** candidate-v1
- **Trace mode:** requirements-v1

## Specification

Requested 2026-11-23: resolve the three open items left by `odd/tasks/security-hardening.md` so FoxMind stays stable for further development. Commits, push and deployment were not authorized by this request. On 2026-11-24 the user asked to also fix the two findings below and then commit and push to `main`; deployment stays out of scope.

- **REQ-001:** Behind a local edge proxy (Caddy or nginx on the same VPS), per-client rate limits use the real client address. Without configuration, behaviour is unchanged.
- **REQ-002:** The intermittent API 503 on `/home` seen in `login-inicio-integration` has an identified cause, and either a fix or diagnostics that make the cause visible next time.
- **REQ-003:** The page CSP works in `next dev` and the classroom join-code dialog works in a real browser; `style-src` drops `'unsafe-inline'` for `<style>` elements where Next allows it.
- **REQ-005:** `p5-integration` passes without changing real rate limits, and `npm run test:complete -- --group fast` runs its tests instead of stopping at the API build prerequisite.
- **REQ-004:** API and web build, `lint:boundaries` and `docs:check` pass and the fast suite keeps its baseline (3091/0).

Excluded: real provider calls, retained data, deployment, and product behaviour changes.

## Technical design

- Client address (decision of 2026-11-22, memory `security/client-ip-resolution`, adapted to the signed header delivered in TASK-003 of security hardening): the web trusts `X-Forwarded-For` only when the TCP peer is inside `WEB_TRUSTED_PROXY_CIDRS`, parsing right to left and skipping trusted hops. A trusted peer with a missing or malformed header fails closed: the web signs the sentinel `unresolved` and the API answers 503 through its existing "no client address" path. IPv6 clients are reduced to their /64 network before signing. The API keeps rejecting `AUTH_TRUSTED_PROXY_CIDRS`; it still trusts only the signed header from loopback.
- 503: reproduce with the owned integration runtime, keep the underlying error kind in diagnostics (no SQL text or values), then fix the confirmed cause.
- CSP: split `style-src` into `style-src-elem` (self + nonce) and `style-src-attr 'unsafe-inline'` only if every route renders without violations.

## Tasks

### TASK-001 — Real client address behind a local edge proxy
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-004
- **Verification:** node --test tests/proxy-client-address.test.mjs tests/client-address.test.mjs
- **Acceptance:** With WEB_TRUSTED_PROXY_CIDRS=127.0.0.1/32 and peer 127.0.0.1, `X-Forwarded-For: 203.0.113.9, 127.0.0.1` signs 203.0.113.9; a peer outside the CIDRs never reads the header; a trusted peer without a valid header makes the API answer 503; an IPv6 client is signed as its /64 network; unset variable keeps the socket address.
- **Scope:** ["apps/web/src/application/server/client-address.ts", "apps/api/src/platform/http/client-address.ts", "tests/proxy-client-address.test.mjs", "tests/client-address.test.mjs", "docs/engineering/identity/README.md"]
- **Evidence:** {"command": "node --test tests/proxy-client-address.test.mjs; node --test tests/client-address.test.mjs (after api build); fast group via driver without the 30 s prerequisite cap", "result": "RED: 4 web failures (no X-Forwarded-For handling, no /64, no unresolved sentinel) and 1 API failure (signed unresolved still accepted as an address). GREEN: web 12/12, API 4/4. All 9 API callers already answer SERVICE_UNAVAILABLE when clientAddress is undefined. fast 3098/0", "candidate": "sha256:e2fd2f3775b100c0fb6d1eeff7358c8eb7cb464922bf14ed85eaa8d81bb6b10f"}
- **Blocker:** none

### TASK-002 — Find and fix the intermittent /home 503
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-002, REQ-004
- **Verification:** repeated login-inicio-integration runs; node --test tests/home-diagnostics.test.mjs tests/audit-scheduler-diagnostics.test.mjs
- **Acceptance:** The cause is named with evidence from a reproduction; after the fix or diagnostic change, repeated runs pass or, if not reproducible, the diagnostics now report the error kind.
- **Scope:** ["src/core/contracts/diagnostics.ts", "apps/api/src/platform/diagnostics.ts", "apps/api/src/modules/classrooms/access/infrastructure/context-run.ts", "apps/api/src/modules/home/dashboard/infrastructure/unit-of-work.ts", "apps/api/src/bootstrap/application.ts", "tests/home-diagnostics.test.mjs", "tests/audit-scheduler-diagnostics.test.mjs", "scripts/ci-suites.mjs", "scripts/complete-suite-inventory.json", "scripts/complete-suite-routes.json"]
- **Evidence:** {"command": "login-inicio-integration x5 sequential + 2 rounds x3 parallel copies + 1 final run; node --test tests/home-diagnostics.test.mjs tests/audit-scheduler-diagnostics.test.mjs; fast group", "result": "Not reproduced: 12/12 runs 6/6 (sequential and under 3x parallel load). Cause not confirmed; the old diagnostic dropped the error, and Home logged nothing. Now classroom diagnostics carry a sanitized cause (Prisma Pnnnn or SQLSTATE, else other) and Home records home.read UNEXPECTED with cause. RED: diagnosticCause export missing; Home recorded no event. GREEN 7/7. fast 3098/0", "candidate": "sha256:f4007ced8e3e3f7af8deb1b61880b71628c07c390c88c96dfe99f6ba5551a564"}
- **Blocker:** none

### TASK-003 — Browser verification of dev CSP and join-code dialog; tighter style-src
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-003, REQ-004
- **Verification:** Chromium on next dev and next start; join an owned synthetic classroom by code
- **Acceptance:** Every checked route hydrates with 0 CSP violations in dev and production builds; a student joins a classroom with an 8-character code through the dialog.
- **Scope:** ["docs/engineering/frontend/README.md"]
- **Evidence:** {"command": "Chromium probe (Playwright) over 7 routes on next start and next dev; node --test tests/p5-integration.test.mjs; docs:check", "result": "next start and next dev: 7/7 routes hydrate, 0 CSP violations. Next injects un-nonced <style> in dev and in its default 404, so style-src keeps 'unsafe-inline' (decision documented). dev shows a non-CSP nosniff refusal of _clientMiddlewareManifest.js that does not block hydration. p5 join-by-code browser step (preview, Aceptar y unirme, one membership) passes; p5 still fails 11/13 on a 429 logout at line 271, identical on clean 3a6c1478 (pre-existing). docs 0 issues", "candidate": "sha256:1d5fc73184f54338c657b21f4f1bd29850e562a842dbf47efff4f67f6b87ab59"}
- **Blocker:** none

### TASK-004 — p5-integration no longer exhausts its own rate-limit window
- **State:** DONE
- **Depends on:** TASK-003
- **Owner:** orchestrator
- **Requirements:** REQ-005
- **Verification:** node --test tests/p5-integration.test.mjs
- **Acceptance:** The final responsive/logout check waits for busy general-identity windows to reset and logout returns 204; real limits (240 per IP, 120 per session per minute) are unchanged.
- **Scope:** ["tests/p5-integration.test.mjs"]
- **Evidence:** {"command": "temporary bucket probe in p5 before logout (removed); node --test tests/p5-integration.test.mjs", "result": "Probe: teacher session general-identity bucket 120/120 within ~38 s, shared 127.0.0.1 bucket 233/240, both from scripted API calls. Before: 11/13 (429 at logout line 271, same on clean 3a6c1478). After waiting for busy windows to reset: 13/13. Real limits unchanged", "candidate": "sha256:d3bb8799fd7cd65375d3498a24c7854b992edf7b9b41f5feb16e8a49d1f9c254"}
- **Blocker:** none

### TASK-005 — API build budget fits the development machine
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-005
- **Verification:** node --test tests/local-api-build.test.mjs tests/api-build-pipeline.test.mjs tests/audit-complete-suite.test.mjs; npm run test:complete -- --group fast
- **Acceptance:** buildApi defaults to 90 s (same as the local start budget); the complete-suite prerequisites allow it; the official fast group runs to completion.
- **Scope:** ["scripts/build-api.mjs", "scripts/run-complete-suite.mjs", "tests/local-api-build.test.mjs", "tests/api-build-pipeline.test.mjs", "docs/engineering/local-development/README.md"]
- **Evidence:** {"command": "node --test tests/local-api-build.test.mjs tests/api-build-pipeline.test.mjs tests/audit-complete-suite.test.mjs; npm run test:complete -- --group fast; lint:boundaries; docs:check", "result": "Before: generation + compilation took ~38 s and test:complete stopped at 'Prerequisite failed or timed out: scripts/build-api.mjs'. After raising buildApi to 90 s and the runner prerequisites to 95 s / 90 s: build/runner tests 31/31; official fast group 3098 passed, 0 failed (631 s); lint 0; docs 0 issues", "candidate": "sha256:474c36959f18960e7a36c4222d4e1dc1b664f22c8d2fe4d3d67d48807b290c56"}
- **Blocker:** none
