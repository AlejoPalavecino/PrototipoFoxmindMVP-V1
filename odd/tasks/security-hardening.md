# Feature: Security hardening (2026-11-22)

- **Spec:** #specification
- **Design:** #technical-design
- **Approval:** approved
- **Evidence mode:** candidate-v1
- **Trace mode:** requirements-v1

## Specification

Requested 2026-11-22: review the whole project, fix existing vulnerabilities and leave FoxMind stable for further development. Scope chosen by the user: dependency vulnerabilities plus a code security audit, fixing confirmed findings with regression tests; commits and push to `main` are authorized.

- **REQ-001:** `npm audit` reports no high or moderate vulnerabilities in runtime dependencies, without downgrading Prisma or changing its major version.
- **REQ-002:** Every security finding confirmed in the code audit is fixed with a regression test that fails before the fix and passes after it.
- **REQ-003:** The project stays stable: API and web build, `lint:boundaries` passes, and the fast suite keeps its baseline result.

Excluded: deployment, real provider calls, retained data, and product behaviour changes beyond what a fix requires.

## Technical design

- Dependencies: raise only patched versions, prefer releases at least two weeks old (supply-chain caution), and pin transitive packages through `overrides` the same way `deepmerge-ts` is pinned today.
- Audit: five independent read-only reviewers by surface (identity/platform, classroom authorization, files/parsers, Foxy/study/AI, web layer). The coordinator verifies each finding against the code before fixing it.
- Every fix keeps the existing module boundaries and contracts.

## Git tracking

Base `main` at 666adbf5. One commit per unit (dependencies, then each fix with its test). Push to `origin/main` after verification.

## Tasks

### TASK-001 — Patch vulnerable dependencies
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-003
- **Verification:** npm audit; npm run api:build; npm run web:build; npm run lint:boundaries; npm run test:complete -- --group fast
- **Acceptance:** `npm audit` has no high or moderate runtime findings; Prisma stays on 7.x; builds, lint and the fast suite match the baseline.
- **Scope:** ["package.json", "package-lock.json", "tests/dependency-security.test.mjs"]
- **Evidence:** {"command":"npm audit; node --test tests/dependency-security.test.mjs; npm run lint:boundaries; npm run api:build; npm run web:build; npm run test:complete -- --group fast","result":"Commit 0c3213c4. audit before: 10 findings (4 high, 5 moderate, 1 low); after: 0 vulnerabilities. dependency-security 11/11; lint/api/web exit 0; fast 3058 passed 0 failed (baseline 3055 + 3 new)","candidate":"sha256:1ccad5e98b963b0356709fe11413ceb721578e5b76af1eec01d595caaff01ebf"}
- **Blocker:** none

### TASK-002 — Audit the code by surface
- **State:** DONE
- **Depends on:** none
- **Owner:** quality_reviewer
- **Requirements:** REQ-002
- **Verification:** reviewer reports verified by the coordinator against the code
- **Acceptance:** Each reported finding is classified as confirmed (with file and attack scenario) or discarded (with a reason).
- **Scope:** ["docs/work-log/2026-11-22-root-security-hardening.md"]
- **Evidence:** {"command":"5 read-only quality_reviewer audits on 666adbf5 + coordinator code verification of cited lines","result":"Findings recorded in the work-log audit table: F1 high (shared per-IP bucket), F2/F3/F9 medium (F9 reproduced), F4-F8 low; CSP unsafe-inline not addressed. Scope moved from the audited source files to the work-log because TASK-003..007 legitimately rewrote those files","candidate":"sha256:9972d4e24b062a08de6a0ac16efd0f580b6bc858c6cd2d723811d12b0cd97604"}
- **Blocker:** none

