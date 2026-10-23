# Carpetas — Presentational architecture ready

- Agent / role: architect, delegated by the active coordinator.
- Session or task ID: `/root/folder_architecture`.
- Date: 2026-10-22.
- Branch / worktree: `codex/folder-style-platform`, `C:/Users/alejo/.codex/worktrees/foxmind-folders-implementation/ProtipoFoxMind`.
- Starting commit: `0bcb7d48dac76d49aa8e89b3ac76b32b03515425`.
- Phase and detailed task/spec links: [24 selected mockups](../design/foxmind-platform-mockups/README.md), [existing transversal coverage](../design/foxmind-folder-platform/COVERAGE-MATRIX.md), [V1 rules](../foxmind-v1-functional-spec.md).
- Status: completed (design handoff only; no implementation or runtime acceptance).

## Request and scope

Design the complete presentational cut for the selected 24 Carpetas references while preserving the complete implemented V1. The coordinator reports current user authorization to implement the selected style and generate Foxy. This record neither expands that scope nor grants publication authority. No source, backend, database, retained data or secret was changed/read by this agent. Historical proposal requirements for a new Home summary, route/deep-link adapter and account destination behavior are outside this presentational cut.

## Work performed

Read the worktree AGENTS, roadmap, work-record protocol, relevant V1 account/classroom permissions, the mockup README/QA/spec inventory, and the prior folder plan/coverage/verification guidance. Read `sdd-ambiguity-gate`, `clean-architecture`, `team-docs-strategy` and Engram memory protocol. Inspected shared tokens/navbar/glass cascade, both CSS entrypoints, account shell/navbar, workspace/Home/Wizard/ClassroomView, the existing component API and representative Plan/Library/Activities/Wall/Progress/editing surfaces. Directly viewed reference PNGs 01, 04, 10, 13 and 24; all 24 IDs/titles were inventoried from specs. Other generated PNGs were not individually re-audited by this agent.

`ESTADO_DISENO: LISTO_PARA_TDD_RED`

### DoR and unchanged contracts

- Data/idempotency: keep existing clients, request paths/payloads, revisions and mutation callbacks. No request on decoration/render, no metrics or mockup names copied into runtime data.
- States: keep loading, error/retry, pending/ready upload, saved/unsaved, private/published, archived/read-only and empty states visible. A PNG success is never inferred from a selected file or sent request.
- Failures: preserve server-confirmed outcomes and messages; an error must not disappear behind collapsed visual chrome. Style does not turn an unavailable state into an empty state.
- Concurrency: preserve save queues, abort cleanup, server editor ownership/transfer, submission and grading flows. Do not add keys/remounts around live forms or editors.
- Permissions: retain classroom-scoped teacher/student branches and current server enforcement; teacher has eight sections, student six; no global role switch, emails/academic actions in Compañeros or hidden-state private data.
- GRASP: reuse existing state owners and add pure reusable presentation only. No new domain schema, ports, API, package or stack. `apps/classrooms-ui/api.ts`, web clients/proxies and `src/core/domain/` stay unchanged.

### Shared presentational contract

One small optional shared component can prevent repeated folder markup:

```ts
export type FolderTone = 'mint' | 'coral' | 'yellow';
export interface FolderSectionProps {
  title: string;
  tone?: FolderTone;
  children: React.ReactNode;
  className?: string;
  headingLevel?: 2 | 3;
}
export function FolderSection(props: FolderSectionProps): React.JSX.Element;
```

Implement as a real `section` and heading with unique heading ID (`useId`) and `aria-labelledby`; the heading forms the visual folder tab. Reuse/move existing headings rather than duplicating them. No decorative button and no component-owned business state. Existing AppNavbar props, Dialog/Notice/Cover props and all workspace/editor props remain compatible. AppNavbar keeps real links and `aria-current`; ClassroomView keeps navigation buttons and its active-state indicator. Do not add incomplete `role=tab` semantics just for the folder shape.

### Disjoint ownership and execution order

