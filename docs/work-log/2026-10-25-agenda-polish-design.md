# Agenda reference polish — design handoff

- Agent / role: architect; task ID: `/root/agenda_polish_design`.
- Date: 2026-10-25; branch/worktree: `main`, shared checkout; starting commit: `e637cc9`.
- Phase/spec: bounded Agenda presentation; [behavior](../agenda.md), [feature](../../odd/tasks/agenda.md), [roadmap](../implementation-roadmap.md).
- Status: completed (design only; implementation and QA pending).
- Scope: coordinator confirms current user authorization for local main polish; approved navbar is immutable.

ESTADO_DISENO: LISTO_PARA_TDD_RED

## ESTRATEGIA_EQUIPO_Y_SUPUESTOS

- `slice_worker` owns `apps/agenda-ui/Agenda.tsx`, `AgendaHeader.tsx`, `AgendaMonth.tsx`, `AgendaDay.tsx`, `Upcoming.tsx`, new `agenda-presentation.ts`, Agenda CSS leaves and its own record. Other agents may be editing; preserve their changes.
- `test_runner` owns presentation/semantic tests and labeled fixture/native evidence. Coordinator owns roadmap, delivery and shared-state reconciliation. Architect owns only this record.
- Existing React/strict TypeScript stack, domain/API contracts and assets remain suitable; no service, provider, dependency, auth or data changes are needed.
- Six-dimension DoR audit: data/idempotency, states, failures, CAS/concurrency and permissions retain current implementations; GRASP change is a pure formatting leaf plus presentational components.
- Main edits are authorized by coordinator; disjoint ownership suffices for this bounded slice. No navbar source/CSS edits or `.nav` overrides.

## CONTRATOS_Y_PLAN_POR_SLICE

- Keep `Agenda` public props and `AgendaClient` unchanged. Move the existing `view.today` callback to new required `AgendaMonth.onToday: () => void`; remove only the redundant Header Today control/prop.
- Header: Fredoka 52px navy title, 22px description, muted violet supporting text; 56px orange bold New event CTA at upper right. Keep real zone and working Cambiar selector visible. Do not invent global search.
- Desktop layout: calendar left / selected-day and upcoming right, approximately `1.9fr 1fr`, 16px gap; narrow viewport stacks without horizontal overflow.
- Calendar: previous, next, Hoy then month heading aligned left. Keep `monthDays` exactly 42 cells and all date aria labels, selection callbacks, current-date semantics and loading state. Numeric dates 18px, controls at least 44px; today circle and selected peach cell remain visually distinct.
- Add icon+text legend for personal/private events and classroom deadlines; preserve event color classes and real previews. No synthetic dates or rows.
- Selected panel: weekday/day title, month/year subtitle; personal card has peach/color rail, real event time, title, explicit privacy and Editar evento/serie behavior. Retain focus IDs, descriptions, busy state and Add event action.
- Deadline cards: true date tile from `deadlineAt` in `item.timeZone`, real title/classroom/time, role, resubmission/pending state and existing Open activity target. Never derive tile date from selected day or viewer/browser zone.
- Upcoming: keep loading/error/empty states truthful; existing `scenes/agenda` fills the lower right panel width, replacing the 220px thumbnail sizing. Asset remains an illustration, never flattened UI/text.
- CSS stays within Agenda roots (including existing `.agenda-dialog` portal scope); preserve dialog focus/close logic. Split cohesive CSS leaves below 200 lines; source units below 400 lines, no compressed golfing.
- Do not edit `calendar.ts`, `useAgenda*`, editor/CRUD/forms, domain or API unless a demonstrated critical QA regression is escalated.

Optional pure formatting leaf contract (required RED if introduced):

```ts
selectedDayHeading(day: string): { title: string; subtitle: string };
deadlineParts(instant: string, timeZone: string): { day: string; month: string; time: string };
eventTimeLabel(item: EventOccurrence): string;
```

- `selectedDayHeading('2026-10-28')` → `{title:'Miércoles 28', subtitle:'Octubre de 2026'}`; interpret date-only at UTC noon, independent of browser zone.
- `deadlineParts` uses fixed `es-AR`, exact supplied zone, numeric day, uppercase short month without punctuation (`OCT`), two-digit 24h `HH:mm` (`h23`). Example `2026-10-27T01:00:00Z` / Buenos Aires → `{day:'26',month:'OCT',time:'22:00'}`.
- `eventTimeLabel`: ALL_DAY → `Día completo` without instant conversion; TIMED uses occurrence instants and saved schedule zone, same-local-day `09:00 – 10:00`, multi-day `28 oct, 09:00 – 29 oct, 10:00`; retain existing full date/zone context alongside concise time. No Date.now, persistence or mutation.

## CRITERIOS_DE_TEST_DOT

- Meaningful RED→GREEN for any helper: UTC/Buenos Aires midnight rollover, month/year boundary, non-browser zone, date-only heading stability, ALL_DAY without conversion and timed/multi-day ranges. Do not test CSS by mirroring declarations.
- Component checks: Header callbacks/zone selector; Month exactly 42 real accessible cells plus Hoy/prev/next/select; today versus selected; selected focus/edit/create; deadline exact tile/time/target; loading/error/empty and busy preserved.
- `test_runner`: render actual `Agenda` + actual `AppNavbar` in typed fixture on isolated Next `53271`; explicitly label evidence fixture-only. Use `ego(lite)` task Space, desktop reference/populated + actual empty states, mobile and keyboard; check dialog open/close, zone, dates, navigation, focus, contrast and 44px targets. No authenticated user mutations.
- Run focused Agenda tests, strict types and isolated web build; Docker `_test` integration is unnecessary unless behavior/persistence changes. Native fixture pixels do not establish authenticated E2E.

## Verification and handoff

- Observed clean `git status --short`, `main` at `e637cc9`; read listed UI/CSS/hooks/form, relevant specs, roadmap and work-record protocol. Viewed target `812a2e61…png` and actual `8638f4e5…png` pixels; target has five visible weeks but existing 42-cell contract is retained.
- Skills applied: ambiguity gate, clean architecture, team docs strategy; Engram project confirmed `prototipofoxmindmvp-v1`, bounded search empty; save blocked by hook (host session unregistered), no persistence claimed. Record 55 lines, `git diff --check` exit 0; no functional checks, implementation or commit by architect.
- First unfinished action: `test_runner` writes meaningful presentation RED; `slice_worker` implements only owned Agenda surface, then independent visual/semantic QA. Coordinator closes delivery after observed evidence.
