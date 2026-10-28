# Student journey — main integration and publication

- Agent: root, solo; runtime identity unavailable, no attributed memory writes.
- Date:2026-10-28. Status: in_progress (verification passed; remote publication next).
- Scope: current user explicitly authorizes integrating and pushing the completed student-journey changes to main, verifying functionality and preserving parallel student-AI work. No deployment or new academic/provider operation.
- Source: `0f3407daf722eabab9670f66056584e45ddb5d8a`, containing implementation `e1d9b4820c5ba0ce66aa89b50692da320d8bc1ce` and its passive evidence closure. [Journey proof](2026-10-28-root-student-journey.md).

## Isolation and integration

Fetched origin; main and origin/main both began at `abcfbab6c01acc0cc85972f5561876ebabaac97f`. Created a dedicated managed worktree `foxmind-student-publication/ProtipoFoxMind`, switched only that clean checkout to main and fast-forwarded to the exact reviewed source commit. The original checkout stays on `codex/student-journey-polish` with pending student-AI files. No stash/reset/checkout/cleanup of that directory, no cherry-picking or staging of AI changes. Separate dependency installation avoids overwriting the parallel work's generated Prisma client or build output.

## Verification and handoff

Existing authenticated evaluation/PDF journeys remain evidence for unchanged source; this delivery performs no repeated academic writes. Physical-device/Safari and historical scope limits remain unchanged.

### Observed regression and repair

The first expanded regression run returned58 PASS,3 FAIL,4 SKIP. Private grading passed, but some extremely fast direct-service submissions failed the unchanged `attempt_submission_check`. A sanitized diagnostic rerun identified PostgreSQL23514: persisted opening22:40:30.832Z versus Node receipt22:40:30.831Z; the observed database clock was11ms ahead of Node. This was not a new UI failure. The fixture crosses Windows/Docker clocks without the browser/user round trip.

Added test-only `waitForAttemptClock` before direct fixture submissions in the P8 grading/progress/publication helpers. It waits for the real clock to reach the persisted opening, with40 bounded polls and a1-second maximum accepted drift. Invalid dates, larger drift and stopped clocks fail explicitly. Two new tests cover those bounds. No production timestamp, receipt capture, deadline policy, database invariant or assertion was changed; no sleeps/retries were added to product requests. The diagnostic runs and initial skipped cases remain historical failures, superseded by the complete green run below.

### Final checks on isolated main

- `npm ci --ignore-scripts --no-audit --no-fund`:389 packages installed in the new worktree only; lockfile unchanged.
- `npm run api:build`: own Prisma client generation and strict API compilation both exit0.
- `npm run web:build`: production Next build and all routes exit0. `node node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json`:exit0.
- Regression command prefix: `node --experimental-transform-types --test --test-concurrency=1 --test-reporter=spec`; files: `tests/attempt-clock-fixture.test.mjs`, `student-feedback-journey.test.mjs`, `p7-questionnaire-client.test.mjs`, `p7-questionnaire-autosave.test.mjs`, `p7-questionnaire-overview.test.mjs`, `p8-publication-client.test.mjs`, `p8-grading-client.test.mjs`, `p8-corrections-client.test.mjs`, `foxmind-3d-flows-attempt.test.mjs`, `p8-progress-client.test.mjs`, `p8-scoring.test.mjs`, `p8-progress-calculation.test.mjs`, `p8-grading-proxy.test.mjs`, `p8-publication-proxy.test.mjs`, `p8-progress-proxy.test.mjs`, `education-experience.test.mjs`, `p8-grading.test.mjs`, `p8-publication.test.mjs`, `p8-progress.test.mjs` (all under `tests/`). Result78 PASS,0 FAIL,0 SKIP in51.3s. All owned ephemeral PostgreSQL fixtures cleaned up with exit0; no development/retained database used.
- Read-only existing preview smoke: `/api/v1/health/ready`, `/sign-in`, `/inicio`, `/agenda` all200. This is existing runtime availability, not a newly deployed main server.
- `git diff 0f3407d -- apps src prisma package.json package-lock.json`:empty. Reviewed product source is unchanged; parallel StudentAiSummary/API student-ai paths are absent from this worktree.
- `git diff --check`:PASS. `gitleaks git --redact --log-opts=origin/main..HEAD`:two reviewed source commits,0 leaks. Staged test/record scan before the delivery commit follows.
- Original checkout remains on `codex/student-journey-polish`, with its tracked/untracked student-AI work present and continuing. No source files, generated clients, build outputs, secrets or records there were overwritten by this task. Its own ongoing changes are not publication candidates.

## Delivery handoff

Verification is complete; commit the test-clock repair and this evidence, push main normally (no force), then verify the exact remote ref. Keep the dedicated main worktree clean and available; preserve the original AI checkout. Rollback of the new test-only unit does not revert product changes or mutate any persisted data. No deployment or remote CI result is claimed.
