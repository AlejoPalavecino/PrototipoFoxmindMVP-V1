# Crear aula reference contract — design completed

- Agent / role: /root/wizard_architect, delegated architecture inspection; ASTRA session.
- Session or task ID: /root/wizard_architect; memory host registration unavailable.
- Date: 2026-10-28.
- Branch / worktree: codex/inicio-reference-astra; foxmind-inicio-astra/ProtipoFoxMind.
- Starting commit: 7a742de70c766bea3e5557566dc341b9c2ff9742.
- Phase and detailed task/spec: existing P5 creation UI, [P5](../../odd/tasks/p5-classrooms.md), [functional spec §5](../foxmind-v1-functional-spec.md), [extraction contract](../../odd/tasks/classroom-ai-extraction.md), [coordinator](2026-10-28-root-wizard-reference.md).
- Status: completed (design assignment only; implementation/verification outstanding).

## Request and scope

Produce a bounded presentation and local-interaction contract matching four selected screenshots. No backend/domain schema, secret/runtime configuration, retained-data, provider, publication or roadmap changes. Author only this record. Applied sdd-ambiguity-gate, clean-architecture and team-docs-strategy. Existing approved worktree and frontend scope satisfy routine design authorization; no new business decision is needed.

## ESTADO_DISENO

LISTO_PARA_TDD_RED. Existing contracts resolve the screenshot ambiguities. Preserve the established TypeScript/React architecture; no new shared domain contract is necessary because no API changes are proposed.

## CONTRATO

1. Keep four sequential steps and existing draft payload: name, subject, division, academicYear, timezone, coverKey, planFileId, units. Preserve required fields, lengths, year range, free-text subject/division, world timezone catalog and inherited covers. The selected cover remains a native labeled radio option; reuse current responsive WebP assets. Stepper is status, not an unrestricted skip navigation.
2. Match the cream background, white rounded content panel, orange active step/buttons, green completed steps, compact truthful save badge, two-column fields and seven-cover grid. At small widths wrap the stepper and stack fields, upload/sidebar and review groups without document overflow. Keep visible keyboard focus and sufficient touch targets; decorative icons are aria-hidden.
3. Step 2 uses a large file drop/select area, current file card, replacement action and an explanatory sidebar. PDF/DOCX and 20,000,000-byte cap remain authoritative. The screenshot's pasted-text alternative is omitted: neither Payload nor spec supports text-only plans. Copy must say upload, not paste. No fictitious file size, relative upload time or successful scan: FileState exposes name and upload/validation/scan/ready/rejectionCode, but no size or timestamp.
4. Drop is an alternative to the same upload operation, not a new transport. Extract the chosen-File handler minimally and call it from both input and drop. Prevent default browser navigation. Reject multiple-file drops with a clear message; ignore non-file drags. Explicitly guard the handler when uploading, publishing or extraction.busy: disabled fieldset alone does not disable drop events. Keep input reset after completion. The approved-file gate remains; a pending or rejected replacement cannot appear approved or start extraction. Retain existing status refresh and approved-file download.
5. Step 3 preserves add/remove/edit units and topics; these already exist. Add accessible per-unit collapse with aria-expanded/aria-controls and names identifying the unit. Collapse is transient view state and must not alter payload, autosave or topic contents. Reopen invalid collapsed units before validation/focus so a hidden required field never strands the user. Removing a unit must not transfer its collapsed state to an unrelated unit; a simple reset of disclosure state on unit-array structural changes is acceptable. Do not show drag handles unless actual accessible reordering is implemented; reordering is outside this bounded contract.
6. Keep PlanExtraction, usePlanExtraction and extraction-client semantics: approved-file save precedes automatic start; QUEUED/RUNNING/FAILED/STALE/APPLIED and disabled-provider fallback remain truthful; manual editing remains available while analysis waits. A READY proposal count may only derive from view.proposal.units. If a compact review-proposal disclosure is added, its button only reveals the existing ExtractionEditor. Use a label such as Revisar sugerencias, because application replaces units with explicit replacement confirmation; it does not append them. Keep editable proposal, warnings, explicit apply and manual continuation. No synthetic suggestions or automatic apply/publish.
7. Step 4 has separate general-data, plan, units/topics and selected-cover review blocks. Add Editar datos -> step 0 and Editar unidades -> step 2; existing Editar plan -> step 1 may read Cambiar archivo. These type=button controls preserve all state and do not publish or upload. Derive counts from current payload; retain access to topic names (compact lists or disclosure) for actual review. Resolve timezone label through existing choices and keep actual value as needed. Explain that invitations happen after creation and timezone stays fixed; avoid screenshot copy implying every field can later change.
8. Preserve controller behavior and queue ownership: latest/revision/saved/failed refs, 650 ms autosave, serialization of extraction apply, beforeunload, save-before-next/exit/publish, conflict latch, publish payload/revision and callbacks. Do not reformat/rewrite this controller wholesale. Save badge is green only for confirmed Borrador guardado; pending/error states stay distinct. All new mutation/navigation controls obey uploading/publishing/extraction.busy guards. Guard exit during these operations as well. No success callback before actual mocked/real API response.

