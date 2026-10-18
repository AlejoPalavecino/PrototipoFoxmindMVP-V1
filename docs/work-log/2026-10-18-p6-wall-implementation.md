# P6 Muro and personal notifications — implementation

- Agent / role: bounded implementation writer
- Session or task ID: /root/p6_wall_implementation; authoritative session ID unavailable
- Date: 2026-10-18
- Branch / worktree: codex/p6-teaching; managed p4-p3-integration checkout
- Starting commit: 562650cbc22305ad050da75235755369aa2c9260
- Phase / specs: P6 T3, S1/S3 in odd/tasks/p6-teaching.md; S2/S4 remain coordinator-owned.
- Status: in_progress (implementation complete; partial required verification due final inherited ECONNRESET)

## Request and scope

Implement the coherent Muro and its P6 in-platform notifications, preserving P3/P4/P5, current classroom roles, archive restrictions and optimistic revisions. No P7, academic emails, dependencies, remote operations, Git operations or retained-data mutation. Parent owns shared roadmap, feature document and final integration/Verify/publication.

## Work performed

Read the feature document, functional specification, database models, shared classroom authorization and transport/UI conventions. Created this record before source implementation.

- Added `wall.ts`/`wall-policy.ts`, extending the existing Library service and retaining the original DI token/provider chain through `service.ts`. Reused transactional user/classroom/member checks, lock ordering, rate controls and `advanceRevision`.
- Added classroom-scoped NOTICE/QUERY/plain-text grouped replies, authorship-only edits, teacher removal-only moderation, explicit confirmation and body-null tombstones. Existing replies survive parent removal and remain individually editable/moderatable; removed parents cannot receive new replies or be restored.
- Added transactional event-recipient deduplicated `WALL_NOTICE`, `WALL_QUERY` and `WALL_REPLY` creation. Current personal list/read/open join actual classroom/parent/reply access. Personal archive read flags do not change content revision; no email/job events are created.
- Added explicit API/proxy routes/action shapes while retaining old transport limits/deadlines and contracts.
- Added actual `Muro` UI with text counts, safe React text rendering, grouped thread controls/confirmation, removed markers and current revision refresh. Added global personal `Notificaciones`, read/unread, refresh and opening/focusing the actual classroom thread. Existing profile/logout/wizard flows remain in the existing shell.
- Added focused SQL/API/proxy/client/React-renderer tests and `docs/p6-muro.md`.
- No Prisma model/migration changes, dependencies, native-review changes, Git mutations, retained-data changes or remote operations. Read-only Git status/stat were inspected; no baseline Git extraction or ref/index operations were performed. There remain eight migrations. Parent-owned work in shared tracking/manifests/runtime tests was preserved.

## Verification

Observed test-first evidence:

- `node --test --test-concurrency=1 tests/p6-wall.test.mjs`: RED 8 failures, `listWall`/`changeWall` absent, owned cleanup exit0.
- Notification preparation first failed the existing `membership_end_check` (ended timestamp/actor fixture omissions). Corrected only owned test setup, then observed meaningful RED 7 failures for absent notification/wall methods; owned cleanup exit0. Historical preparation failures remain attributed.
- `node --test --test-concurrency=1 tests/p6-wall-client.test.mjs`: RED on missing proxy route404; pre-existing general client behavior passed.
- First combined GREEN attempt: 12 passed / 5 failed (including parent suite failures); fixed tests that passed a synchronously throwing validator directly to `assert.rejects`, and an invented outbox-table assertion. Actual academic email queue is `background_jobs`; no source policy/budget changed for those fixture/assertion fixes.
- Added direct API inherited-action test: `toString` produced503 instead of400 while proxy tests already passed. Fixed map lookup with `Object.hasOwn` in both new action validators, then rebuilt and observed final GREEN. No user text truncation or validation narrowing.

Final exact delegated checks:

| Command | Observed result |
|---|---|
| `node scripts/build-api.mjs` | Prisma generation exit0 and API TypeScript exit0, unchanged30s build ceiling |
| `node --test --test-concurrency=1 tests/p6-wall.test.mjs tests/p6-notifications.test.mjs tests/p6-wall-client.test.mjs` | 18 PASS, 0 fail/skipped/cancelled; two owned PostgreSQL cleanup exit0 |
| `node node_modules/typescript/bin/tsc --project apps/web/tsconfig.json --noEmit` | exit0 |
| `node node_modules/typescript/bin/tsc --project apps/classrooms-ui/tsconfig.json` | exit0 |
| `node --test --test-concurrency=1 tests/p5-host.test.mjs tests/p5-http.test.mjs tests/p5-session-bridge.test.mjs tests/p5-web-proxy.test.mjs tests/p5-ui-client.test.mjs tests/p6-plan.test.mjs tests/p6-library.test.mjs tests/p6-library-client.test.mjs` | Initial43PASS; final-byte rerun42PASS/1FAIL (below), owned cleanup exit0 both times |

Final-byte inherited check failure: `tests/p5-web-proxy.test.mjs:42`, `unknown paths/queries/methods/schema/encoding and excessive JSON never reach upstream`, `TypeError: fetch failed`, cause `read ECONNRESET`, errno-4077, syscallread. No assertion/vector was identified by that test's diagnostic. All other42checks passed. The required command exited1; it is not a global PASS and causality is unproven. No automatic retry, timeout/policy change or transport repair was attempted. Parent informed immediately for bounded disposition; this supersedes earlier own overall GREEN status, without erasing the first43PASS.

The focused suite asserts publication/reply Unicode boundaries and multiline preservation, escaped literal HTML, names/initials-only disclosure, ordering with ties, authorship/moderation, surviving replies, stale/concurrent writes, foreign/former/unverified/archive denial and rejected-data invariants. Notification coverage includes per-classroom roles/recipients, self exclusion, no duplicate events, transactional content/revision rollback on deliberately rejected notification INSERT, newest/read/open, idempotent read, archived personal flags, removed history and revoked-access rejection.

The actual trusted TSX content renderer is transpiled in memory and rendered with React DOM Server; no emitted test file or replacement renderer is used. SQL fixtures inject identity only as controlled domain evidence, NOT actual P3 session acceptance. Parent owns actual integrated/browser/persistence proof and baseline Git differentials; writer has no Git authorization. No separate OS-temp scratch was created; owned Docker resources cleaned successfully by existing helper. Existing parent scratch was not touched.

Structural readback of all16owned files, conflict-marker scan and local documentation-link resolution passed exit0. No functional test is needed for the final passive work-record/doc changes beyond those structural checks.

## Commits and outcomes

No writer commits. Parent owns Git.

Risk: items1/2/3/4 (persisted content tombstones and personal read flags; scoped authorization; shared API/proxy contracts; serialized optimistic concurrency). Coherent behavior/API/UI/tests/docs exceeds the advisory400-line heuristic; no code compression or omitted proof was used.

## Handoff

Parent: resolve the final required inherited proxy ECONNRESET with one bounded diagnostic disposition before accepting T3, then spot-check final T3 command, run baseline shared transport/client differentials and full P6 actual P3/browser/API/SQL/mail/storage/restart/upgrade evidence, then fresh independent Sol/xhigh Verify. No P6 phase completion, merge, push, native approval or publication claimed by this writer. T3 verification is partial; T4/T5/T6 remain unaccepted.

Skill resolution: paths-injected; loaded exact delegated nodejs-backend-patterns, vercel-react-best-practices, cognitive-doc-design and work-unit-commits skill files before work.
