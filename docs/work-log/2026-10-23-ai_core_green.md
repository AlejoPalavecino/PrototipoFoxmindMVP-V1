# Classroom AI core — implementation

- Agent / role: ai_core_green / slice_worker
- Session or task ID: /root/ai_core_green
- Date: 2026-10-23
- Branch / worktree: codex/classroom-gemini / classroom-gemini/ProtipoFoxMind
- Starting commit: ed06f885bfbf08725024013a7a45c9a3a723cfc7
- Phase and detailed task/spec links: [C1/C2](../../odd/tasks/classroom-ai-extraction.md)
- Status: completed

## Request and scope
Implement C1 shared contracts then C2 Gemini provider and bounded approved-document reader, following coordinator's approved extraction scope. Tests owned by ai_red are read-only. No publication, secret reads or retained-data changes.

## Work performed
Read worktree instructions, roadmap, work-record protocol, design and C1 RED tests. Inspected actual HEAD/status and files public boundary. Applied clean-architecture and work-unit-commits skills. Context7 consulted for official Google GenAI, yauzl, fast-xml-parser and pdf-lib APIs.

Implemented pure shared contracts/parsers/schema in `src/core/domain/`; strict configuration and injectable SDK adapter in `apps/api/src/ai/`; bounded document workers, digest/authorization reader and private durable capability adapter in `apps/api/src/files/`. No tests were edited. The manual draft policy remains untouched; revision zero is accepted consistently with existing drafts.

Provider count and generation use the same full prompt/document contents. Explicit preflight is reused once only for unchanged document identity plus SHA256 fingerprint. Automatic SDK retries and continuation are disabled. Unknown connection outcome after dispatch is distinct from definitive HTTP errors; output usage includes thought tokens. Missing usage stays unknown for the worker's conservative reservation settlement. Structured response validation rejects malformed, blocked, truncated and oversized output.

Document parsing runs with a 3-second deadline, bounded worker memory, PDF 100-page limit and DOCX ZIP/expanded-text limits. No network fetches, tools or document instructions execute. Durable reading uses a separate private FileService with WeakMap-issued capabilities and mandatory worker claim authorization; it never manufactures an HTTP session. HTTP snapshots continue using the original files authorization. `snapshotWorker` uses the worker-owned grant/nonce callback and existing file custody gates.

Pinned `@google/genai` 2.31.0. npm initially reordered package/lock metadata; preserved baseline ordering, retained the new dependency subtree and necessary metadata changes, and verified lock consistency. Existing dependency versions are unchanged. Root `.env.example` contains only disabled capability/placeholders and is ignored by the repository's environment rule, so the coordinator must explicitly stage this safe example.

## Verification
- C1 RED supplied by test_runner: four missing-module failures / one existing manual-policy pass; first GREEN 5/5 observed.
- `node --experimental-strip-types --test --test-reporter=dot tests/classroom-ai-contracts.test.mjs tests/classroom-ai-configuration.test.mjs tests/classroom-ai-adapter.test.mjs tests/classroom-ai-document.test.mjs`: latest 22/22 PASS, exit 0. The document tests use fresh compiled files barrel.
- `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --pretty false`: exit 0, emitted fresh API artifacts.
- `node scripts/build-api.mjs`: Prisma generation 0, API TypeScript compilation 0, overall exit 0 within unchanged shared deadline (5.86 seconds).
- `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit --pretty false`: latest exit 0 after thought-token correction.
- `npm ci --ignore-scripts --dry-run --silent`: exit 0, lock consistency confirmed.
- npm installation audit: 0 vulnerabilities reported. No live provider call, credentials or real document data used.
- `git diff --check`: exit 0. Linter unavailable: repository has no lint script or ESLint/Biome configuration; no linter PASS is claimed. New source files are under 200 lines and functions under 40 lines.
- Independent test_runner observed thought-token RED (30 versus expected 40), then implementation correction passed. No repeated implementation failure/circuit breaker occurred.

## Commits and outcomes
No commit; coordinator owns commit boundary.

## Handoff
C1/C2 implementation ready for coordinator/reviewer. Backend worker must wire `createDurableApprovedPlanReader({files, authorize: worker.authorizeClaim})`, retain exact input identity for its claim WeakMap, and use `snapshotWorker(tx,input,signal)` for durable source rechecks. HTTP start/retry/apply must use ordinary `snapshot`. C3/C4 integration and independent real-DB authorization verification belong to ai_jobs_green/test_runner; the core unit tests do not claim that end-to-end proof. No whole phase completion is asserted.

Files changed: domain classroom-ai.ts (43), index.ts (3), study-plan-schema.ts (14), study-plan.ts (40); ai configuration.ts (33), errors.ts (6), gemini-adapter.ts (102), gemini-response.ts (28), index.ts (4); files approved-plan-reader.ts (40), docx-archive.ts (52), docx-text.ts (31), docx-xml.ts (32), durable-plan-reader.ts (54), plan-document-error.ts (4), plan-document-worker.ts (17), index.ts (14); package.json (93), package-lock.json (7007), .env.example (16). Counts observed at this handoff, excluding future agents' edits.
