# Activity multi-topic GREEN — in progress

- Agent / role: slice_worker
- Session or task ID: /root/activity_multitopic_green
- Date: 2026-10-25
- Branch / worktree: codex/classroom-activity-ai
- Starting commit: af48e698aa575733e60a9e900875075dda77e138
- Phase and detailed task/spec links: [activity AI](../../odd/tasks/classroom-activity-ai.md), D1 multi-topic
- Status: completed

## Request and scope
Implement backend multi-topic selection and owned schema/migrations after independent RED. Preserve other agents' edits. Initial scope excluded UI. Coordinator explicitly expanded ownership during this task to activity UI and classroom proxy; no tests, AI provider, Git or publication changes.

## Work performed
Read roadmap, work-record protocol, classroom barrel, authoring/policy/Plan seams and schema. Applied clean-architecture skill. Received independent RED confirmation from /root/activity_red_tests (4 failing, 1 passing policy cases).

## Verification
Prisma explicit association documentation consulted through Context7 before schema changes.

- `node scripts/build-api.mjs`: exit 0, Prisma 7.10 generation and API TypeScript compilation passed (coordinator build lock held/released).
- `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit`: exit 0 after helper extraction.
- `node --test --test-reporter=dot tests/p7-authoring.test.mjs tests/p6-plan.test.mjs tests/activity-multitopic.test.mjs tests/activity-multitopic-database.test.mjs`: exit 0, 30 test entries including seven PostgreSQL multi-topic scenarios. Owned disposable classroom_ai_test DB only; rollback fixtures.
- No lint script or linter configuration found in package.json/file discovery; linter unavailable, not represented as passed.
- Initial compound inspection command had exit 1 due `rg` receiving an unmatched Windows migration glob; no production/test failure. Separate exact verification commands above succeeded.

Additional assigned implementation: schema AI tables/constraints match the architect frozen contract; shared study-plan-v1 budget ledger unchanged. Frontend separates manual creation/IA, preserves ordered manual topics, shows source availability/DOCX acknowledgement and pedagogical input, recovers durable jobs, polls without automatic generation, keeps an edited previous proposal while regenerating, requires explicit replacement, provides a student-safe preview and applies to a new draft/editor. Publication remains explicit. Applied React best-practices review: stable effects/cleanup, no generation on mount, accessible fieldsets/labels/status/errors, no private keys in student preview.

Owned paths and final line counts at handoff:

```text
apps/api/src/classrooms/activity-authoring.ts 183
apps/api/src/classrooms/activity-policy.ts 83
apps/api/src/classrooms/activity-topics.ts 37
apps/api/src/classrooms/activity-content.ts 23
apps/api/src/classrooms/activity-draft.ts 25
apps/api/src/classrooms/index.ts 2
apps/api/src/classrooms/plan.ts 118
prisma/schema.prisma 985
prisma/migrations/202610250001_activity_topics/migration.sql 16
prisma/migrations/202610250002_activity_ai/migration.sql 52
apps/classrooms-ui/Activities.tsx 102
apps/classrooms-ui/ActivityAuthoring.tsx 161
apps/classrooms-ui/api.ts 390
apps/classrooms-ui/ActivityGeneration.tsx 69
apps/classrooms-ui/ActivityGenerationForm.tsx 54
apps/classrooms-ui/ActivityGenerationProposal.tsx 35
apps/classrooms-ui/activity-generation-api.ts 46
apps/classrooms-ui/use-activity-generation.ts 59
apps/web/src/lib/classroom-proxy.ts 337
apps/web/src/lib/activity-generation-proxy.ts 14
```

Additional verification:

- `node node_modules/prisma/build/index.js validate`: first P1012 reverse optional compound one-to-one relation; fixed reverse to array while preserving UNIQUE applied_activity_id. Next invocation exit0.
- `node --test --test-reporter=dot tests/activity-multitopic-database.test.mjs`: exit0, eight entries / seven scenarios with both new migrations applied.
- `node node_modules/typescript/bin/tsc -p apps/classrooms-ui/tsconfig.json --noEmit`: exit0, repeated after final UI edit.
- `node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit --incremental false`: exit0.
- `node --test --test-reporter=dot tests/activity-ai-ui.test.mjs tests/activity-ai-proxy.test.mjs tests/p7-authoring-client.test.mjs tests/p7-authoring-proxy.test.mjs`: final exit0 / eight entries. Initial UI hook harness lacked useMemo; removed unnecessary client-factory memo and kept effects dependent on api/room, second invocation passed. Tests were never edited.
- No repeated same-error two-strike failure. No linter configured. Independent live browser proof remains assigned to test_runner; no screenshots/live approval claimed here.

## Commits and outcomes
No commits made.

## Handoff
Multi-topic implementation is ready for independent verification/UI integration. Added ordered join with backfill, composite unit/classroom FKs, 0..99 position bound; save/metadata delete old links before changing unit and then replace atomically. DTOs retain legacy primary topic. Plan deletion sees secondary links. No metric join introduced, preserving per-activity counting. Created authorized-TX generated draft seam through classrooms barrel and extracted content helper. AI schema delivered and validate/owned DB pass observed. Final shared runtime build and broad suite belong to coordinator/runtime worker; independent browser QA is next. This worker implemented the publish revalidation callback invocation; AI worker owns port/composition. No whole-feature acceptance claimed.