## DoT

Behavioral RED cases for new interactions, using real components and an in-memory ClassroomClient only:

- File drop invokes the same upload once with the selected File; multiple files produce no upload; busy drops produce none; pending/rejected results do not install a planFileId. Native picker still works and replacement clears the input for reselecting the same file.
- Collapse and reopen preserves typed unit/topic values and emits no payload mutation. Removing a prior unit does not collapse the wrong survivor. A collapsed incomplete unit cannot advance and can be expanded/focused for correction.
- Review edit buttons select the proper step, retain all payload fields and invoke no publish; busy controls do nothing. Final publish remains explicit and waits for acknowledged save; save failure does not publish or exit.
- If READY suggestion disclosure is introduced: count is from proposal, open alone never applies, and existing units still demand replacement confirmation. FAILED/STALE/disabled states do not show READY claims.

Existing suitable focused tests inspected: tests/classroom-ai-ui.test.mjs exercises extraction-client using in-memory API including save/revision sequencing, stale/cancel and replacement consent; tests/classroom-zones.test.mjs uses the local TypeScript loader and Intl only. tests/helpers/load-ts-module.mjs transpiles local modules in memory. These are candidates after the test owner confirms full import graphs; no suites ran in this assignment. Do not run broad classroom/database suites. Existing tests/classrooms-reference-controls.test.mjs illustrates component hook testing, but its helper has React-internal coupling; use the narrow existing harness carefully rather than treating mocked rendering as browser evidence.

Synthetic browser acceptance must exercise all four steps at desktop and narrow mobile, keyboard focus, empty/approved/pending/rejected upload, save pending/failure, collapse/edit/review and long labels. Preview must be clearly synthetic and use no live provider or retained backend. Screenshot fidelity is visual evidence, not authenticated E2E or real publication proof.

## Ownership / path map

- Architect: this record only; complete.
- UI worker: Wizard.tsx minimal composition/controller wiring; new WizardGeneral.tsx, WizardPlan.tsx, WizardUnits.tsx and WizardReview.tsx (or equivalent cohesive components); dedicated wizard CSS. PlanExtraction.tsx presentation only if necessary; preserve hook/client.
- Test runner: isolated new wizard behavior tests/helpers and synthetic fixture; no source edits. Coordinate exact component prop names before RED if extracting presentational components.
- Coordinator: stylesheet import integration, shared roadmap update only after proof, reconciliation, local commit. Reviewer: read-only independent candidate audit and returned record fields.
- Preserve components.tsx/API/shared covers, other screens and other work records. Any central import edits have one owner. Component boundaries consume current Payload/FileState and callbacks; no generic wizard framework.

## Verification and observed state

Read roadmap, work-log protocol, coordinator record, applicable apps/web/AGENTS.md, P5/spec/extraction feature, Wizard, PlanExtraction/use-plan-extraction/extraction-client/ExtractionEditor, relevant components/API definitions and test helper entrypoints. Viewed all four supplied PNG references. git rev-parse HEAD returned the SHA above; git branch --show-current returned codex/inicio-reference-astra; initial git status --short showed only the coordinator's untracked wizard record. Read commands completed with exit 0. No tests, builds, browsers, databases, providers, memory writes or product edits were executed.

## Risks and handoff

Main regression risks are drop bypassing disabled fieldsets, collapsing required inputs out of focus, index-based disclosure drift, suggestion labels disguising replacement, and lost queue/revision behavior during component extraction. Resolve these within the local controller/presentation boundary and test them, rather than expanding backend scope.

First unfinished task: test runner records new behavioral RED against the approved local interactions, then UI worker implements the four-step composition. Preserve no-text-only-plan decision and truthful file/AI/save states. Functional and visual acceptance remain pending. No commit was created by this design agent.
