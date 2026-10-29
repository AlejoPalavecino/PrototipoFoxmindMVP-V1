# Mis aulas reference contract — ready for implementation

- Agent / role: auth_architect, bounded UX/UI architecture; product read-only.
- Session or task ID: /root/auth_architect.
- Date: 2026-10-28.
- Branch / worktree: codex/inicio-reference-astra; foxmind-inicio-astra/ProtipoFoxMind.
- Starting commit: f0dc59a, observed by git log; asset-agent record untracked and preserved.
- Phase/task/spec: existing P5 collection presentation, [functional spec sections2/5](../foxmind-v1-functional-spec.md), [P5 record](../../odd/tasks/p5-classrooms.md), [roadmap](../implementation-roadmap.md).
- Status: completed (design only).

## Request and scope

ESTADO_DISENO: LISTO_PARA_TDD_RED.

Apply the user's selected Mis aulas screenshot to the existing collection in this isolated ASTRA session. Scope is the collection landing screen: hero, controls, cards and actual pending invitations/drafts. Keep existing creation, join, invitation, draft and classroom navigation handlers. Do not redesign individual classrooms, Inicio, Agenda, account routes or the shared navbar. No services/API/DB changes, new academic data, memory writes or publication.

Applied the already-read sdd-ambiguity-gate, clean-architecture and team-docs-strategy instructions. The reference has unsupported metrics/navigation but existing contracts resolve them; omit those surfaces rather than fabricate them. No unresolved business ambiguity requires another user decision.

## Visual and content contract

1. Add a collection-only root marker when presentation is classrooms and neither draft nor classroomId is active. All new CSS uses that marker. Reuse AppNavbar's existing private sidebar, active Mis aulas, real notifications/account and mobile drawer. Do not add Mensajes, Mis archivos, Mi progreso or Foxy AI destinations from the bitmap. Do not add a duplicate global search bar.
2. Main begins with a wide cream/apricot hero, rounded20px, approximately4.5:1 on large desktop. Actual artwork: /foxmind-3d/classrooms-reference/hero-{480,960,1600}.webp, responsive srcSet, explicit dimensions and decorative empty alt. Keep typography in HTML. Badge “Mis aulas”, headline “Tus clases, bien organizadas.” with orange accent and a brief role-neutral subtitle such as “Organizá tus clases y seguí aprendiendo en un mismo lugar.” Avoid referring to every user's “tus estudiantes”.
3. Reuse create/join callbacks in hero: outlined Unirse con código and orange Crear aula, both disabled while busy. Four small illustrative benefits can describe existing capability (“Accedé a tus clases”, “Entregá tus actividades”, “Consultá tus resultados”, “Conectá con tus docentes”); they are noninteractive explanatory text, not unimplemented shortcuts. Preserve no action encoded only in an image.
4. Place one collection toolbar under hero: named search, role filter buttons with exact counts, Más filtros disclosure, and a named Tarjetas/Lista view selector. Use short labels “Todas”, “Donde enseño”, “Donde estudio”; role semantics stay exactly all/teach/study. Do not label academic membership as global account roles. Desktop toolbar may wrap instead of compressing text.
5. Default cards use two columns on a wide content area, each with a left portrait crop of its existing category cover and right information/action panel. Approximately24–28% cover,72–76% content; rounded18px warm border and white surface. Title18–20px, body14–15px, subtle role pill. Use actual name, subject, division, teacher and academicYear; academicYear MUST be labeled “Ciclo lectivo”, per spec§5. Never substitute educational grade/level. Keep archived badge “Archivada · Solo lectura”. Teacher-owned cards may say “Docente: Vos”; search still uses actual DTO teacher string.
6. Keep one real Entrar al aula action per card. It invokes onEnter(room.id) once for that ID. No fake menu ellipsis, avatars/student counts, weekday/time, percentages, completion rings, tasks/grades or roster facts absent from collection DTO. Use the resulting whitespace for a readable name/metadata block, not placeholder widgets. No whole-card click layer that competes with the button.
7. Bottom Pendientes remains only when actual invitations or drafts exist. Refine its presentation into compact rows/cards but preserve every existing entry/action, selected-invitation prioritization, expiration information and requested-invitation failure notice. Invitation acceptance remains explicit; draft resume remains separate from classroom entry. Count, if shown, equals invitations.length+drafts.length. Do not substitute unsupported correction/message/due-event counters. Do not hide real invitation/draft flows to imitate the screenshot.

## Two bounded interaction units

### A. Local search and advanced filters

- Extend existing normalized search to room.teacher in addition to name/subject/division. Preserve NFKC+lowercase+trim normalization and broad Unicode text; no backend call, debounce network request or roster/student search. Placeholder says “Buscar por nombre, materia o docente…”; accessible label remains Buscar aula. Division matching remains supported.
- Extend filterClassroomCards with an optional final options argument, keeping current four-argument callers compatible: state all/active/archived, academicYear string-or-empty, division string-or-empty. Defaults include all rooms. Deduplicate first by id using existing teacher-DTO-wins stable order, then intersect role, search and every chosen advanced criterion.
- Más filtros is a real button with aria-expanded/aria-controls that reveals inline labeled native selects: Estado (Todas, Activas, Archivadas), Ciclo lectivo (Todos and actual distinct loaded years), División (Todas and actual distinct loaded strings). Sort years descending and divisions with es locale; do not invent options or infer study level. Use exact stored value equality for year/division selections. Option lists derive from the complete deduplicated collection, not current results, to prevent disappearing selections.
- Cerrar the disclosure keeps its filter choices applied. A visible Limpiar filtros action when any advanced value is active resets advanced criteria only; preserve role/search so its meaning is precise. Show active filter count on Más filtros when needed so hidden applied criteria are discoverable. Local state need not persist across reload or route exit.
- Role-pill counts retain current total-per-role semantics independent of search/advanced criteria. “Mostrando n de N aulas” remains deduplicated visible vs global count. Empty filtered state explains no matches and offers clearing advanced filters when active; an actually empty collection retains create/join guidance. Never hide pending invitations/drafts when filtering rooms.