## Final encoding correction

Coordinator Next build detected invalid UTF-8 in owned ActivityAuthoring.tsx (first strike): Python on Windows used its default encoding for an inserted accented selector label. Audited all21owned source/record paths with strict UTF-8 decode; only that file failed. Converted only invalid byte sequences, preserving existing valid UTF-8 bytes and unrelated edits. All21paths then decoded strictly. Repeated UI/proxy/P7 command above exit0, now11entries after tester additions. Coordinator owns bounded Next build rerun. No source/test regression hidden, no test edits.

## Attributed review corrections — 2026-10-25, /root/activity_multitopic_green

Coordinator reopened this task for review/QA defects against TREEf6ef; scope remains local and tests immutable. Corrections are complete for this worker's assigned surfaces; full-feature review and live acceptance remain coordinator-owned.

- B1: removed only the new ActivityAiGeneration→Unit live relation and the matching FK in 202610250002_activity_ai. Kept required historical unit_id UUID and curriculum_snapshot, classroom/owner/applied-activity FKs and all job history. Independent test observes deletion of an unused unit after failed generation and later STALE job without deleting its snapshot. Twelve historical migrations untouched.
- B3: activity-history.ts now enriches both student history and teacher submissions using ordered readActivityTopics; no secondary association dropped.
- Polling: stable accept helper updates open view and recent job row in place; open, polling, refresh, generation and apply synchronize status/proposal; new jobs prepend while existing rows preserve order. Apply marks known server-confirmed APPLIED/activity ID before editor callback.
- A05: new ActivityCurriculum.tsx renders resolved unit and every ordered selected topic on cards and preview. ActivityPreview accepts optional room; student preview keeps correct-key/rule data private.
- Unknown recovery: initial GET list recovers latest listed FAILED/PROVIDER_OUTCOME_UNKNOWN without POST. Existing initial-generate guard exposes explicit acknowledged regeneration. Charge acknowledgment resets for each new job ID.

Verification observed:

- Initial focused regression run: B1 and polling PASS; B3 FAIL used the old .build through fixture, B2 remained another owner's RED. Requested coordinator build lock before refreshing generated artifacts; no test edits.
- `node scripts/build-api.mjs` under granted lock: exit0, Prisma generation and API TypeScript compilation.
- `node --test --test-reporter=dot --test-name-pattern='B1|B3' tests/activity-review-regressions.test.mjs`: exit0 / two entries.
- `node node_modules/prisma/build/index.js validate`: exit0.
- `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit`: exit0.
- `node node_modules/typescript/bin/tsc -p apps/classrooms-ui/tsconfig.json --noEmit`: final exit0.
- `node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit --incremental false`: final exit0.
- `node --test --test-reporter=dot tests/activity-review-regressions.test.mjs tests/activity-curricular-context.test.mjs tests/activity-ai-polling.test.mjs tests/activity-ai-ui.test.mjs tests/activity-unknown-start.test.mjs`: final exit0 /21entries, including AI-owner B2/unknown corrections present concurrently.
- No configured linter. No tests edited, no commits/publication or runtime restart. Source edits explicitly UTF-8.

Frozen corrected paths: prisma/schema.prisma; prisma/migrations/202610250002_activity_ai/migration.sql; apps/api/src/classrooms/activity-history.ts; apps/classrooms-ui/use-activity-generation.ts; apps/classrooms-ui/ActivityCurriculum.tsx; apps/classrooms-ui/Activities.tsx; apps/classrooms-ui/ActivityAuthoring.tsx; apps/classrooms-ui/ActivityGeneration.tsx; this attributed record.

Next action: coordinator recreates owned preview against corrected migration, then scoped independent review/browser verification. No whole-feature completion claimed.

## Final2 scoped UI correction — 2026-10-25, /root/activity_multitopic_green

Coordinator assigned the corroborated recovery defect only. Independent /root/activity_red_tests observed RED in activity-unknown-start.test.mjs: a newer READY successor followed by an older UNKNOWN ancestor incorrectly auto-selected the ancestor and disabled initial generation.

Changed exactly two production lines in apps/classrooms-ui/use-activity-generation.ts: bootstrap now examines list.jobs[0] and auto-recovers it only when that newest job is FAILED/PROVIDER_OUTCOME_UNKNOWN. Historical rows and their order remain available; genuinely latest UNKNOWN still recovers without a POST. No DTO, provider, semantic guard, tests, schema, runtime or Git edits.

Verification:

- `node --test --test-reporter=dot tests/activity-unknown-start.test.mjs tests/activity-ai-polling.test.mjs tests/activity-ai-ui.test.mjs tests/activity-curricular-context.test.mjs`: exit0 /20entries, including newest-UNKNOWN recovery, resolved ancestor, polling, dirty replacement and zero-POST load checks.
- `node node_modules/typescript/bin/tsc -p apps/classrooms-ui/tsconfig.json --noEmit`: exit0.
- No API/Next build or live restart performed; active verifier runtime preserved. No linter configured.

Final2 hook frozen for scoped verification. This correction does not claim whole-feature completion.