1. **Shared visual owner:** `apps/shared-ui/design-tokens.css`, new `FolderSection.tsx` and `folder-platform.css` (split cohesive style modules if needed), `AppNavbar.tsx`, and only CSS import edits in `apps/web/pages/_app.tsx` / `apps/classrooms-ui/ClassroomsApp.tsx`. Own any edits to existing shared/global CSS. Replace the glass imports in both hosts consistently; avoid two competing themes or accumulated `!important`. Establish the component/class contract before other writers use it.
2. **Account/workspace owner:** `apps/web/src/components/account-screen.tsx`, presentation of `account-navbar.tsx`, `apps/classrooms-ui/Home.tsx`, `Classrooms.tsx`. Add auth folder/Foxy, split profile data/security visually, show real Estudio/Enseño groups with a yellow Pendientes grouping. Preserve callbacks and routing/session code. Do not adopt a new Home-summary or route proposal.
3. **Classroom/create owner:** `apps/classrooms-ui/Wizard.tsx`, `ClassroomView.tsx`, `components.tsx`, and presentation-only edits in `Plan.tsx`, `Library.tsx`, `Wall.tsx`, `Activities.tsx`, `Progress.tsx`. Keep compact classroom header, role-local badge, eight/six folder navigation items and one major section folder; use calm rows inside it. Keep all current authoring, attempts, grades and private controls. Existing long state-owner files are not an invitation to rewrite their machines; new presentation helpers stay cohesive (<200 lines) and review units <=400 changed lines.
4. **Assets owner:** only `apps/web/public/folders/` (or one agreed equivalent); package generated Foxy and supplied original brand as local raster derivatives, preserve provenance/dimensions. Do not alter `coverKey` catalog values to add a photography decoration. Foxy is prominent in access/welcome, restrained in success/empty states and absent from answer/grade work.
5. **test_runner:** owns all test edits and its separate record; starts meaningful structural/semantic RED cases before relevant markup change and migrates glass-specific expectations. Workers must not edit tests or another owner's CSS/files. Coordinator alone reconciles shared roadmap/status and imports; each agent owns a separate work record.

All writers share the isolated worktree, preserve concurrent edits and coordinate overlapping requests instead of reverting another writer. Schedule waves if slot count cannot accommodate all roles; no separate runtime or database is needed per presentation writer.

Coordinator's actual allocation received before handoff: root owns shared CSS/navbar/assets; auth writer is isolated; one workspace writer owns Home/Classrooms/Wizard/ClassroomView/components. For a further academic writer reserve **only `Plan.tsx`, `Library.tsx`, `Activities.tsx`**, without CSS/tests/API. Plan's currently always-open per-topic rename/reorder/delete forms need native disclosure for target density; Library's upload and Activities' secondary creation/management controls may be compacted similarly. Keep active upload/ready/error status visible and fields mounted. Wall/Progress/Notifications and authoring/attempt/questionnaire/practical/grading/published-result modules can retain their TSX and receive the root's transversal CSS; their existing regions/lists/dialog semantics are suitable. Do not add inert mockup filters or invented row data.

### Visual acceptance and reversible assumptions

- White/opaque paper, charcoal outline, short solid cream offset shadow; orange #FF782D action with dark text; mint Estudio, coral Enseño, yellow Pendientes. Retain local font stack initially and normalize generated variations through tokens.
- At desktop the navbar and classroom tabs resemble folder navigation; the folder label is distinct from the white content body. No giant mascot, glass background, pervasive nested cards or sidebar.
- Mis Aulas: Estudio and Enseño side by side where space permits, stacked on mobile; actual lists, drafts, invitations, empty/search results and archive labels remain reachable. A code invitation remains explicit preview/confirmation.
- Wizard: four real sequential steps, future numerals, checkmarks only for passed steps, actual saved/file-ready states. Its success visual must be driven by confirmed publish callback; preserve code/invitation/enter pathways.
- Plan management, activity creation and student rows may use native disclosure to reduce density only if the controls remain named, keyboard reachable and compatible with active operations. Do not conditionally unmount dirty forms/editors merely to compact the layout.
- At 1487x1058 compare the 24 named reference states. At 320/390/768/1024/1440 verify no page overflow, hidden primary controls or overlap; tabs may scroll within a labeled navigation region and must reveal the active item. Long names, many rows and 200% text still work.
- Focus-visible, disabled contrast, control target 44px, opaque input surface, dialog scroll/centering/focus return, reduced motion and forced colors remain acceptance requirements. Decorative art has empty alt; brand has accessible FoxMind name.

