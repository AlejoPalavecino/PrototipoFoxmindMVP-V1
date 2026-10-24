# Agenda — preparación y diseño

- Agent / role: /root, coordinator.
- Session or task ID: /root (runtime task identifier; session ID unavailable).
- Date: 2026-10-23.
- Branch / worktree: codex/foxmind-agenda; C:/Users/alejo/.codex/worktrees/foxmind-agenda/ProtipoFoxMind.
- Starting commit: ed06f885bfbf08725024013a7a45c9a3a723cfc7.
- Phase and detailed task/spec links: new agenda feature; [functional spec](../foxmind-v1-functional-spec.md), [roadmap](../implementation-roadmap.md).
- Status: in_progress.

## Request and scope

User requests a new Agenda section beside Inicio and Mis aulas, upcoming academic deliveries and personal events such as classes, activities and evaluations. Work must remain in a separate worktree for later integration into main. No publication or retained-data changes are part of this request.

## Work performed

Read original checkout roadmap/work-record protocol and inspected actual Git state. Original feat/p33-token-flows HEAD4395484 has untracked designs and records; preserved untouched. Managed worktree starts at main ed06f88, containing later P0–P9 and folder presentation. Created local codex/foxmind-agenda branch. Read current AGENTS, roadmap, navigation specification, shared navigation and theme guide.

Dispatched read-only /root/explore_agenda and design-only /root/design_agenda. Coordinator owns this record and eventual roadmap updates; architect owns separate feature design and record. Implementation/test ownership will be assigned after design.

## Verification

- git status --short: new worktree initially clean; original untracked files preserved.
- git log -1 --oneline: ed06f88 docs(ui): confirm folder main publication without deployment.
- git switch -c codex/foxmind-agenda: exit0.
- Source inventory confirms Next pages router, shared AppNavbar and existing academic backend; implementation checks have not run.
- Initial query apps/web/app did not exist; corrected inventory to apps/web/pages. No runtime failure implied.
- Engram mem_save rejected by hook: Codex host session not registered. Repository records remain the durable handoff; no memory save claimed.

## Commits and outcomes

No agenda implementation commit yet. User answered D1: include unique events and weekly recurrence from the first version. Coordinator specified bounded series with whole-series edit/delete, made explicit in UI. Architect finalized the contract as ready for RED.

## Preparation update

- git fetch origin: exit0; live-updated origin/main remains ed06f885bfbf08725024013a7a45c9a3a723cfc7.
- Started installed Docker Desktop hidden; docker info now reports server29.9.2. Initial unavailable daemon is resolved, not retroactively PASS.
- npm ci --no-fund --no-audit: exit0,353packages. npm reported Prisma lifecycle scripts blocked by its allowScripts policy; no global policy change performed.
- node scripts/build-api.mjs: fresh baseline Prisma generation and API TypeScript both exit0 (approximately5.6s total). Lifecycle-script warning did not block this actual build.
- Dispatched /root/agenda_red for tests and /root/agenda_green for domain/backend/schema only after observed RED. Frontend remains separately assignable; production workers cannot edit test files.

## Handoff

Implement the finalized [agenda contract](../../odd/tasks/agenda.md) through independent RED and GREEN, then actual isolated integration and ego-browser UI verification. Current work is preparation, not completed agenda functionality. Weekly recurrence is resolved; do not ask it again.

## Candidate and verification coordination

Backend/domain, academic projection and frontend workers report GREEN and source freeze. Coordinator froze66changed source/test/script paths in ignored .test-artifacts/agenda-review/round0.json; logical digest SHA256(JSON.stringify(files)) is03e0f8af4e5b1ec9aa45155c25faed54bc1559f2e91671222ef65341a14848fd. Source entries contain per-file SHA256; documentation is outside this source freeze and continues to record results.

Dispatched independent Verify /root/agenda_verify with user-requested gpt-6.1-sol/xhigh. Its scope is all9Agenda suites, fresh builds, affected regression checks and real desktop/mobile ego-browser/API/SQL journeys. Also dispatched two blind read-only L3 judges against the identical frozen manifest. Their results remain pending; no review approval claimed.

Coordinator-owned harness preparation: new migration inventory is10with exact final name202610230001_agenda_events, preserving applied-history equality. Fresh P4 fixture database renamed p4_test (no retained database rename). node --check both scripts and14existing runtime/integration control tests passed. Added npm run test:agenda wrapping a fresh API build and the nine exact suites, excluding the helper from test discovery; syntax and --help passed, full execution assigned to Verify.

Planned local work units after DoD: design record; pure domain+tests; academic projection+tests; application service+tests; private SQL persistence+tests; authenticated transport+tests; web client/proxy+tests; calendar components; form/page/navigation; final verification/docs. Keep each staged unit below400authored changed lines, with public facade exports staged only when their implementation is included. These are planned units, not commits or delivery claims.

## 2026-10-24 closure handoff

This preparation record is historical. [Current closure](2026-10-24-root-agenda-closure.md) reconciles final J4 tests/builds, source manifest, attributed review and local commit units. User explicitly requests commits in the worktree without main integration. No memory write is attempted while runtime registration is unavailable. Pixel capture proof remains unavailable; no global/native visual approval is claimed.