### TASK-003 — Sign the client address between the web and the API (F1, F2)
- **State:** DONE
- **Depends on:** TASK-002
- **Owner:** chuli_worker
- **Requirements:** REQ-002, REQ-003
- **Verification:** clientAddress unit test; independent buckets per signed address; proxy test; study-proxy streaming; fast suite
- **Acceptance:** Exhausting the bucket of client A does not return 429 to client B; a header without a valid signature is ignored; uploads to the study proxy are streamed and over-limit uploads still get 413.
- **Scope:** ["apps/api/src/platform/http/client-address.ts", "apps/web/src/application/server/client-address.ts", "apps/web/src/application/server/study-proxy.ts", "apps/api/src/modules/identity/accounts/infrastructure/security/configuration.ts", "tests/client-address.test.mjs", "tests/proxy-client-address.test.mjs", "tests/study-proxy-upload-streaming.test.mjs", "tests/p33-identity-http.test.mjs"]
- **Evidence:** {"command":"npm run test:complete -- --group fast; npm run test:complete -- --group owned-db; targeted node --test runs; api/web build, lint, docs:check, npm audit","result":"Commits b8b5b108, cbc8d95c, 4d634803. RED: client-address module missing; second signed address got 429; streaming test saw no upstream data before client finished. GREEN on integrated main: fast 3090/0; identity HTTP 22/22; owned-db no new failures","candidate":"sha256:d01f055d6f5edf5dceb609b6607fe5979c6c9de5d5bcf77c0935fe2dc725615e"}
- **Blocker:** none

### TASK-004 — Release the login limit and purge expired controls (F5, F6)
- **State:** DONE
- **Depends on:** TASK-002
- **Owner:** chuli_worker
- **Requirements:** REQ-002, REQ-003
- **Verification:** reset/login release test; purge test; identity suites
- **Acceptance:** After a password reset the owner can attempt login again; expired rows are deleted and active rows are kept.
- **Scope:** ["apps/api/src/modules/identity/accounts/application/runtime.ts", "apps/api/src/modules/identity/accounts/infrastructure/persistence.ts", "apps/api/src/bootstrap/identity-controls-purge.ts", "tests/backend.test.mjs"]
- **Evidence:** {"command":"npm run test:complete -- --group fast; npm run test:complete -- --group owned-db; targeted node --test runs; api/web build, lint, docs:check, npm audit","result":"Commit f4534d88. RED: release not called; 429 !== 200 after reset; purgeExpiredControls missing. GREEN: runtime 6/6, lifecycle 6/6, backend DB tests pass; integrated fast 3090/0","candidate":"sha256:0c0906e95bd645d522f9f22d1d977c77a4c656fc56f639cfac5eb8231837f820"}
- **Blocker:** none

### TASK-005 — Authenticate study uploads before reading and bound PDFs (F4, F9)
- **State:** DONE
- **Depends on:** TASK-002
- **Owner:** chuli_worker
- **Requirements:** REQ-002, REQ-003
- **Verification:** an unauthenticated PUT gets 401 without reading the body; PDF bomb reproduction and rejection test
- **Acceptance:** The upload is rejected before the body is read; if the bomb reproduces, it is rejected in under 2 s without memory growing past 256 MB, and normal PDFs are still accepted.
- **Scope:** ["apps/api/src/modules/files/custody/infrastructure/pdf-inflate-guard.ts", "apps/api/src/modules/files/custody/infrastructure/tests/pdf-inflate-bomb.test.mjs", "apps/api/src/modules/study/folders/presentation/uploads/http.ts", "apps/api/src/modules/study/folders/presentation/uploads/upload-ordering.test.mjs"]
- **Evidence:** {"command":"npm run test:complete -- --group fast; npm run test:complete -- --group owned-db; targeted node --test runs; api/web build, lint, docs:check, npm audit","result":"Commit a43642d7 + coordinator scope fix. Repro: 1 MB PDF -> +2073 MB RSS in 9.1 s; after: FILE_REJECTED in ~1.2 s, +76 MB. Scope test RED (100 MiB image rejected) then GREEN; 8/8; integrated fast 3090/0","candidate":"sha256:91976972b0a3532444715f356fd4a3d2bc1e15f844251d3b71af2219bd5a7cd1"}
- **Blocker:** none

