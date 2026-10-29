# Agenda and event editor reference — design ready

- Agent / role: `/root/agenda_arch`, configured architect, read-only product inspection.
- Session or task ID: `/root/agenda_arch`; authoritative runtime identity unavailable for memory writes.
- Date: 2026-10-29.
- Branch / worktree: `codex/inicio-reference-astra`, isolated `foxmind-inicio-astra/ProtipoFoxMind`.
- Starting commit observed: `6a408aca70984b4161c7258dd6e6aaae40017800`.
- Phase/task: existing Agenda frontend and private-event editor; [roadmap](../implementation-roadmap.md), [behavior](../agenda.md), [original task](../../odd/tasks/agenda.md), [compact editor](../../odd/tasks/agenda-compact-event-form.md), [event colors](../../odd/tasks/agenda-event-color.md).
- Status: completed — architecture/DoR only, no implementation or visual acceptance claim.
- ESTADO_DISENO: LISTO_PARA_TDD_RED.

## Request and resolved scope

Adapt Agenda to the user's selected1780×883 screenshot and derive the new-event form from the same warm cream/orange UI. The form has no separate supplied reference; its precise arrangement is a reversible presentation decision. The user's preceding boundary excludes adding absent functionality. Preserve real events, academic deadlines, public signatures, permission checks and temporal rules. No backend, schema, configuration, real-data or provider change is needed.

The source image guides composition: sidebar approximately235px, hero untily163, headingx288/y40, toolbarx270/y180, calendarx259/y245 to1358/y862, railx1382/y190 with approximately378px width. Calendar uses six visible rows, not a fabricated five-row month. Reference labels and fictional entries are not additional business requirements.

## Existing information and interfaces

- `Agenda.tsx` orchestrates `useAgendaView`, `useAgenda`, target/result recovery, editor state and opening academic content. `AgendaMonth`, `AgendaPeriod`, `AgendaDay` and `Upcoming` are presentation leaves. Existing `foxmind-agenda.css` already places the selected-day section at the right via `display: contents`; DOM order alone does not describe actual layout.
- `AgendaClient` remains exactly `list`, `upcoming`, `get`, `put`, `replace`, `remove`, `open`. `Agenda` retains `{api,onOpen,requestedEvent?}`; `EventForm` retains `{api,event?,day,zone,onClose,onSaved}`. Domain exports from `src/core/domain/index.ts` and the Agenda public barrel stay unchanged.
- Personal `EventPayload` contains `title`, `description`, `category`, `schedule`, `repeat`, optional finite `color`. Categories are only `CLASS`, `ACTIVITY`, `EVALUATION`; academic deadlines are a separate read-only projection. No Consultation/Other category, favorites, classroom assignment for personal events or filtering contract exists.
- `Upcoming` receives academic deadlines only, not all private future events. Retain the truthful title “Próximas entregas” and role/pending/resubmission semantics. A reference “Ver todos” or “Filtros” must not become an inert/fake control.
- The existing `EventFields` leaves cover category/title/color, date/time/duration, recurrence, notes, multiple-day/date-end/zone and summary. `EventForm` also owns saved-version review, error focus and cancellation via its existing editor hook.

## DoR audit in six dimensions

| Dimension | Preserved boundary and visual constraint |
| --- | --- |
| Data / idempotency | Title1–160, notes≤4000, real dates and finite color tokens; creation retains stable UUID/PUT on retry and duplicate-submit lock. No payload field added. Preview labels derive from actual items. |
| States | Month/week/day, selected day, loading/error/empty; editor pristine/dirty/busy/error/conflict/saved. Keep errors distinct from empty and preserve selected date after saved-event recovery. |
| Failures / atomicity | API error retains draft. Confirmed save plus failed reload must not resend the write. Inline issue associations and first-invalid focus remain. |
| Concurrency | Revisions/CAS, conflict latch, saved-version review preserving draft, whole-series confirmations, generation/abort protection and latest-range revalidation remain. |
| Permissions / privacy | Personal events remain “Solo vos”; academic content validates current access on open. Calendar-zone grouping must not relabel academic deadlines as private or change the classroom-zone display. |
| GRASP / dependencies | Frontend presentation change; existing hooks/domain are information experts. No new transport, duplicated temporal resolver, library/calendar framework or backend contract. Scope styling to Agenda/editor. |

## Reversible presentation assumptions

Use the existing font/icon library and generated bitmap artwork for decorative fox/desk scenes. Main title is dark brown plus orange “Agenda”; pale cream canvas, white rounded cards, thin warm borders, orange primary actions and category/event-color pastel treatments. Do not encode text-only statuses solely by color.

At desktop, visually group mode buttons, Today, previous/next and period heading into one toolbar above the calendar. Keep date navigation and view-zone change reachable; disclosure for the existing zone control is acceptable. The right rail contains selected-day details, then academic upcoming deadlines, then optional decorative encouragement. Mobile stacks the content, retaining readable16px fields, visible focus and44px target goal; calendar days may use compact count/color indicators as already implemented.

