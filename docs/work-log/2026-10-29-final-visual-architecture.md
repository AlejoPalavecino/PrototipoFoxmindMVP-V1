# Classroom interior — one visual-only pass

- Agent / role: `/root/final_visual_arch`, architect.
- Session / task ID: `/root/final_visual_arch`; authoritative memory registration unavailable.
- Date: 2026-10-29.
- Branch / worktree: `codex/inicio-reference-astra`, isolated `foxmind-inicio-astra/ProtipoFoxMind`.
- Starting commit observed: `dd622f9`; existing dirty product, tests, fixture, imagery and records preserved.
- Phase / task: visual refinement of eight classroom tabs after the user's scope clarification.
- Status: completed — scope/design audit only; implementation and visual acceptance belong to coordinator/QA.

## Request and decision

The user explicitly declined missing functionality and requested one more visual pass to increase resemblance. This resolves the previous ambiguity: improve composition using actual current data and actions. It does not authorize adding favorites, reactions, media support, new history event sources, cover upload, mock metrics or new controls solely to fill screenshot space.

`ESTADO_DISENO: LISTO_PARA_TDD_RED` — no critical business ambiguity, stack choice, backend contract or user decision blocks this pass. For purely presentational edits, new RED tests that mirror CSS/markup are unnecessary; retain existing meaningful behavior checks and perform the visual DoT below. A worker proposing new behavior must stop that proposal rather than expand this scope.

Applied the local `sdd-ambiguity-gate`, `clean-architecture` and `team-docs-strategy` guidance. The earlier [reconstruction contract](2026-10-29-interior-redesign-architect.md) remains the data/permission boundary; [coordinator record](2026-10-29-root-interior-fidelity.md) preserves failed fidelity attempts. The previous exact-match gate is historical. Current acceptance is the requested single visual pass with demonstrated improvement and disclosed remaining presentation differences; unsupported mock functionality is excluded by the user and is not an unresolved product decision.

## ESTRATEGIA_EQUIPO_Y_SUPUESTOS

- `/root/final_plan_social` owns `interior-plan-reference.css`, `interior-library-fidelity.css`, `interior-activity-reference.css` and narrowly necessary presentation classes in PlanWorkspace/Library/Wall/Activities.
- `/root/final_shell_progress` owns `interior-shell-reference.css`, `interior-progress-reference.css` and narrowly necessary presentation classes in ClassroomView/ClassroomHeader/Progress.
- `/root/final_visual_qa` owns no product edits; compare the same populated Literatura fixture and source state, then report observed measurements and usability. Coordinator persists non-test evidence when the tester's role restricts writes.
- Root alone owns stylesheet entrypoints, worktree/commit actions and shared acceptance summaries. Each worker maintains a separate record. Do not revert or overwrite another agent's uncommitted work. The architecture agent writes only this file.

Assume one consistent desktop shell across references even where individual supplied screenshots differ by about20px. Preserve data-driven room cover, role and content length. At1672×941 use the original anchors as guidance: content left about228px, hero y52–199, tabs y215–265 and section content near y286. Do not hide actual records or essential actions to force the exact mock height.

## CONTRATOS_Y_PLAN_POR_SLICE

No API/domain/port changes, dependencies, routes, persistence, data loading or network orchestration are needed. Existing typed props, callbacks, revision/abort/busy guards, deep-link targets, role/archived checks and form validation remain authoritative. Scope visual selectors to `.classroom-interior-reference` so account, home, collection and wizard screens remain unaffected. Keep review units within400 authored changed lines without minifying code or documentation to fit.

