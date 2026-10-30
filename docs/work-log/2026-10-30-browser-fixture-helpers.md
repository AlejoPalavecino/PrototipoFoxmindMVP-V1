# Browser fixture helpers — focused GREEN

- Agent / role: /root/browser_fixture_helpers, implementation
- Session or task ID: /root/browser_fixture_helpers
- Date: 2026-10-30
- Branch / worktree: codex/audit-remediation, isolated audit-remediation worktree
- Starting commit: 446d3cb79cb122fb43f50dbf88abd40dcd61dd5e
- Phase and task: [audit remediation](../../odd/tasks/audit-remediation.md), [design](2026-10-30-confirm-rate-design.md)
- Status: in_progress

## Request and scope
Implement strict opt-in CSRF preflight and passive, cancelable browser observation; do not alter tests or product.

## Work performed
Modified `tests/p4-integration-helpers.mjs` (71 lines, SHA256 e70d44e6a173f724fdf3eced2066a416ef0b5d0bafe4b07219b4dbf7a66ca438) and added `tests/helpers/browser-action-observer.mjs` (134 lines, SHA256 afdaa264014f25ac0d66739844369b3b78dffbd6dd27d63f6dc66ccd031516d8). Watchers settle tagged results and clean up; observer binds request-time stage, projects safe fields, counts pending requests and drains on close. No requests issued by observer. The assigned test remains unchanged with SHA256 4589690c3ab747b7218426aac2230f494f0648a1096147edc23dbf0dcaafd4ba. Type, stage and error codes use safe allowlists; requested integration labels communicated to TestRunner. The observer was split into short methods.

## Verification
`node --test --test-reporter=dot tests/audit-browser-action-observer.test.mjs`: exit 0, 8/8 passed after final change. `node --check` on both helpers: exit 0. `npm run lint:boundaries --silent`: exit 1, eslint not recognized; dependencies unavailable in worktree. `npx --no-install tsc --noEmit --pretty false`: exit 1, TypeScript compiler unavailable. Private-toolchain ESLint plus `node scripts/check-boundaries.mjs` passed for the configured architecture paths (exit 0, Architecture AST boundaries passed); initial private invocation lacked module resolution, corrected with NODE_PATH. Root has no tsconfig, so private tsc without project printed help; no type verification is claimed. No test or compilation fix attempts failed twice; circuit breaker not activated. No browser, database or product validation performed.

## Commits and outcomes
No commit; global DoD pending. Focused test GREEN only, configured architectural boundary checks passed; type checking remains unverified.

## Handoff
TestRunner: integrate the helpers into authorized flows, confirm intended safe stage labels, run full focused journeys and available type/boundary checks in the prepared environment. Coordinator owns global acceptance and shared roadmap.

## Admission-step extension — in progress

Assigned by /root after RED: add only `tests/helpers/browser-admission-step.mjs` for bounded phase-specific admission. Preserve the 26-case test, existing helpers and product. No DB, browser, network, commit or mirror operations.

Implemented `tests/helpers/browser-admission-step.mjs` (49 lines; SHA256 2a8e7aa8174f80e244704bdccbf5ad5f0ae5ffc45fd11b922c26f57d12fcf66b). It permits at most one validated 429 per CSRF or mutation phase, installs observation before each action, disposes on every exit, validates UI before waiting and accepts only exact mutation POST 200. No additional requests or production changes.

Verification: `node --test --test-reporter=dot tests/audit-browser-action-observer.test.mjs` exit 0, 26/26 PASS; test SHA256 7fe7be5c5a7156a75f4a5e210f399ca0e75c9a57f06eee1108975ee983713c55, first 9442 bytes SHA256 4589690c3ab747b7218426aac2230f494f0648a1096147edc23dbf0dcaafd4ba unchanged. `node --check tests/helpers/browser-admission-step.mjs` exit 0; private ESLint invocation exit 0, though architecture config targets product TS paths and does not define rules for this helper. No database, browser, typecheck, network or commit. No circuit breaker activation.

Handoff: TestRunner integrates P8 only, ensuring the response observer ignores intermediate CSRF 200. Global verification remains coordinator-owned.
