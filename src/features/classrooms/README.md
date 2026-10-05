# Classrooms mock boundaries

Use `src/features/classrooms` (headless `index.ts`) for domain types, repositories,
pure operations and `getClassroomColorTheme`. Use `src/features/classrooms/ui` for
role participant/activity lists, `TeacherClassroomList`, `TeacherClassroomCreateFlow`
and `useTeacherClassroomCreation`. Messaging workflows remain outside this migration.

## Public import boundaries (T3e / E4)

The headless entry point must not transitively load UI components or hooks. The
separate UI entry point exposes only the seven existing presentation/hook exports;
it adds no detail, membership or future composition exports. This split prevents
shared domain consumers from pulling role UI back into their dependency graph.
Feature internals import leaves, not the UI barrel. Existing shared wall/modal/detail
consumers stay on the headless boundary; the profile keeps its direct leaf import.

`classroomImportBoundaries.test.ts` checks the current tree for zero runtime cycles,
transitive headless/UI separation, exactly seven UI exports and both role pages'
UI import routing. It inspects in-memory TypeScript output, including static imports,
reexports, side effects and literal dynamic/require edges; type-only edges are erased.
Missing local source imports fail rather than silently disappearing. External packages,
computed imports and runtime loader behavior are outside this graph. These structural
checks do not establish browser, animation or state-lifetime acceptance (pending T8).

## Catalogue and membership

- `Classroom` reuses the existing `src/types.ts` contract. Fixture values are unchanged.
- `classroomRepository.readCatalogue()` and `readMembership()` return session arrays
  by reference. `add()` prepends by replacing membership while retaining old records;
  `replaceMembership(array)` keeps the exact supplied array. There is one mutable
  owner, no persistence, asynchronous work, notifications or new subscriptions.
- `add()` preserves case-sensitive id OR subject/course duplicates, truthy numeric
  defaults versus nullish active tasks, and drops schedule/description as before.
- `resolveClassroomJoin(code, catalogue, enrolled, now)` plans without mutating data;
  the injected clock runs only for generic codes. `joinClassroomByCode(code, enrolled)`
  synchronously applies the plan to session membership. The supplied UI snapshot
  controls the case-insensitive catalogue duplicate check, not repository state.
- Matching retains trimmed uppercase codes, course/subject substrings, permissive
  id inclusion and first catalogue match. Blank codes reject; **every other unmatched
  code succeeds** via existing generic subject/course defaults. Generic duplicates
  still report success even if storage returns an existing classroom.

## Submission contracts

- `Submission` owns the shared student/teacher record shape; fixtures live in `data/`.
- `submissionRepository.read()` returns the current session array by reference.
  `replace(array)` synchronously replaces it without cloning, merging or notifications.
  There is no backend, localStorage persistence, async API or subscription mechanism.
- `deliverSubmission(records, studentId, payload)` is pure: maps **every** matching
  student, keeps other records by reference, and retains existing date/content/file
  defaults. It does not insert missing students, clear grades/feedback, trim text or
  persist. Blank-delivery validation remains in `StudentActivityDetail`.
- The neutral theme helper preserves color/subject substring matching and priority:
  purple, blue, orange, green, then primary.

## Compatibility and UI state

`mockData.mockClassroomsDocente`, `mockClassroomsAlumno`, `addClassroomToAlumno`
and `updateClassroomsAlumno` are live compatibility aliases/delegation, as are
`sharedSubmissions` and `updateSharedSubmissions`. Legacy writes are immediately
visible on feature reads and vice versa. Existing local UI snapshots do not auto-refresh.

`AulasAlumno` still copies membership at initialization, mount, successful joins and
on `messagingStore` updates, returning the same subscription cleanup. Invitation
acceptance still calls the legacy add alias before the existing messaging notification;
that unchanged bridge triggers the view's refresh. Pure tests do **not** validate
browser invitation refresh; interaction/rendering verification remains pending T8.

Active `TeacherActivityDetail` grading still updates only its local setter. The
unreachable legacy detail's shared-data replacement was not the rendered grading
path; removing that definition in E1 does not unify persistence policies.

## Teacher list and creation (T3b)

