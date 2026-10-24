# Compact event form presentation — in progress

- Agent / role: event_form_ui_green / slice worker B
- Session or task ID: /root/event_form_ui_green
- Date: 2026-10-24
- Branch / worktree: codex/foxmind-agenda / foxmind-agenda
- Starting commit: 374ef3f
- Phase: F3 presentation and F4 composition in odd/tasks/agenda-compact-event-form.md
- Status: completed

## Request and scope
Implement compact event presentation and confirmed-result navigation. Exclusive TSX/CSS ownership assigned by coordinator; model/editor owned by worker A. Do not edit tests, backend, dependencies or shared roadmap.

## Work performed
Read contract, UX proposal, Folder theme, roadmap, work-record protocol, current form/calendar composition and RED view/result suites. Read clean-architecture, work-unit-commits and React best-practices skills. Consulted Context7 React controlled inputs and effect/ref documentation before implementation.

Implemented F3 three-group compact form, accessible category/repeat radio chips, separate date/time, duration shortcuts/manual end, secondary notes/multiday/human zones, domain-returned temporal choices, field errors/focus, guarded cancel/close/Escape and distinct creation/edit actions. Existing Dialog retains focus lifecycle. Stored conflict version uses human summary.

Implemented F4 confirmed outcomes: creation selects first day in view zone; edition preserves view; removed has no event navigation. Current reload reference is used for same-range refresh, while changed month lets useAgenda load its new range. Explicit show action focuses the matching card using a per-occurrence DOM ID and data-event-id lookup; repeated show requests refocus. Calendar timezone label is secondary with an explicit city selector.

Owned paths and line counts, relative to repository root:

| Path | Lines |
|---|---:|
| apps/agenda-ui/EventForm.tsx | 49 |
| apps/agenda-ui/EventFields.tsx | 30 |
| apps/agenda-ui/EventFieldIssue.tsx | 10 |
| apps/agenda-ui/EventWhenFields.tsx | 37 |
| apps/agenda-ui/EventRepeatFields.tsx | 18 |
| apps/agenda-ui/EventAdvancedFields.tsx | 21 |
| apps/agenda-ui/EventZoneFields.tsx | 17 |
| apps/agenda-ui/Agenda.tsx | 44 |
| apps/agenda-ui/AgendaDay.tsx | 33 |
| apps/agenda-ui/AgendaHeader.tsx | 17 |
| apps/agenda-ui/useAgendaResult.ts | 31 |
| apps/agenda-ui/agenda.css | 105 |

## Verification
- `node --test --test-reporter=dot --test-concurrency=1 tests/agenda-event-form-view.test.mjs tests/agenda-event-form-result.test.mjs tests/agenda-ui.test.mjs`: first run 11 PASS, exit 0. Repeated after adding explicit repeated-focus trigger: 11 PASS, exit 0.
- `npx tsc --noEmit -p apps/web/tsconfig.json`: exit 0, no compiler diagnostics. Coordinator authorized this sole compiler process.
- `git diff --check`: exit 0; line-ending warnings only.
- TypeScript AST structural check of the eleven owned TS/TSX files: each file below 200 lines and each function below 40 lines. No configured linter dependency/script exists in package.json; no lint PASS is claimed.
- Builds, independent review and browser/captures held for coordinator. No Engram writes: host has no registered ID. No test file edited; no circuit breaker triggered.

## Commits and outcomes
No commit by this child; coordinator owns reviewable units.

## Handoff
Production source frozen after observed GREEN/typecheck. Coordinator runs full runner/build, independent tests and live browser/captures, then assembles reviewable commits. No pixel acceptance or full phase completion is claimed by this child.

Source SHA256 at handoff: EventForm 636103F7CE4561431B8DF12F988AF58CB656BD82D56B5CDC9DB92462396B1ABB; EventFields E790BEC84200991C5FE5A9F56EF3E6CC6E5325978257362FC5F8033AD348CBF6; EventFieldIssue F0BFD21207C081A25874D87EBC56AEFC279AD91DD4B46C145E66F4E2DF41E7BA; EventWhenFields 1977236E4B557E6EB69FE01A7F3FD28DA149D76B03B5E0BCF6DBC6C5F96D892D; EventRepeatFields DE6786C79DCE4DBC269EBDE1749AC5F9E3A7202CE2405967B4140DF50832D839; EventAdvancedFields B0A56F09FCC4628092317A7800C475041500C98C178BD5B2A4C4E98F74C277A9; EventZoneFields 5358ED3A568E0F06048AC3231B280065A3F3846BBBC9FC967EBBE9690D526639; Agenda 84F3CA1B923F22B2B41810A3EEBE12083D04DCEC878FA559EC9641F6FE3849FB; AgendaDay 5FDC4E0A44AB86579FDADD00C0F0AAF87586E8BDF0DB7441657B15417814F967; AgendaHeader 41B5546AF0D63B48B4F40CBEFB7E6622B6F1A7EFA689869072DB7EC71A5385E7; useAgendaResult FC573BFAE1DD295BE9B61E24D294D0986BD42895EB2C65F25C98FABB370AFFDF; agenda.css E71EA740E596C5FA4551189E74AFFC1E932F8E1C4B050E7C1FCFD52AC91877A6.


Final accessibility correction requested by coordinator: native required semantics restored on title, start date/time, manual end time, multiday end date and weekly until under noValidate. Focused suite repeated after this correction: 11 PASS, exit 0. Compiler PASS above precedes this required-only JSX change; coordinator owns final fresh compiler/build.

## Independent live QA correction — focus after busy unlock

Coordinator reopened only EventForm.tsx after live QA found that error focus ran while the enclosing fieldset was disabled. Test owner independently added two RED regressions for title and secondary description; coordinator reported RED2 and authorized this correction before source changed.

Changed useIssueFocus to accept editor.busy, defer focusing while busy, and rerun the effect when busy returns false. Existing ref lookup and opening ancestor details remain intact. Only EventForm.tsx (49 lines) and this attributed record changed in this correction; tests and all other production paths remain owned by their respective agents.

Observed `node --test --test-reporter=dot --test-concurrency=1 tests/agenda-event-form-model.test.mjs tests/agenda-event-form-editor.test.mjs tests/agenda-event-form-view.test.mjs tests/agenda-event-form-result.test.mjs tests/agenda-ui.test.mjs`: 38 PASS dots, exit 0. `git diff --check`: exit 0, CRLF warnings only. No fresh compiler/build/browser process by this child; coordinator owns final static/live verification. No test was edited and no circuit breaker triggered.

SOURCE FREEZE after this correction: apps/agenda-ui/EventForm.tsx SHA256 AD69076D37C5C8A5DCF53535040D7E4AE5D8AD05FC6D34B61F34C7D7F4718358. This supersedes the earlier EventForm hash above. No commit by this child. Next action: coordinator refreshes static/build proof and live QA on the corrected candidate.
