# Activity generation backend — in progress

- Agent / role: activity_ai_green / slice_worker
- Session or task ID: /root/activity_ai_green
- Date: 2026-10-25
- Branch / worktree: codex/classroom-activity-ai / classroom-activity-ai/ProtipoFoxMind
- Starting commit: af48e69
- Phase and detailed task/spec links: [activity AI](../../odd/tasks/classroom-activity-ai.md)
- Status: in_progress

## Request and scope

Implement authorized local backend generation after independent RED. Own domain activity contracts, generation adapter, approved generation document reader, durable activity jobs and minimal composition. No tests, UI, Prisma, Git publication or retained private configuration.

## Work performed

Read roadmap, work-record protocol, feature proposal, extraction guide and public barrels before inspecting related implementation. Reviewed existing durable extraction fencing, shared budget, provider and private-file boundaries. Read clean-architecture skill. Consulted Context7 official Google GenAI SDK structured JSON and continuation documentation (installed 2.31.0), plus PDF-lib official loading/page-count documentation (installed 1.17.1).

Implemented strict pure activity generation/proposal/request contracts and schema; Gemini adapter with complete request fingerprinting, bounded preflight/dispatch, structured READY/INSUFFICIENT_CONTENT envelope, private selection keys, separate system instructions, inline sources and no tool/retry/continuation enablement. Added real capability-bound private source reader with approved custody, same-aula/latest-plan/material resolution, digest checks before/after I/O and parsing, PDF page count, isolated bounded parser worker and DOCX warnings.

Implemented durable service commands, canonical idempotency ledger, curricular/source snapshots, teacher/owner isolation, private candidate views, same-transaction apply via the MT-owned authoring seam, and source-provenance validation for later publication. Per-actor user locks serialize mutation request identity; collection/status views hide obsolete proposals. Coordinated separate runtime-worker ownership of claims/budget/worker/composition and MT ownership of schema/authoring/UI.

Owned production paths (line counts at handoff):

- src/core/domain/activity-generation.ts (51), activity-generation-values.ts (42), activity-generation-request.ts (31), activity-proposal.ts (58), activity-proposal-schema.ts (18), index.ts (13).
- apps/api/src/ai/activity-adapter.ts (70), activity-prompt.ts (21), activity-response.ts (31), index.ts (5).
- apps/api/src/files/activity-source-reader.ts (65), activity-source-snapshot.ts (25), activity-document.ts (21), activity-document-worker.ts (19), index.ts (15).
- apps/api/src/classrooms/activity-ai/contracts.ts (30), database.ts (36), requests.ts (22), source.ts (42), candidates.ts (24), service.ts (84), apply.ts (37), provenance.ts (9).
- apps/api/src/classrooms/contracts.ts (39): optional publication validation port only.
- apps/api/src/classrooms/classrooms.module.ts (72): final ownership transferred from runtime worker for the always-on publication-provenance validator.

## Verification

Observed independent RED before every assigned surface: domain 5 failures, adapter 6 failures, service jobs 3 failures, real reader missing export. Tests are exclusively tester-owned and were never changed by this agent.

- `node --test --test-reporter=dot tests/activity-ai-contracts.test.mjs tests/activity-ai-adapter.test.mjs`: final 13 PASS, exit 0. Initial adapter run failed Node strip-only parameter-property syntax; replaced with explicit property, then 6 PASS. Normative provider-envelope change subsequently observed RED independently; final envelope/schema PASS.
- `npm run api:build --silent`: Prisma generation/API compilation exit 0 under coordinator lock after domain/adapter; later runtime worker observed fresh integrated compilation exit 0 including the reader.
- `node --test --test-reporter=dot tests/activity-ai-reader.test.mjs`: first production run passed four child scenarios; fixture's attempt to reverse irreversible material soft deletion failed existing P6 trigger. Tester repaired its own fixture with a distinct material; tester subsequently observed all six tests PASS. No production invariant was weakened.
- Runtime worker reports 30 PASS for jobs/lifecycle/budget/source-limits after correcting JSONB object-order comparison with deep equality; own source.ts was corrected in coordination before successful rerun.
- `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit`: final exit 0.
- `git diff --check`: exit 0; only LF-to-CRLF notice for architect-owned feature document.
- No linter script/configuration is configured in package.json; separate linter execution unavailable. Type checking and whitespace checks are explicit above.
- Additional coordinator review found AI-disabled module composition omitted validation of previously generated drafts. Tester reproduced RED in `tests/activity-ai-publication.test.mjs` (missing expected rejection). Changed module composition to install a snapshot-only publication validator independently of AI/provider configuration; no provider is constructed for this path. Final `tsc --noEmit` and `git diff --check` passed; tester's fresh compiled GREEN follows in final coordinator evidence.

No Google requests, retained configuration reads, commits or publication. Latest tiny final-reader post-parse snapshot, user-write serialization and AI-disabled publication edits are typechecked; final consolidated build/integration belongs to coordinator. All production owned by this agent is frozen and coordinator notified before that build.