`TeacherClassroomList` renders the actual initial teacher listing;
`TeacherClassroomCreateFlow` renders its creation dialog. The page retains selection,
navigation, detail wiring and local list ownership. The creation hook mounts in the
page, so selecting detail does not reset form state. Feature modules never import a view.

`createTeacherClassroom(form, now)` returns a classroom and the **entire replacement**
curriculum; it does not persist or mutate catalogue/membership. The page callback
replaces its existing module-scoped `sessionCurriculum` and prepends to its local list.
Detail still copies that module value on mount, including its existing completed-topic
initialization; `ClassroomCurriculaTab` and `CreateActivityModal` consume that local copy.
There is deliberately no per-classroom curriculum store or catalogue publication.

### Baseline captured from code, not a pre-migration runtime test

Source boundary: `17d9557`, `AulasDocente.tsx` lines 49–188 and 829–832.
There was no standalone pure creation API to execute before migration.

- Opening resets subject/year/division/observation to empty, color to blue, topics to
  empty, file to null and step to form; it does **not** reset drag state.
- Subject whitespace rejects first, then missing year/division, then missing file,
  with the original warning text. Only subject is trimmed. Observation/topics are
  optional. File metadata is name plus one-decimal MB; contents/types are not parsed
  or runtime-validated (the input still advertises `.pdf,.doc,.docx,.txt`).
- Analysis of `  Biología General  ` with clock samples 41–44 yields four ids
  `u-41-1` through `u-44-4`, the original unit/subtopic copy and a trimmed subject in
  the first title. Each unit samples the clock independently inside the state updater.
- Confirmation at clock 123 with `3° Año` / `División B` yields `aula-123`, course
  `3° Año División B`, selected palette background, counts 25/1/0, grade/progress 0,
  teacher `Docente a cargo`, activity `Recién creada`; observation/file are omitted.
- Edited topics map to numeric ids starting at 1, first status current then pending,
  retaining subtopic array references. Empty topics replace curriculum with `[]`;
  confirmation adds no new validation. All seven palette records and the existing
  theme priority/fallback remain unchanged (not a seven-color theme redesign).

Analysis remains 2200 ms, confirmation 1800 ms, with the original upload/success
and warning toasts. Timers remain uncancelled on close/detail/unmount. Analysis keeps
its invocation subject but spreads the latest form; creation retains its invocation
form and list snapshot. Reopening does not cancel an older operation. The file ref
lives in the page hook; the DOM input still mounts only in the dialog's form step.
Changing the file clears metadata, not the input value. These quirks are preserved.

Pure tests cover defaults, warnings/file requirement, metadata, generated curriculum,
fields/colors, reference semantics and no catalogue mutation. They do **not** prove
UI lifecycle, file picker/drop, animation, navigation or toast behavior; browser and
component verification remains pending T8, and build belongs to the parent verifier.

## Activities and assignment (T3c)

- `Activity` and `CreatedActivityData` are domain contracts, independent of React.
  The wizard still reexports `ActivityType`/`CreatedActivityData` for existing consumers.
- `activityRepository.read()` returns the current teacher/copilot session array by
  reference; `replace(array)` keeps the supplied array synchronously. `mockData`
  exports `sharedActivities`/`updateSharedActivities` as live compatibility aliases.
  Copilot assignment remains untouched and writes the same owner. No subscription,
  persistence, per-classroom partitioning or automatic local UI refresh was added.
- `createActivity(input, now)` extracts the wizard's final record construction, using
  `Date.now()` by default. Title/description/date strings are unchanged, zero students
  still means `0/28`, instructions retain their exact text, upload documents beat
  attached materials, and material `fromLibrary` is retained. Attachment metadata is
  copied; rubric and DUA arrays remain references. Validation/topic fallback remain
  in the wizard, not in this pure mapper.
- `mapCreatedActivity(data)` extracts the teacher assignment projection. It drops
  `startDate`, `topic` and `createdVia`, retains nested references, and copies all other
  assigned fields. The page constructs it before the state updater as before, then
  prepends to that updater's local snapshot and replaces the session array there.