### TASK-006 — Charge user-cancelled AI turns and cap daily spend per user (F3, F7)
- **State:** DONE
- **Depends on:** TASK-002
- **Owner:** chuli_worker
- **Requirements:** REQ-002, REQ-003
- **Verification:** monthly-budget cancellation test; per-user daily cap test
- **Acceptance:** Cancelling a dispatched turn consumes the reserved amount without double charging; recovery by lease expiry keeps PENDING; with AI_DAILY_ACTOR_BUDGET_USD set the user cap applies, and without it the behaviour is unchanged.
- **Scope:** ["apps/api/src/modules/foxy/turns/infrastructure/turn-recovery.ts", "apps/api/src/modules/foxy/visuals/infrastructure/visual-budget.ts", "apps/api/src/platform/ai/text-budget.ts", "apps/api/src/platform/ai/configuration.ts", "apps/api/src/modules/foxy/turns/infrastructure/tests/foxy-turn-cancel-budget.test.mjs", "apps/api/src/platform/ai/daily-actor-budget.test.mjs"]
- **Evidence:** {"command":"npm run test:complete -- --group fast; npm run test:complete -- --group owned-db; targeted node --test runs; api/web build, lint, docs:check, npm audit","result":"Commit d4ef3ea6. RED: cancel consumed 0n vs 4500n (chat) and 0n vs 139264n (visual); actor cap 2/3 failed. GREEN: foxy cancel/recovery 15/15; integrated fast 3090/0","candidate":"sha256:7a8a2f2e97d912b4e6fcfe68c6213c12d2e47c5d14a1c065ae1966be30ff0271"}
- **Blocker:** none

### TASK-007 — Stronger classroom join code (F8)
- **State:** DONE
- **Depends on:** TASK-002
- **Owner:** chuli_worker
- **Requirements:** REQ-002, REQ-003
- **Verification:** generator, legacy compatibility and global failure bucket tests; web build
- **Acceptance:** New codes have 8 alphanumeric characters; legacy 6-digit codes still work; many accounts together get 429 once they pass the global failure threshold.
- **Scope:** ["src/core/domain/classrooms/access-code.ts", "apps/api/src/modules/classrooms/memberships/application/membership-code-operations.ts", "apps/api/src/modules/classrooms/memberships/infrastructure/membership-code-operations-repository.ts", "tests/p5-codes-invitation-batches.test.mjs"]
- **Evidence:** {"command":"npm run test:complete -- --group fast; npm run test:complete -- --group owned-db; targeted node --test runs; api/web build, lint, docs:check, npm audit","result":"Commit b42894a0. RED with old sources compiled to .build: 0 pass 1 fail. GREEN: p5-codes 11/11, frontend-classroom-workflows 8/8; integrated fast 3090/0","candidate":"sha256:6a806b0f5548e83fe286151727bf51b7a6a5a7d46e4ac9f079214be4a04cb4df"}
- **Blocker:** none

### TASK-008 — Integration, full verification and publication
- **State:** DONE
- **Depends on:** TASK-003, TASK-004, TASK-005, TASK-006, TASK-007
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-002, REQ-003
- **Verification:** api:build, web:build, lint:boundaries, fast and owned-db groups, docs:check, npm audit
- **Acceptance:** Everything green on the integrated main; commits per unit; push to origin/main.
- **Scope:** ["package.json", "package-lock.json", "docs/work-log/2026-11-22-root-security-hardening.md", "scripts/complete-suite-routes.json"]
- **Evidence:** {"command":"npm run test:complete -- --group fast; npm run test:complete -- --group owned-db; targeted node --test runs; api/web build, lint, docs:check, npm audit","result":"Integrated main: api:build 0, web:build 0, lint 0, docs:check 0, npm audit 0 vulnerabilities, fast 3090 passed 0 failed, owned-db 748 passed 3 failed + 30 remaining files 206 passed 0 failed. The 3 grading-ai-sql failures reproduce identically on clean 666adbf5 (pre-existing, flagged)","candidate":"sha256:8369d9d51555641f81ebd609eb77dd83a067f1f888ecc05b7fa0c3961e70a76f"}
- **Blocker:** none
