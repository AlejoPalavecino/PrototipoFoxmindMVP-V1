# P4 backend composition — Writer checks completed

- Agent / role: bounded backend writer
- Session or task ID: `/root/p4_backend`
- Date: 2026-10-17
- Branch / worktree: `codex/p4-p3-integration`, isolated integration worktree
- Starting commit: `5e86d1e58afaae8856778f840027f724db36adf0`, with imported P4 merge pending
- Phase and detailed task/spec links: [P4 integration T2, S1-S2](../../odd/tasks/p4-p3-integration.md)
- Status: completed

## Request and scope

Implement the authorized backend composition of P4 over accepted P3. Preserve persisted sessions, exact Origin/CSRF checks and admission accounting; use caller-owned file transactions and restrictive domain authorization. No P5 integration, remote actions, secret-file reads, dependency installs or commits.

## Work performed

Read injected backend/work-unit skills, task specs, P4 handoff, work-record protocol and current composition/authentication/file boundaries. Skill resolution: paths-injected. Parent authorized additional narrow HTTP/store edits to preserve safe identity status mapping.

- Added a shared read-only persisted-session query and delegated P3 `IdentityStore.authenticate` to it without changing the authenticated context. The file bridge uses its caller's existing transaction; repeated authentication performs no admission or lifetime writes.
- Added explicit opt-in file environment configuration with validated infrastructure and bigint quota, same-provider Nest composition, original-stream Express mounting before ordinary parsers, once-per-request admission and exact POST/PUT Origin/CSRF checks.
- Retained existing verified-account/domain guards and denied unsupported attempt attachment writes. P5 remains outside scope.
- Preserved trusted identity 401/403/429 errors and retry headers through a dedicated file-host rejection type, avoiding runtime imports of P3 parameter-property modules from direct-source P4 component tests. Added public request IDs to file errors.
- Root-owned shutdown drains identity mail and file cleanup before Prisma teardown and closes storage idempotently, including application construction failure. Existing isolated `FilesModule.register(options)` remains available.
- Added `docs/p4-host.md` and deterministic host/session bridge regressions. Changed only the delegated/explicitly expanded surfaces.

## Verification

- Initial `node --test tests/p4-host.test.mjs tests/p4-session-bridge.test.mjs`: exit 1, 2 missing-module failures before implementation. Tests were then switched to the compiled API imports required by P3's TypeScript parameter properties.
- First `node scripts/build-api.mjs`: exit 1, `Prisma generation: exit unavailable`; no generator/TypeScript result. Existing 30-second budget was unchanged. No source fix or timeout increase was inferred from this failure.
- Coordinator subsequently reported a bounded fresh config-import diagnostic with Prisma config import success. The authorized unchanged build retry passed: Prisma 7.10.0 generation exit 0 (897 ms), strict API TypeScript compilation exit 0; build exit 0.
- `node --test tests/p4-host.test.mjs tests/p4-session-bridge.test.mjs`: exit 0, 12 passed, 0 failed. Covers explicit config, original mounted request/binary stream, single admission, anonymous/Origin/CSRF/rate-limit errors and retry/request ID, safe driver mapping, cleanup ordering/idempotence, unchanged P3 context, fixed session windows, repeated caller transaction/revocation, fake headers/duplicate cookies and denied attempt writes.
- `node --test tests/p4-http-output.test.mjs`: exit 0, 3 passed, 0 failed; existing direct-source output/backpressure/disconnect behavior remains runnable.
- `git diff --check`: exit 0; Git reported only the existing package-lock line-ending advisory on a parent-owned path.
- Real services, complete P3 regression, migration replay and independent Verify were not run by this writer; the coordinator owns those checks.

## Commits and outcomes

No writer-owned commits; coordinator owns Git. This record completes only T2 writer implementation/checks for S1-S2, not P4 phase acceptance or independent verification.

Risk: items 2, 3, 4, 5 (session/CSRF authorization, shared composition/HTTP contracts, transaction revalidation/lifecycle, infrastructure configuration).

## Handoff

Source is stable and `.build/api` contains the verified strict compilation. Next exact action: coordinator runs the isolated real-service integration harness and complete applicable P3 regressions, then independent Verify with the user-requested model/effort. Preserve the first generator failure as historical evidence. No product P5 flow, native approval, publication or commit is claimed.
