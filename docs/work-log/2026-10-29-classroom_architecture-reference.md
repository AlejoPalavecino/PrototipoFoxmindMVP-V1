# Classroom interior references — design audit

- Agent / role: `/root/classroom_architecture`, architect (`gpt-6.1-sol`, xhigh).
- Session or task ID: `/root/classroom_architecture`; authoritative runtime memory identity unavailable.
- Date: 2026-10-29.
- Branch / worktree: `codex/inicio-reference-astra`, isolated `foxmind-inicio-astra/ProtipoFoxMind`.
- Starting commit: `5ff88e5`.
- Phase/task: existing classroom P5–P8 UX, eight supplied interior references; [coordinator](2026-10-29-root-classroom-interior-reference.md).
- Status: completed — design audit and contracts ready; implementation/acceptance remain with coordinator.

## Request and scope

Design the implementation plan for Plan, Muro, Biblioteca, Actividades, Progreso, Alumnos, Historial and Configuración while preserving existing contracts and defining disjoint edit surfaces. Read-only product audit; own design record only. Apply ambiguity-gate, Clean/GRASP and team-docs-strategy. No backend/data/provider/publication operation.

## Work performed and verification

Read the three applicable skills, roadmap checkpoint and work-record protocol. Git reports base `5ff88e5`; only coordinator's new work record was untracked at audit start. Inspected `ClassroomView`, `ClassroomHeader`, `Plan`, `PlanWorkspace`, `use-plan-workspace`, `Library`, `Wall`, `Activities`, `Progress`, public `api.ts`, settings whitelist in `drafts.ts`, functional-spec sections7/10/11 and focused test helpers/entrypoints. No tests/build/browser execution by architect. No Engram read/write was attempted because authoritative runtime registration is unavailable; repository records are the durable contract.

## ESTADO_DISENO: LISTO_PARA_TDD_RED

The user selected eight existing screens and authorized the AGENTS delegation/models. This is a frontend redesign in the existing isolated worktree, without a new product/stack or backend contract. No critical business ambiguity remains after coordinator clarification: **only new behavior is local Library title search**. Wider library filters/sort, roster search and Plan→Muro callback were suggested during audit but explicitly excluded by coordinator; they are not part of this contract. No additional confirmation is needed for reversible composition choices.

## ESTRATEGIA_EQUIPO_Y_SUPUESTOS

Reuse the accepted strict TypeScript/React stack and current public types. The eight references guide composition, hierarchy, cream/orange palette, section cards and responsive adaptation; actual returned data determines content/counts/states. Keep current standard icon library and category cover assets. Any generated raster should be decorational, converted to responsive WebP, and must not contain editable UI data.

One owner controls `ClassroomView.tsx` plus `ClassroomHeader.tsx` and optional roster/settings/history presentation extraction. A second owns `Plan.tsx`, `PlanWorkspace.tsx` and `Library.tsx`; a third owns `Wall.tsx`, `Activities.tsx`, `Progress.tsx`. Use disjoint scoped stylesheets for these groups. Coordinator alone owns the stylesheet aggregator/import entries (`ClassroomsApp.tsx`, `apps/web/pages/_app.tsx`), shared root-marker wiring in `Classrooms.tsx`, roadmap and Git. Test runner owns tests/fixtures, reviewer reads only. Each owns its separate work record and must preserve others' edits. No parallel edit of one CSS/controller file.

Prefer a classroom-only root marker such as `.entry-classroom-reference` on the authenticated classroom branch, with tab-specific classes/data attributes. All new rules must be scoped to it; Home, collection and Wizard are previous accepted slices. Preserve the real private sidebar selected by `/mis-aulas` navigation. Keep horizontal tab scrolling with active-tab reveal/ResizeObserver; at320px the selected tab must stay reachable.

Extract small stateless presentation leaves only where the new composition requires it. Keep business mutations, loading, AbortControllers, revision handling and deep-target state in their current owners. Existing long controllers are not a reason for unrelated broad refactoring. New authored leaf files should stay below200 lines; reviewable behavior/presentation commits at most400 authored changed lines, split by coherent section rather than file type.

## CONTRATOS_Y_PLAN_POR_SLICE

1. **Shell, members, history and settings:** preserve `ClassroomView({api,id,onExit,initialCode,wallTarget?,homeTarget?,onWallChanged?})` and `ClassroomHeader({room:Detail})`. Display existing name/subject/division/year/teacher/timezone/role/archive. Keep current code generation/copy, invitation delivery/status/actions, member summary/removal, historical summary, settings save and archive/reactivation confirmations. If leaves are extracted, they receive typed data and callbacks only; they must not create another API/controller. Settings body stays `{revision,name,subject,division,academicYear}`; cover is current-preview only because settings API has no cover edit contract. Student tab visibility stays Plan/Muro/Library/Activities/self-progress/Compañeros; History/Settings remain teacher-only, names-only roster for students.
2. **Plan and Library:** preserve Plan's `{api,room,reload,onOpenActivity?}` and workspace's current topic-state callback; no new wall callback. All units/topics remain selectable, NEXT default/fallback retained, manual state select writable only for active teacher. Resource cards use ready/nondeleted materials matching selected topic and true multi-topic activity links. Teacher plan-management controls, guarded deletion, version publication and download remain accessible even if the reference hides their detail. Library keeps current `{api,room,reload,targetMaterialId?,openUpload?}` props and publish/edit/delete lifecycle. Add controlled local search textbox with accessible name `Buscar materiales por título`; filter only `material.title` after trimming query, case-insensitive, with no client/API/schema change. Empty query restores API order/all records; search must not mutate source array, upload/edit state or invoke network requests. Zero matching records must say no search results, distinct from a truly empty library. Clear action restores records. Existing target/upload props retain their behavior; the initial query is empty so deep-link focus is not hidden.
3. **Wall, Activities and Progress:** preserve their exported props and API calls. Recompose the wall into main feed/composer plus static participation guidance; keep newest-first publications, grouped oldest-first replies, plain text, author initials, moderation and tombstones. Activities retain create type/manual/AI, private drafts, actual PUBLISHED/WITHDRAWN state, preview/edit, participation lock, authorization, attempt history and explicit publish/withdraw confirmation. Progress keeps current reads, refresh/abort/error handling and scope-specific visibility; represent completion/performance/teaching-plan data separately and truthfully using accessible labels/native progress where useful. If decorative charts are added, their labels/data must agree with existing values and null states.

