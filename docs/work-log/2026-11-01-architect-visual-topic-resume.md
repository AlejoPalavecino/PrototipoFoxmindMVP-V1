# Visual publication destination — unit/topic selection

- Agent / role: /root/architect_resume / architect.
- Session or task ID: runtime unavailable; task /root/architect_resume.
- Date: 2026-11-01.
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai.
- Starting commit: 48caebf.
- Phase/spec: Foxy visual publication V-P1; [raster contract](2026-11-01-architect-raster-publication-contract.md), [proposal](../../odd/tasks/foxy-ai-proposal.md).
- Status: completed (design only).

## Request and evidence

Define the smallest safe addition allowing a teacher to publish a visual as additional classroom material, a unit material, or a topic material. Only this record was written. Applied sdd-ambiguity-gate, clean-architecture and team-docs-strategy. No runtime identity was registered, so no attributed Engram writes were attempted.

The existing domain PrepareFoxyVisualPublication and parser already accept nullable unitId/topicId, require a unit for a topic, and reject malformed IDs. visual-publication-repository.ts hashes both fields and checks actual unit/classroom and topic/unit/classroom membership before INSERT. No database migration, API or shared domain change is required. The missing behavior is the frontend controller's hardcoded null fields and missing destination-detail selection in its panel. loadClassroom already exists as an injected controller port. The text preparation controller has the required unique-ID selection behavior and the text confirmation controller rechecks current hierarchy.

## ESTADO_DISENO

LISTO_PARA_TDD_RED. No critical business ambiguity remains. Material adicional and Sin tema remain the default choices, matching text publication. The selected destination is independent of the visual's source classroom.

## ESTRATEGIA_EQUIPO_Y_SUPUESTOS

One frontend worker owns the visual publication controller and panel; test_runner owns their tests. Coordinator serializes any workspace runtime fixture changes. Existing source authorization, raster custody, library confirmation, request hashing and publication state machine remain authoritative. No provider/network/configuration changes belong to this slice. Keep files below 200 lines; expected complete change plus focused tests fits one review unit of 400 lines.

## CONTRATOS_Y_PLAN_POR_SLICE

Edit apps/web/src/lib/foxy-visual-publication-controller.ts:

- Extend FoxyVisualPublicationState with destination: Detail|null, unitId:string|null, topicId:string|null. Initial values are null; existing classroomId/title remain for compatibility.
- Keep the existing name setClassroomId(id:string), returning Promise<void>|void. Clear destination, both selections, publication/inspection/receipt/consent and prior command scope immediately. For a valid nonempty UUID, use existing loadClassroom(id,signal), require matching ID, teacher role and nonarchived classroom before allowing prepare. Mark busy while loading so changes/prepare/review cannot race the fetch. syncAsset/dispose explicitly cancel it through the current epoch/signal and release busy on the new scope; a stale response must never install a destination.
- Add selectUnit(id:string|null):void and selectTopic(id:string|null):void. Use the same unique valid UUID membership rule as text preparation. Changing unit always clears topic. Invalid/duplicate/foreign IDs resolve to null and never reach a request. Changing either selection invalidates preparation, inspection, receipt and consent and advances the epoch, as setTitle already does. Commands remain locked during busy or uncertain pending; retry uses the frozen original input.
- prepare requires a loaded matching teacher/nonarchived destination, canonical selected membership and valid existing title/asset revision. Send selected unitId/topicId in PrepareFoxyVisualPublication instead of hardcoded null. Validate returned summary identity, title AND unit/topic against that frozen request before accepting it.
- Rehydration from listVisualPublications restores classroomId/title/unitId/topicId from the accepted summary and loads the destination detail. If membership is missing or archived, do not silently drop the binding and confirm as additional material; leave confirmation unavailable and show the existing safe error.
- review reloads the current destination detail and inspection and requires: existing revision/role/archive guards; summary title/unit/topic equal current selected metadata; selected unit exists uniquely in destination and topic exists uniquely in that unit; null topic allowed. Install the freshly reviewed Detail for display. Missing/deleted/reparented hierarchy or mismatched metadata denies review and clears consent. confirm retains explicit checkbox plus snapshot revisions.

Edit apps/web/src/components/foxy-visual-publication-panel.tsx:

- Add labeled Unidad select from state.destination.units, with Material adicional as null; add Tema select from the selected unit, with Sin tema as null. Disable while busy/pending, without a loaded destination, or without a selected unit for topic. Filter unusable IDs; actions still validate membership.
- Show the reviewed destination path alongside title before confirmation, derived from the accepted publication plus freshly reviewed Detail: classroom / unit / topic. Do not display a different editable path while confirming an old preparation.

No changes to WebFoxyClient, API parser, domain or backend are necessary unless a focused integration test exposes a genuine contract defect. Do not couple the visual controller to the text resource/editor controller merely to reuse a small selection function.

## CRITERIOS_DE_TEST_DOT

RED unit/controller tests:

1. Load destination with two units and topics, select unit/topic and prepare; captured input contains exact selected IDs. Null defaults still send null/null. Topic cannot exist without its unit.
2. Switching unit clears topic; switching classroom clears both, preparation and consent. Invalid, foreign, duplicate or missing UUID options never reach the payload. Empty/failed/archived/wrong-ID/student destination cannot prepare.
3. Metadata change after READY invalidates preview and consent; an old inspect/review response cannot restore them. Uncertain retry preserves requestId AND original selected unit/topic exactly and does not allow editing until resolved.
4. Pending destination load followed by syncAsset/dispose/new scope cannot install old room/selection. Recover a prior bound publication from list and require loaded hierarchy before review.
5. Review rejects deleted/reparented topic, archived destination, or summary binding mismatch; no confirm call. Successful review uses latest names and existing revision guards and requires explicit checkbox.

Component tests: options and accessible labels; topic disabled without unit; selection callbacks; pending disabled; reviewed classroom/unit/topic path is visible and matches the prepared summary.

Backend integration: extend the existing synthetic PG raster publication journey with one valid unit/topic binding and verify resulting material preserves both. An unrelated topic/unit or removal between preparation/review/confirmation must fail without a material. Existing endpoint already supports this; only add production change if observed failure requires it.

UI ego(lite): in an isolated synthetic fixture choose classroom, unit and topic, prepare, review visible path, check consent and confirm. Confirm resulting library item belongs to selected hierarchy. Record actual screenshot/interactions; minimized-window or unavailable-provider limitations must remain explicit.

## Verification and handoff

Read-only source inspection confirmed parser and repository membership checks. No functional tests were run because this is a design-only record. An initial rg wildcard on Windows used a non-expanded path and failed; exact paths resolved it. Parent may dispatch RED now. No commit or roadmap change by this agent.