### DoT for test_runner

- **RED/units:** observable semantic contracts, not a copy of every CSS declaration: folder label is heading/region, navigation links keep destinations/current state, account and workspace content remains escaped, roles expose the existing eight/six sections and correct actions, native controls retain labels/disabled/read-only state. Test any new grouping/disclosure/success branch and callback reachability before its implementation. No new domain tests needed for pure color/spacing changes.
- **Migrate existing style tests:** `tests/platform-glass.test.mjs` fixes old hex values and CSS import order; entry-glass tests also fix old theme behavior. Update obsolete palette/import assertions while preserving contrast pairs, no full-width checkboxes/radios, native dialog focus/scrolling, long-content/reflow and notification/nav guarantees. Do not simply delete the suite.
- **Focused existing checks:** account/client/proxy, p5 classroom client/proxy, p9 Home client, p6 Library/Wall client, p7 participation/questionnaire client/autosave and p8 progress client according to changed markup; strict web and classrooms TypeScript plus production Next build. Inspect runner resources/ceilings before actual integrations; do not run the protected retained P4 local project.
- **Actual integration (`*_test`, owned synthetic fixtures):** one teacher/student journey verifies creation and explicit admission, read-only archive and role differences, Plan/material/Muro access, published activity -> answer/autosave/editor state -> explicit submission -> private correction -> publication -> student result/progress. Reuse approved helpers/limits and cleanup only owned resources. Unchanged backend contracts need no new migrations or artificial backend test suite.
- **ego(lite) evidence:** dedicated task Space, real settled state before capture. Capture all 24 desktop states with synthetic data and representative mobile counterparts; additionally exercise recovery, notifications, authoring/TP/questionnaire/evaluation/grading/result dialogs because shared CSS affects them even though absent from selected screenshots. Compare composition/density, keyboard menu/Escape/focus return, touch-sized controls, no horizontal page scroll and visible errors/retry. Screenshot count alone is not a functional proof.

## Verification

- `git status --short`, `git branch --show-current`, `git rev-parse HEAD`: starting tree clean, branch/commit above. Later concurrent status showed coordinator's copied design packages, RED test/record and root record; left untouched.
- `rg --files` and targeted `Get-Content`: inspected the paths reported above. One exploratory search named nonexistent `tests/platform-glass-client.test.mjs`; corrected inventory found the actual `tests/platform-glass.test.mjs`. No test was run under the incorrect name.
- Parsed mockup `specs.json`: 24 distinct expected IDs spanning access, Mis Aulas, wizard/success, teacher/student sections and profile.
- Direct `view_image` inspections: 01-login, 04-mis-aulas, 10-docente-actividades, 13-docente-plan, 24-mi-perfil.
- No product tests, build, Docker runtime or browser journey were executed: this is a design/record-only assignment. Runtime results above are prescribed acceptance, never claimed PASS.
- Own record structural check: all three relative Markdown targets exist; `git diff --check -- docs/work-log/2026-10-22-folder-architecture.md` exited 0 (the new record remains untracked until coordinator commit).
- Engram read-only current-project/context/search succeeded. The required design `mem_save` and final `mem_session_summary` were rejected by the runtime PreToolUse hook: `Codex host session is not registered; start a new Codex session to register it.` No memory write or recovered identity is claimed; essential findings remain in this record and the coordinator handoff.

## Commits and outcomes

No commit, source change, merge, push or deployment performed. Only this attributed record was written. Essential design is available in this record; Engram is a recovery aid and historical memory is not current candidate acceptance.

## Handoff

Coordinator: confirm single shared CSS owner, land the pure shared visual contract, then dispatch structural writers with the file ownership above while test_runner owns tests. First unfinished implementation is the shared folder theme/navbar and import switch. Preserve all V1 handlers and omitted screens, verify actual rendered states, and report functional acceptance separately from human visual approval.