- `createStudentActivities(submissions, studentId)` initializes fresh **separate**
  student fixtures at detail mount. These always had different descriptions,
  attachments/statuses and a fixed third grade; teacher/copilot additions do not
  appear here. Only activity 1 reads the first matching submission: missing/no match
  leaves it pending, submitted means delivered, graded means completed, and non-null
  grades become strings (including zero). This initialization is not a subscription.

`TeacherActivityList` and `StudentActivityList` render the actual activity-tab lists,
including unchanged status/count/DUA badges, animations and bubbling card/button clicks.
Selection, back navigation, detail components, modal placement and delivery stay with
existing owners. Active `TeacherActivityDetail` remains local-only grading. T3c left
`ActivityDetailView` and the teacher detail suffix untouched; E1 cleanup is below.
Student delivery still uses T2's synchronous submission operation and local status map.

Source comparison against `657b6f3` preserves wizard validation, resets, generated copy,
material/library upload and 1800/1600 ms uncancelled timers. Final creation still calls
parent assignment before its success toast and reset/close. The modal remains mounted
under teacher detail, including its existing `isOpen` early return and file refs; neither
list owns state or effects. Node tests cover pure contracts and shared compatibility,
not browser render/lifetime/navigation/toast proof. UI verification remains pending T8.

## Wall and participants (T3d)

- `MuroPost`/`MuroComment` reuse `src/types.ts` via type reexports. Wall fixtures retain
  all values/order. `classroomWallRepository.read()` returns the session array by
  reference; `replace(array)` keeps exactly that array synchronously. Legacy
  `sharedMuroPosts`/`updateSharedMuroPosts` are live aliases to this same owner.
- `publishWallPost`, `toggleWallLike` and `addWallComment` are pure transformations
  of the caller's local snapshot. Publication/comments trim and reject blanks before
  sampling `Date.now()`, preserve the role-specific names, relative `Justo ahora`
  timestamp, types and attachments. Publication prepends without sorting pinned posts;
  likes floor decrements at zero; comments append. Mapping changes every matching id,
  retains other records, and still creates an array for unknown ids. No operation
  persists implicitly. Pinning is only the existing teacher publication checkbox,
  not a new pin-toggle interaction. No locale-date wall behavior existed to migrate.
- `ClassroomMuroTab` reads the shared array on mount, then keeps its own posts/drafts,
  filter and comment expansion. Successful actions set local posts then replace the
  shared array; blank actions leave drafts untouched. There is no subscription, merge,
  per-aula partition or automatic sync between already mounted snapshots, despite the
  existing real-time label. AI drafting/attachments and all avatar/render markup stay
  unchanged. Stale local writes can still replace newer shared data, as before.
- Both participant rosters are actually rendered. `TeacherParticipantList` and
  `StudentParticipantList` own only toolbar/grid/table presentation. Their distinct
  fixtures, filtering/search/view mode, teacher selection/report/invite callbacks and
  session/local state stay in the original role views. Teacher risk/DUA badges and
  full-name initials remain distinct from student two-initial avatars. The student
  cards still have no selection/message action. No roster repository was invented.
  Profile panel/message behavior, invitation payloads and messaging subscription
  order are unchanged; E3 relocates only the profile owner (below). Coordination
  belongs to T4. Remaining detail orchestration belongs to later T3e units.

Tests cover legacy fixtures/replacement before and after migration, pure wall guards,
roles/order/references/explicit persistence and normalized baseline participant JSX
plus view wiring. Source comparison is not browser proof; interactions remain T8.

## Dormant teacher detail cleanup (T3e / E1–E2)

E1 removed only the unreachable, unexported `ActivityDetailView` definition and its
section heading. Baseline `7291d8c` AST bounds were lines 858–1279 in
`src/views/docente/AulasDocente.tsx`: its sole production identifier was the declaration,
with no import, call or JSX consumer across 116 production source files. The actual
activity-tab JSX renders `TeacherActivityDetail`, whose grading drawer and local
setter path are unchanged. E1 retained the local `GradingPanel` for separate review.