### Truthful adaptation to the supplied screenshots

| Reference surface | Available contract | Adaptation |
| --- | --- | --- |
| Plan narrative, wall question, updated time | Topic name/status; real materials/activities; retained file versions | Keep names/states/resources; omit invented descriptions/questions/timestamps. No third-step wall navigation added. |
| Library author/date/favorites/audio/video/link types | Material title/file/extension/bytes/unit/topic/readiness/deletion/linking | File cards and exact metadata only; title search. No fake author/date, favorites, unsupported format controls or latest sorting. |
| Members pending badges, copy invite link | Current members with enrollment periods; actual invitation status; current transient code | Members are enrolled; show true period/status separately from invitations. Keep supported code copy, not an invented persistent share URL. |
| History invitation/code events | `Member.periods` history only | Style departure/removal records from their actual ended periods. No fabricated event log or filters with nonexistent event kinds. |
| Settings cover-upload picker | Four editable fields; immutable timezone; cover chosen at creation | Display current cover; omit unsupported upload/change action. Preserve archive/reactivation. |
| Progress histogram, latest activity, suggestion | Exact completion, average, current students, topic totals/states | Three metric cards and actual students; no histogram/last-updated/activity/AI inference invented. Null average/percentage stays no-data, not0. |
| Wall pinned notices/reactions/attachments/polls | Text NOTICE/QUERY and replies, permissions/tombstones | Styled notices and text composer; no pinned/likes/attachment/poll affordances. Functional spec explicitly excludes them. |
| Scheduled activity badge/instructions snippet | DRAFT/PUBLISHED/WITHDRAWN, deadline, curriculum; list has no instructions | Preserve real statuses and metadata; a future deadline alone is not a scheduled-publication state. |

## Six-dimension audit

- **Data/idempotence:** title search is read-only presentation state; no new write envelope. Duplicate names keep IDs/keys. Null metrics and missing metadata remain explicit.
- **States:** archived classrooms retain consultation and disable mutations. Unsafe/pending/deleted files remain gated. No unsupported status inferred from screenshot labels.
- **Failures/atomicity:** existing `run/action`, server confirmation, alerts/retries and modal state remain; no success before server response. Search result-empty does not replace loading/error.
- **Concurrency:** preserve room/wall revisions and API conflicts. No new caching/store or optimistic persistence. Existing cancellation guards remain.
- **Permissions:** teacher/student/current/historical distinctions remain; no extra student progress, email exposure, controls or author capabilities introduced.
- **GRASP:** presentation consumes existing slice's public types; no new domain/backend interfaces required. Shared contracts in `src/core/domain/` remain unchanged.

## CRITERIOS_DE_TEST_DOT

Test runner first writes meaningful failing Library component tests: accessible title search, trim/case-insensitive matching, zero-result versus empty-library copy, clear restores all original records/order, and no additional API calls caused by search. Use a typed in-memory port and real component with the existing hook harness. Do not add implementation-mirroring CSS/source regex tests for cosmetic changes. Existing source-assertion tests may need structural updates only when equivalent behavior is independently exercised.

Safe regression candidates after full entrypoint/dependency inspection: `foxmind-3d-flows-plan.test.mjs` (NEXT default, safe materials, true multi-topic activities, error/no writes), `foxmind-3d-flows-targets.test.mjs` (Home deep destinations/no automatic mutation), `p8-progress-client.test.mjs` (injected client/no writes plus existing source assertions), and `p6-library-client.test.mjs` (injected file/client safety). `p6-wall-client.test.mjs` additionally starts local in-memory HTTP servers and requires built API output; do not treat it as a pure no-prerequisite test. Do not run broad P5/P6/P8 integration suites or retained runtime/data.

Browser DoT in one dedicated ego(lite) Space, synthetic real-component fixture: all eight teacher tabs desktop1672×941 matched to reference order; student tabs and teacher-only absence; archive read-only; desktop plus390/320 widths, active tab reachable, keyboard focus/dialog return; long names and dense lists; Library search/clear, no-results and pending/deleted safety; Plan topic/resource/activity links; code/invitation/removal/archive confirms; wall query/reply/edit/moderation/tombstones; activity preview/editor/AI entry without provider call; progress classroom/self/historical null/zero/mixed values and retry. Use in-memory mutation receipts for actions, never real provider/publishing/data. Compare final screenshot/reference at matching state, fix P0/P1/P2, preserve earlier failures. Build/types and staged secret scan close DoD; reviewer audits actual final candidate.

## Commits and outcomes

No product/source edits, tests/build/browser runs, memory operation or commit by architect. Only this own design record was written. This is a ready design contract, not completed product acceptance.

## Handoff

Coordinator may dispatch isolated surface owners after Library RED. First implementation work is scoped shell/tab styling and section composition, with title search as the sole new behavior. Test runner received the closed search contract. Coordinator alone reconciles final acceptance/roadmap/local commits; current task does not authorize remote publication/deployment or backend expansion.