| Surface | Permitted visual work | Preserve |
| --- | --- | --- |
| Shared shell | Neutral readable body type, heading weight/color, hero crop, standard icon choice, tab spacing, warm surfaces | Contextual room metadata, real cover semantics, navigation order, selected-tab reveal and keyboard focus |
| Plan | Compact units, orange progress accents, numbered resource/practice hierarchy and existing standard icons | Selected unit/topic, actual materials/activities, real topic status, management actions and disclosures |
| Biblioteca | File-icon/type hierarchy, aligned toolbar, card density, outlined existing actions and readable metadata | Current search/origin filters, deep-link reset/focus, upload/edit/delete/preview/download states and permissions |
| Muro | Composer density, avatar/author/time hierarchy, post spacing and existing action alignment | All content, replies, author/permission labels, notices, edits and publish/reply/remove handlers |
| Actividades | Type/status imagery, typography, metadata spacing, card accents and CTA alignment | Actual states, dates/zones, authoring/generation/session/editor branches and all existing actions |
| Progreso | Three-card density, orange metric emphasis, real chart/legend hierarchy, table headings and guidance styling | Actual null/empty metrics and distinct completion/performance/plan definitions; no histogram or last-activity fabrication |
| Alumnos | Remove empty spacing, clarify roster/code/invitation card boundaries, modest avatar color variation and existing action styling | All current members, periods, invitations, code state, summary/removal/renewal/copy/revoke actions and guards |
| Historial | Readable dates, restrained timeline hierarchy, explanatory-art crop and text scale | Real ended periods only, all identities and summary actions; no synthetic join/code/invitation event types |
| Configuración | Heading/icon hierarchy, form and cover-preview density, archive-warning row | Four supported fields, fixed timezone, save/revision, current cover preview and archive/reactivate confirmation |

Do not use hidden overlays, transparent text, low-contrast text or pointer-event changes to imitate a screenshot at the cost of behavior. Standard icons must exist in the current icon mapping; a mismatched/fallback icon is a presentation defect to report rather than a reason to introduce a drawing implementation.

## DoR audit and risks

Data/idempotence: cosmetic changes must neither synthesize values nor issue additional requests. States: keep loading/error/empty/busy/archived and teacher/student views. Failure: preserve unsaved inputs and retry controls. Concurrency: retain original revision and abort ownership. Permissions: no CSS-only hiding as a substitute for permission checks and no action becoming enabled accidentally. GRASP: keep presentation edits local and leave orchestration in existing controllers.

Main visual risks are inherited CSS specificity, global rounded-font rules overriding scoped typography, avatar/icon sizing increasing row height, disclosure/menu overflow, fixed navigation hiding focused controls and desktop compaction making mobile targets too small. Reuse the shared shell's active controls without adding one stylesheet per tiny defect or broad global overrides.

## CRITERIOS_DE_TEST_DOT

1. Compare all eight existing source references with final populated Literatura renders at1672×941, same tab and role. Read the real screenshot rather than treating measured DOM bounds/build success as visual proof. Record typography, shell anchors, columns, card density, image crop, colors and existing-action placement per tab. Preserve durable final renders and a concise attributed comparison report.
2. Verify all tabs at320/390px for natural vertical scrolling, no horizontal document overflow,16px editable text, usable controls and visible keyboard focus. Target44px mobile controls; if an observed control is smaller, report its actual measurement rather than describing a>=40px check as44px acceptance.
3. Exercise only existing core interactions affected by appearance: topic selection/disclosures, library search/origin filters/clear/deep-link reveal, library menu open/close and upload disclosure, tab navigation, invitation dialog cancellation and visible archive confirmation entry. Use synthetic ports that reject mutations. No real classroom/data/provider operation.
4. Existing safe focused behavior tests remain sufficient for CSS/classes/semantic presentation changes; rerun targeted cases if the latest DOM changes alter wrappers or labels used by meaningful tests. Do not relax assertions to make presentation pass. Root's final candidate needs strict types/build and reviewer evidence according to the current workflow; this architect ran none.
5. Mark this scoped pass complete when the visual changes are observed, existing controls remain usable and no introduced P0/P1/P2 usability regression remains. Describe remaining appearance differences accurately. Do not claim pixel identity or block on the absent functionality that the user explicitly excluded. Do not start another open-ended polish cycle after the requested pass.

## Verification, outcomes and handoff

Own observed evidence: read the two requested architecture/coordinator records, the work-record protocol and relevant local skills; `git status --short` showed existing parallel changes, and `git log -1 --oneline` showed `dd622f9`. No source/test/browser/build action, external research, secret access, database call, Engram write, commit or publication by this agent. Memory writes remain unavailable until authoritative runtime registration.

The coordinator can proceed without another permission question. First remaining task is the one final integrated QA pass after both presentation workers freeze their changes, then reconcile the new scoped conclusion with earlier historical blocked reports. This design audit does not itself assert that the rendered screens passed.