E2 removes only that now-unreferenced, unexported `GradingPanel` and its section
heading. Against E1 commit `c3618f2`, an independent production AST scan again found
116 sources and exactly one `GradingPanel` identifier: its declaration at line 1389,
with no unrelated live namesake, import, call or JSX consumer. AST-derived bounds
are the heading at line 1387 through the function end at line 1576 (EOF). E1 had
removed its only caller; neither dormant definition remains after E2. Active
`TeacherActivityDetail` and `TeacherGradingDrawer` are not replaced or extracted.

`classroomDeadCode.test.ts` checks both names' absence in production ASTs (excluding
tests/test fixtures), resolves actual returned JSX consumers without pinning them to
the page, and compares normalized active grading callback/drawer source against the
baseline. E2 additionally resolves the drawer's actual declaration and local save
callback, guarding against a same-named substitute. Existing E1 tests remain intact.
These are structural checks, not browser interaction or full runtime reachability
proof. Profile, callbacks, navigation, session fixtures and state/timer lifetimes are
unchanged. No import cleanup, persistence unification or behavior fix is included;
controller/UI-boundary extraction belongs to later units and browser acceptance
to T8. E1/E2 review and commits are parent-owned; E3 does not reopen them or close T3e.

## Active teacher profile ownership (T3e / E3)

`StudentProfilePanel` is now a named export of
`components/teacher/TeacherClassroomDetailProfile.tsx`. `AulasDocente` imports this
leaf directly; the public `index.ts` is unchanged and no UI barrel is introduced.
The leaf imports only React/useState, motion, the existing icons and the Toaster.
It has no repository, session, controller, feature-data or role-view dependency.
The independent 534-line panel remains a follow-up decomposition opportunity;
E3 does not split its responsibilities or redesign it.

### Preserved mock and lifetime contract

- `AulaDetail` still owns `selectedStudentProfile` and renders the panel only when
  truthy, inside the same `AnimatePresence`, with the same student and close props
  and no key. Plan/message state remains local to that conditional panel instance,
  not the page or session. Closing clears selection; a different student prop while
  still mounted does not gain a reset effect or a keyed remount.
- All seven initial states, risk branches (`ALTO`, `MEDIO`, fallback), chart arrays,
  cognitive/report copy, DUA badges, icon choices and modal markup are unchanged.
  The unused `foxyInsight` and existing `student: any` contract are retained too.
- Plan generation still uses one uncancelled 2000 ms timer with the exact generated
  four-step plan and setter ordering. Sending activates the edited text; discarding
  clears plan/status/text/editing; completion clears status/plan and shows the same
  success toast. No cleanup, persistence, overlap guard or behavior fix was added.
- Contact still selects the original risk-specific suggested message before opening
  its local modal. Sending only shows the success toast and closes that modal; it
  does not dispatch through messaging. Closing the message modal does not clear
  its draft. Existing textarea edits, buttons and parent close callback are intact.

### Review evidence and limits

Baseline `19a4353` contains the local profile at `AulasDocente.tsx:858` and its
conditional consumer at line 536. `classroomComposition.test.ts` characterizes
that body/JSX, seven states, six callbacks, uncancelled timer and resolved rendered
consumer before/after relocation. Whole-body source fingerprinting includes comments;
normalization ignores only CRLF and trailing line whitespace to match the target leaf.
Ownership checks resolve the direct import to the new declaration, not a namesake.
Tests read only the available page/profile sources, never future shell/controller files.
Existing dead-code and participant tests are retained without changes.

Remaining teacher source matches the baseline prefix with only the direct leaf import
added and the profile section removed. The new leaf matches the preserved full-target
leaf byte-for-byte; ownership adaptations versus the old local definition are its named
export, dependency imports/Toaster path and auxiliary-panel comment. The relocation's
addition/deletion exceeds the advisory 400-line heuristic as one coherent unit with
characterization and documentation, not a size-driven rewrite.

These are passing static/source checks, not behavioral RED or browser proof. Profile
open/close, plan generation/edit/activation/completion, message modal, animations and
state lifetime still require UI verification in T8. Build, native review and commit
remain parent-owned; E3 implementation evidence alone does not close E3 or T3e.

Run `npm run test` for Node/tsx legacy characterization, live compatibility,
profile source composition and membership/submission/creation/activity/wall coverage.
Browser delivery guards, rendering and navigation still require UI verification.