## Commits and outcomes

No commits by this agent.

## Handoff

Assigned backend code is GREEN under the stated observed checks; leave status in_progress until coordinator's final integration/independent QA. First next action: coordinator fresh build then controlled-provider live flow and independent review. HTTP routes/types are frozen in odd/tasks/classroom-activity-ai.md; runtime worker owns `/classrooms/:classroomId/activity-generations` composition, collection/status/sources/start/regenerate/apply. UI consumes domain ActivityGenerationView/ActivitySourceCandidate and `{generationId,activityId,revision}` apply result. No full-feature or visual acceptance claimed by this worker.

## Review correction batch 1 — A01, A02/B2, A04

Coordinator reactivated `/root/activity_ai_green` for fixes within the already-authorized generation scope, after blind review candidate TREEf6ef. No user approval or new migration/configuration/provider operation was needed. MT worker owns history/schema/UI; tester exclusively owns regression files.

- A02/B2: independent replay RED preceded correction. Added `activity-ai/current-view.ts`; collection, status and identical start/regenerate replays use the same revalidation. Changed sources/curriculum yield STALE with proposal hidden, retaining original job identity and no provider I/O. Active running claims retain settlement ownership.
- A01: tester observed independent unknown-start RED. Added `activity-ai/unknown-start.ts`: new starts compare sanitized logical inputs independently of revision/request ID, with canonical selection ordering, UUID case and trimmed pedagogical strings. An unresolved unknown outcome blocks equivalent starts with stable `PROVIDER_OUTCOME_UNKNOWN`; explicit acknowledged successor resolves the predecessor gate, and a new unknown successor requires another acknowledgement. Genuine different pedagogical requests remain permitted. Existing conservative accounting is unchanged.
- A04: tester observed real authenticated host RED returning 503 for two approved 10,000,001-byte materials. Updated `activity-ai/http.ts` transport wrapper to return 400/AI_INPUT_LIMIT and 409/PROVIDER_OUTCOME_UNKNOWN with stable sanitized codes. Queue and provider remain untouched on rejection.

Observed verification:

- `node --test --test-reporter=dot --test-name-pattern='B2' tests/activity-review-regressions.test.mjs`: 3 PASS.
- `node --test --test-reporter=dot tests/activity-unknown-start.test.mjs`: initial backend 5 PASS; one UI recovery failure remained assigned to MT, not modified by this agent.
- `node --test --test-reporter=dot --test-name-pattern='fresh request|acknowledged regeneration|acknowledged successor|B2' tests/activity-unknown-start.test.mjs tests/activity-review-regressions.test.mjs`: 9 PASS.
- `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit`: exit 0; `git diff --check`: exit 0, CRLF notices only.
- `npm run api:build --silent`: fresh Prisma generation and API compilation exit 0 under coordinator build lock, then lock released.
- `node --test --test-reporter=dot tests/activity-input-limit-host.test.mjs tests/activity-unknown-start.test.mjs tests/activity-review-regressions.test.mjs`: 13 PASS, 0 FAIL. Includes real host aggregate-limit rejection and MT-owned B1/B3/UI fixes integrated in the fresh build.
- Direct source-module transport probe: unknown-outcome rejection maps to HTTP 409 with exact stable code, PASS.

No tests, schema, history, UI, ledger, secrets or Git operations were edited/executed by this agent for this batch. No full-feature acceptance claimed. Coordinator owns final scoped review and independent integration proof.

### Final sibling-path closure and freeze

Coordinator kept the older-READY regeneration path within A01 scope. Tester observed three RED results for regenerating an older READY predecessor after a later equivalent result became UNKNOWN, both with acknowledgement false and true. The shared guard now applies to every new job creation: matching unresolved uncertainty can only be acknowledged using that actual uncertain predecessor with `acknowledgePossibleCharge=true`. Selecting an unrelated older predecessor cannot bypass it. Replays still return the original revalidated view without consuming anything.

Final affected production paths and full line counts: `apps/api/src/classrooms/activity-ai/current-view.ts` (13), `unknown-start.ts` (21), `service.ts` (79), `http.ts` (33).

- Direct unknown/review source suite: 15 PASS before final compile.
- One static attempt exposed TS2322 (`unknown` property narrowing was lost inside the transaction callback). Replaced the already-validated acknowledgement property with explicit `=== true`; no second failure occurred.
- Final `npm run api:build --silent`: Prisma generation exit 0, API TypeScript compilation exit 0.
- Final `node --test --test-reporter=dot tests/activity-input-limit-host.test.mjs tests/activity-unknown-start.test.mjs tests/activity-review-regressions.test.mjs`: **16 PASS, 0 FAIL**, including real host, both sibling acknowledgement variants, positive acknowledgement recovery, replay, UI recovery and integrated B1/B3.

All assigned production is frozen; coordinator and independent tester received exact final build/test proof and build lock release. Only this attributed log was changed afterward. Feature status remains in_progress pending coordinator-scoped review and independent QA; this implementation correction scope is GREEN.