### B. Tarjetas / Lista presentation

- Add local layout state default tarjetas. Two type=button controls have accessible labels “Vista de tarjetas” and “Vista de lista”, aria-pressed reflecting state and decorative grid/list icons. Only presentation changes; same visible rooms, order, filters, counts, pending items and callbacks remain.
- List layout is a single column of compact horizontal rows; grid remains two columns when enough width exists. Mobile naturally uses one column in both modes. Keep the selected state understandable and keyboard operable. No API call or persistence is needed.

## Responsive and state acceptance

- Match desktop composition at1784x880 and1440x900 without forced width/height. Existing sidebar geometry is authoritative. Two columns require enough content width for readable horizontal cards (roughly1050px available); narrow desktop/tablet becomes one column. At390/320px no document overflow; toolbar controls wrap, fields grow full-width, and hero action buttons remain visible without crossing the fox.
- Hero may become taller on mobile; prioritize text and action readability, reducing decorative illustration prominence rather than shrinking controls. Clamp headline around28–40px; preserve existing local rounded font. Long titles/teacher/division names wrap anywhere necessary. No clipped pending/error text.
- Native focus rings,44px practical control targets, visible labels and semantic headings remain. Search/filter/view controls do not move focus after results change. Notice/error/retry/loading states remain outside decorative layers and visible. Busy disables existing mutations as before; local filters need not lock.
- Check loading, failed load/retry, no rooms with pending items, truly empty, no matches, mixed roles, duplicate IDs, archived room, long text, selected invitation and narrow widths. Natural vertical scroll is expected. No authenticated E2E or real data mutation is inferred from synthetic fixtures.

## Ownership and DoT

- Coordinator owns roadmap, shared import coordination, aggregate checks, local commits and final evidence. Asset agent owns only classrooms-reference assets and its own record.
- Product worker owns collection-only Classrooms.tsx markup, ClassroomCollection.tsx, collection-filter.ts and small new collection components/styles as needed. Prefer new hero/card/control modules to growing existing files; keep rendering/state apart from pure filtering. Only add collection CSS after legacy cascade and scope it to the marker. Do not edit individual classroom/wizard handlers, shared navbar behavior, API or test files.
- Test runner owns focused test changes and its own fixtures/record. Existing relevant suite is tests/foxmind-3d-flows-collection.test.mjs. Meaningful RED: teacher-only search hit; simultaneous role/state/year/division intersection; duplicate teacher precedence; reset choices and disclosure visibility; grid/list aria-pressed plus unchanged cards/order/callback. Include both archived default visibility and active-only narrowing.
- Test pure filtering via current loadTsModule helper and component state through existing hookView fixtures. Do not pin CSS declarations or exact decorative wording. Verify no mutation from search/filter/layout changes. Test existing room entry, invitation acceptance, draft resume and create/join behavior where fixture seams permit; browser checks may complement unit coverage.
- Proposed focused command: node --test tests/foxmind-3d-flows-collection.test.mjs tests/p5-ui-client.test.mjs plus the runner's new scoped test file if separated. Tests not run by this design agent. Coordinator runs strict web types/isolated production build after writers settle, then independent review.
- ego-browser QA uses a dedicated Space and synthetic real components:1784/1440/1024/768/390/320px; compare image, inspect full overflow, keyboard controls, teacher query, role+advanced intersection, clearing, list/grid, room entry and pending actions. Keep visual fixture evidence distinct from authenticated backend verification.

## Work performed and verification

Read current roadmap and previously read work-log protocol; inspected Classrooms.tsx, ClassroomCollection.tsx, collection-filter.ts, HomeCover.tsx, shared-ui/index.ts, AppNavbar.tsx, Classroom/Draft/Invitation DTO declarations and spec§5 plus P5 task context. Viewed supplied clipboard reference. No ClassroomsApp.tsx exists as a separate required module: ClassroomsApp is exported by Classrooms.tsx. Existing collection already provides name/subject/division search and role counts; teacher/year/archive/division support the bounded local additions above. No schedule, progress or roster fields are present.

Observed git log starting f0dc59a and git status showing only asset-agent record. An initial Windows rg path-glob query was invalid; corrected rg --files/tests search found the collection suite. No runtime, API, functional test or build was run. Record-only structural/diff check is proportionate; design completion does not assert implementation PASS.

## Commits and handoff

No commit authored. First unfinished step: test runner establishes RED for local filter/layout units; worker implements this contract while separate asset generation completes. Coordinator owns any changes to the shared roadmap and records actual checks/review. No critical user decision is pending.