For new/edit event modal, use a cream/orange heading, privacy explanation, clear white groups for “Qué”, “Cuándo”, “Repetición” and secondary options, real color radios and a compact summary. Keep notes/zone/multiple-day controls accessible, do not create a wizard or introduce reminders, invitations or a location field. Modal can scroll at notebook/mobile heights; every action must remain reachable without covering fields. Keep edit/delete and whole-series warnings as existing behavior.

## Contract and team plan by slice

| Owner | Exact edit surface | Constraints |
| --- | --- | --- |
| Coordinator/integration | `apps/agenda-ui/Agenda.tsx`, imports in `apps/web/pages/_app.tsx` and the actual Agenda entrypoint; new scoped stylesheet entry | Single owner of shared orchestration/imports. Preserve all hooks/callbacks; update only selection mode behavior specified below. |
| Calendar/layout worker | `AgendaHeader.tsx`, `AgendaMonth.tsx`, `AgendaPeriod.tsx`, `AgendaDay.tsx`, `Upcoming.tsx`, `AgendaLegend.tsx`; new `apps/agenda-ui/agenda-reference.css` | Existing payloads/handlers only; time/icon previews decorative inside native day button, no nested button. Avoid duplicating Today or period navigation. |
| Event-form worker | `EventForm.tsx`, `EventFields.tsx`, `EventWhenFields.tsx`, `EventRepeatFields.tsx`, `EventZoneFields.tsx`, `EventColorFields.tsx`, `EventAdvancedFields.tsx`; new `apps/agenda-ui/agenda-event-reference.css` | Presentation only; do not edit `useEventEditor`, draft/actions/validation, public types or tests. |
| Asset worker | `apps/web/public/foxmind-3d/agenda-reference/` and own record | Generate/inspect raster hero and optional note scene, convert to WebP with bounded dimensions/weight; no source-code writes. |
| QA/test runner | Focal test/helper files and live synthetic fixture with existing ports | No product source, real accounts/data, database or provider operations. Coordinator persists attributed reports if role prevents writing records/evidence. |

Use disjoint ownership in the current worktree. Do not overwrite another agent's record. Keep newly extracted presentation files cohesive and under200 lines when practical; split authored changes into reviewable behavior/presentation units≤400 lines rather than compressing source. No broad refactor is required to retrofit all older files to the size goal.

One observable interaction changes to match the reference: selecting a date from **Mes** updates the selected day and rail while keeping the monthly grid; explicit **Día** still selects the daily view. Existing code currently calls `setMode('DAY')` inside month selection. This small change requires a meaningful RED test before GREEN. The tester reported `tests/agenda-reference-selection.test.mjs` exit1 caused by that behavior; this is attributed evidence, not an architect-run test.

## Definition of Tested

1. New selection test: start in MONTH, select a day, preserve monthly calendar and update selected-day props; explicit DAY remains available; no writes during selection/navigation. Test the actual Agenda component with in-memory ports.
2. Focused pure regressions selected after inspecting imports: `agenda-reference-selection`, `agenda-polish-presentation`, `agenda-view-modes`, `agenda-event-form-{model,view,editor,result}`, `agenda-event-color-{model,view}` and relevant `agenda-ui` cases. Do not execute broad `npm run test:agenda`, DB helpers, API integration or retained local projects for this frontend scope.
3. Preserve42 month buttons, outside-month days, today vs selection semantics, color choice, truthful category/academic labels, day and week navigation, zone-aware dates and saved-event focus. A presentational helper can format preview times using the existing pure date logic; test only if new temporal logic is introduced.
4. Editor regression: invalid title/date/recurrence prevents write and focuses issue; busy blocks cancel/double submit; dirty discard respected; explicit colors/AUTO and all-day restore; recurrence DAILY/WEEKLY/MONTHLY with inclusive final date≤53; DST ambiguity options retained; conflict review preserves draft; edit/delete series warning remains.
5. Ego synthetic browser QA: compare screenshot/render at1780×883 and same November2026 state using actual components; inspect desktop/narrow notebook/390/320; new event, edit existing event, advanced/repeat/color, validation focus, keyboard/Escape/focus return, busy/error/conflict, save result and month/week/day. No actual account or DB/provider write. Save final source/render evidence and report residual differences honestly.
6. Strict web types, bounded isolated production build, scoped CSS parse and independent review; staged Gitleaks before local commits. No configured frontier linter was inspected here, so do not claim it passed.

## Handoff and limits

No business ambiguity blocks this visual scope; no permission question or stack change is needed. Parent coordinator owns acceptance and roadmap updates. Architecture inspected files/source image and wrote only this record. No tests, build, browser actions, source changes, commits or remote operations were performed by this architect. Engram writes were not attempted because runtime registration is unavailable.
