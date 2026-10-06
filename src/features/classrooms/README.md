# Classrooms mock boundaries

Use `src/features/classrooms` (headless `index.ts`) for domain types, repositories,
pure operations and `getClassroomColorTheme`. Use `src/features/classrooms/ui` for
role participant/activity lists, `TeacherClassroomList`, `TeacherClassroomCreateFlow`,
`TeacherClassroomDetail`, `StudentClassroomDetail`, `StudentClassroomList`,
`StudentClassroomJoinDialog` and the teacher creation/student membership hooks.
Detail hooks remain internal direct leaves. Invitation dispatch remains on the unchanged
`messagingStore` bridge; coordination changes belong to T4.

## Teacher detail controller (T3e / E5)

`useTeacherClassroomDetail(aula)` now owns the actual teacher detail's 24 states,
file ref, navigation effect and action callbacks. `TeacherClassroomDetail` calls it
unconditionally at the same mounted position. The body/modal compositions pass that
single return through `detail` to the existing presentation leaves. E9 gives student
detail its own controller; E10 extracts student listing while membership waits E11. The profile retains its direct leaf import and conditional, unkeyed mount.

| Contract | Preserved behavior |
|---|---|
| Session | One volatile module roster/curriculum owner; reads return arrays by reference. Curriculum replacement retains the exact supplied array, including empty arrays. No subscription or per-classroom partition. |
| Initialization | Teacher starts on `alumnos`; activity/submission reads stay lazy snapshots, roster/curriculum initialization stays eager. Curriculum copies unit records and completed-topic arrays while retaining topic references. Empty current units still yield `[undefined]`. |
| Page | List and selection remain page-owned. Creation replaces session curriculum before prepending to the captured page list; it does not publish to catalogue/membership. |
| Navigation | Task+subject wins over aula id even when lookup fails. Exact first matches remain case-sensitive. Activity title misses fall back to the first activity (or `undefined` for an empty list). The detail effect clears params with `setView('aulas', undefined)` and retains `[navigationParams, setView]`. |
| Actions | Topic suggestions, report prompt, invitation parsing/payload/reset, material upload/delete/filter and local activity prepend/session write retain their original bodies. Clipboard callbacks and two uncancelled 2000 ms timers now live in the invitation leaf. |
| Grading | The rendered active detail receives the hook's local submission setter, not a repository replacement. No persistence unification was added. |

### Verification and progressive target reconciliation

Before relocation, the baseline suite passed 88/88 and the focused current-symbol
characterization passed 21/21 (seven new teacher tests plus existing composition,
graph and dead-code tests). The teacher tests evaluate current controller statements
with fake hooks, then the actual hook body/public helpers after extraction. They
protect defaults, references, navigation branches, callback outcomes and normalized
source fingerprints; they do not execute React lifecycle or browser interactions.
Composition/dead-code tests additionally resolve the actual hook/profile/grading
symbols and their setter wiring. Existing profile/grading fingerprints remain intact.

The hook and session match the preserved corrected target byte-for-byte. E9 restores
`studentDetailInitialTab` and `resolveStudentClassroom` to their target modules;
student page navigation continues its original inline lookup until E11. The shared navigation payload already retains
its narrow `aulaId` field. Only the current teacher exports are public; do not add
future UI leaves or wildcard exports. Later closure must reconcile these deliberate
progressive omissions and page wiring against the untouched full target. Tests/docs
are intentional additions, not runtime target deviations.

Browser/lifetime acceptance remains T8. Build, native review and commits are
parent-owned; this structural extraction does not close T3e.

## Teacher materials presentation (T3e / E6)

`TeacherClassroomDetailMaterials` now renders **both** the plan PDF dialog and the
upload-library dialog. The page imports the leaf directly and passes the actual
`useTeacherClassroomDetail(aula)` return, without copying it or adding another hook
call. The leaf matches the preserved corrected target byte-for-byte; no public
barrel export or future shell is introduced.

- Each dialog retains its own `AnimatePresence` and visibility condition, original
  Spanish copy, motion props, close buttons, title/type inputs and upload handler.
- The leaf stays unconditionally mounted after `CreateActivityModal` and before
  the conditional, unkeyed profile and invitation leaf. All state, callbacks,
  snapshots and timers remain with their existing owners.
- The dormant upload entry and decorative drop zone stay dormant. This is not an
  extraction of `ClassroomBibliotecaTab`; its separate state/type/UI stay unchanged.

### Review evidence and limits

Two passing source characterizations were added before extraction and retained
unchanged afterward: complete per-dialog AST fingerprints and wizard/materials/
profile/invitation order. Their resolved consumer checks follow the actual leaf,
`detail` prop, controller call and consumed returned bindings, not just an import.
The existing whole teacher-return fingerprint is reconstructed from that resolved
leaf's JSX with controller-binding substitution, preserving unrelated tab, grading,
profile and invitation coverage rather than accepting a replacement hash.
Participant and dead-code tests now resolve through the controller identifier while
retaining their mounted-hook and local submission-setter assertions. The runtime
graph still requires eight UI exports and zero cycles; E6 adds no barrel entries.

These checks establish source/composition equivalence, not browser interaction or
state-lifetime acceptance. Build, native review and commits remain parent-owned;
browser plan/upload/profile interactions remain T8. E8–E11 and T3e closure are pending.

## Teacher invitation presentation (T3e / E7)

`TeacherClassroomDetailInvitation` renders the complete invitation dialog. The page
imports it directly and mounts it unconditionally after the profile presence boundary,
passing the same `aula` and single mounted controller `detail` return. Its own
`AnimatePresence` retains the original `isInviteStudentModalOpen` condition. The
327-line leaf matches the preserved corrected target byte-for-byte; no modal
aggregator, shell, public export, new state or messaging operation is introduced.

- Email/code tabs, email drafts and chips, optional note, all Spanish copy and motion
  props are unchanged. The participant toolbar opens the same controller flag.
- Invitation parsing, sending, state and reset ownership remain in the unchanged
  controller. Header/footer close buttons still clear email input, recipients and
  note; tab and copied flags do not gain new resets. Copy-and-close retains its
  separate original path.
- All three clipboard writes and their original toasts remain. Code/link feedback
  still uses exactly two uncancelled 2000 ms reset timers; no promise handling,
  cleanup, overlap guard or unmount cancellation was added.

### Review evidence and limits

Two passing invitation characterizations were added before relocation and passed
afterward: the complete returned JSX fingerprint and actual presentation-owner
clipboard/timer checks. Resolved consumer checks validate both `aula` and `detail`
prop bindings, unconditional mount, internal conditional presence, controller-return
bindings and wizard → materials plan/upload → profile → invitation order.

The whole teacher-return reconstruction expands **both actually resolved leaves**,
substituting controller bindings and the classroom prop. It retains the original
`1e633acb50d7bb8b11f8b5306a689335cef7a801d95f1cf1b9197216443665f8`
oracle rather than accepting a new expected hash. Existing controller defaults/send
characterizations, participant/dead-code tests and eight-export/zero-cycle guards
remain intact. Controller, session, activities, materials, profile and student
runtime owners are unchanged.

These are passing source/composition checks, not behavioral RED or browser proof.
Clipboard, invitation interactions and state lifetime remain T8; build, native review
and commit remain parent-owned. E8–E11 and final T3e closure are still pending.

## Teacher composition closure (T3e / E8)

The teacher page now wires the public `TeacherClassroomDetail` instead of its inline
`AulaDetail`. It retains list/selection, creation callback ordering and navigation;
its catalogue read uses the same feature owner behind the former live mock alias.
The page and all three new compositions match the preserved corrected target bytes.

| Owner | Responsibility and lifetime |
|---|---|
| `TeacherClassroomDetail` | One unconditional detail hook call, hero and tabs. Tab changes set the tab before clearing activity selection. |
| `TeacherClassroomDetailBody` | All six tab branches, roster filtering/selection and the active activity detail's unchanged local submission setter. No new state or effects. |
| `TeacherClassroomDetailModals` | Unconditional activity wizard, materials, conditional unkeyed profile, then invitation, with the same controller/classroom references. |

The hook's 24 states, ref, effect, callbacks and snapshot semantics are untouched.
Materials, invitation, profile and student runtime files are unchanged. Spanish copy,
conditional `AnimatePresence`, callback order, three clipboard writes and two
uncancelled invitation reset timers retain their existing owners and lifetimes.
Only `TeacherClassroomDetail` is added to the UI barrel (eight → nine exports);
body/modal compositions remain internal leaves, with no student exports added.

### Review evidence and limits

Baseline 101/101 and focused 30/30 passed. Owner-resolution adaptations also passed
30/30 before extraction, then 30/30 after it. All existing assertions are retained
against the actual page → public detail → body/modals → controller/leaf paths,
not a detached source owner. Whole-return reconstruction recursively expands the
resolved body, modals, materials and invitation and maps their controller/classroom
bindings. The original `1e633acb50d7bb8b11f8b5306a689335cef7a801d95f1cf1b9197216443665f8`
oracle stays unchanged. Reconstruction restores only one blank extraction-boundary
separator and the original spelling of an erased tab type assertion; it does not
replace runtime expressions, skip markup or accept a new expected hash.

These are source/composition checks, not behavioral RED or browser proof. Builds,
native review and commits remain parent-owned. Browser/lifetime acceptance remains
T8; E9–E11 and final accumulated T3e target reconciliation are still pending.

## Student detail composition (T3e / E9)

The mounted student page now renders `StudentClassroomDetail`. Its shell, six-tab
body, controller and render-local fixture factory match the preserved corrected
target byte-for-byte. Page selection, back, membership copies, messaging subscription,
navigation effect, listing and join dialog/handler are unchanged; E10–E11 own the
remaining page extraction. The headless default/helper are exported and characterized,
but the page does not yet use `resolveStudentClassroom`.

| Contract | Preserved behavior |
|---|---|
| State | Five detail states; `actividades`, grid, empty search, null active task and lazy activities initialized from one shared submission read for profile id 2. |
| Fixtures | Profile, curriculum, students and nested arrays/records are fresh each render, not shared teacher/session roster state. |
| Lifetime | One unconditional controller call before the activity early return. Activity selection unmounts hero/tabs/body, not the controller. Back clears only the active task; detail back remains page-owned. |
| Delivery | Read shared submissions, replace synchronously, then map local activities to `Entregada` only for the active task id. Selected task remains its old snapshot; a null task still replaces shared submissions but retains every local activity record. |
| Boundaries | No teacher/copilot activity synchronization, subscription or new persistence. The unused teacher detail hook UI reexport is removed after proving the two production UI consumers do not import it; the hook leaf is unchanged. Only the student detail UI export is added, retaining nine exports. |

Five passing student characterizations preceded runtime extraction. They execute
resolved current controller statements with fake hooks and reconstruct the actual
page → shell → body JSX. Original student fixture, delivery-handler, early-return,
whole-detail JSX and whole-page-body fingerprints remain unchanged. Existing teacher
oracles and participant filters/callback/messaging assertions remain intact through
actual owner resolution. Composition/graph checks follow mounted consumers and
require nine UI exports, headless/UI separation and zero detected runtime cycles.
These are source/fake-hook checks, not React lifecycle or browser proof. Build,
native review and commits remain parent-owned; browser/lifetime acceptance remains
T8. E10–E11 and accumulated target reconciliation are still pending.

## Student listing presentation (T3e / E10)

`StudentClassroomList` renders only the existing student header and classroom grid.
Its leaf matches the preserved corrected target byte-for-byte. The page passes its
unchanged `classrooms` snapshot, `setSelectedAula` and join-modal opening callback,
inside the existing `!selectedAula` branch and `AnimatePresence mode="wait"`.

- Spanish copy, card order, themes, course badges, progress, task metrics, teacher/
  next-class/grade/activity fallbacks and grid/card/progress motion props are unchanged.
  The root retains `key="grid"`; cards retain `key={aula.id}`. No search, filter or
  grid/list toggle existed in this listing, and none is added.
- The leaf has no state, effects, repository or messaging access. Selection, back,
  membership copies/subscription cleanup, navigation, join handler and join dialog
  remain in the page unchanged; their extraction belongs to E11.
- Only `StudentClassroomList` is added to the UI barrel (nine → ten exports). No
  membership hook, join composition or other future export is introduced.

### Review evidence and limits

Passing characterization covers populated and empty lists using actual resolved JSX
with fake elements: labels, metric fallbacks, themes, animation keys/props and callback
object identity. Branch resolution distinguishes the rendered JSX conditional from
its similarly named wrapper CSS ternary. These checks do not execute React lifecycle.

The existing whole-page-body test expands the actually mounted listing leaf and
maps its three parameter symbols to the supplied page expressions, checking the
original state-setter bindings and conditional presence. Its original
`c30e2f00fa92b004ee64d6b61037637872669fa923553020cbd030c845b11c1a`
oracle is retained, not replaced. The AST printer receives the original leaf source
so transformed nodes retain literal spelling. Existing detail, participant and
teacher oracles remain intact. Baseline and post-extraction focused counts remain
39/39 and full-suite counts remain 110/110.

These are source/fake-element checks, not browser/animation acceptance. Independent
build, native review and commit remain parent-owned; browser/lifetime checks remain
T8. E11 and final accumulated T3e target reconciliation are still pending.

## Student membership and join composition (T3e / E11)

`AulasAlumno` unconditionally mounts `useStudentClassroomMembership()` and passes
that single return to `StudentClassroomJoinDialog`. The page, hook, dialog and final
UI barrel match the preserved corrected target byte-for-byte. Selection, navigation
and back remain page-owned; detail, listing, fixtures and pure operations are unchanged.

| Contract | Preserved behavior |
|---|---|
| Lifetime | Three membership states stay mounted while detail or dialog visibility changes. Initial membership is a lazy array copy; mount refresh copies before subscribing to the existing messaging bridge and returns its exact cleanup. Notifications copy current membership, retaining record references. |
| Join input | The operation receives the unchanged code and captured UI snapshot. Rejection keeps modal, code and snapshot untouched. No timers, new subscriptions, backend or validation were added. |
| Duplicate | Exact Spanish info toast precedes close and code clear. No membership read or refresh occurs. |
| Success | Catalogue/generic results read and copy current membership, close, clear code, then show their distinct exact Spanish success toast. Generic storage duplicates still follow generic success. |
| Dialog | Cancel and X only hide it; typed code survives. Input value/change wiring and `disabled={!invitationCode.trim()}` remain unchanged. |
| Navigation | The existing headless `resolveStudentClassroom` retains the first exact id match behind a truthy `aulaId` guard. The effect keeps `[navigationParams, classrooms]`; back clears selection before its conditional `setView('aulas', undefined)`. |

### Review evidence and limits

Baseline was 110/110. Four passing membership characterizations preceded extraction;
the six-file focused set passed 30/30 before and after, and the final suite passes
114/114 without skips. Fake hooks/elements execute statements resolved from the actual
inline page or mounted hook/dialog. They protect lazy/mount/notification copies,
cleanup, page-lifetime selection, every join result, exact toast/reset ordering,
passed snapshot identity, rejection/duplicate non-refresh and cancel/code preservation.
Listing checks follow actual supplied callback symbols through the membership return;
participant checks follow the actual mounted subscription owner.

The original whole-page oracle
`c30e2f00fa92b004ee64d6b61037637872669fa923553020cbd030c845b11c1a`
is retained by expanding the resolved hook statements, dialog/list bindings and
navigation helper. Explicit AST anchors restore membership effect → navigation
effect → back → join handler → return order. The temporary 29/30 failure was a test
reconstruction mismatch: standalone effect printing had different indentation, so
string replacement silently left the helper call unexpanded. AST-position replacement
corrected only the test; no runtime or expected hash changed. Existing detail and
teacher source/state oracles remain intact.

These are passing source/fake-hook characterizations, not behavioral RED or browser
lifecycle/animation proof. Configured `tsc --noEmit` is non-strict. Independent build,
native review, commit and final accumulated T3 comparison remain parent-owned;
browser invitation refresh, interactions and state-lifetime acceptance remain T8.

## Public import boundaries (T3e / E4–E11)

The headless entry point must not transitively load UI components or hooks. The
separate UI entry point exposes exactly twelve current presentation/hook exports,
including both detail compositions, student listing/join, teacher creation and student
membership hooks. E11 adds only the join dialog and membership hook to E10's ten.
This split prevents
shared domain consumers from pulling role UI back into their dependency graph.
Feature internals import leaves, not the UI barrel. Existing shared wall/modal/detail
consumers stay on the headless boundary; the modal composition keeps direct profile,
materials and invitation leaf imports.

`classroomImportBoundaries.test.ts` checks the current tree for zero runtime cycles,
transitive headless/UI separation, exactly twelve UI exports and both role pages'
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

The page-mounted `useStudentClassroomMembership` still copies membership at
initialization, mount, successful joins and on `messagingStore` updates, returning
the same subscription cleanup. Invitation
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
calls `classroomDetailSession.replaceCurriculum` and prepends to its local list.
The detail hook still projects that module value on mount, including its existing completed-topic
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
  assigned fields. The teacher detail hook constructs it before the state updater as before, then
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
  session/local state stay in the respective mounted detail owners (teacher/student hooks). Teacher risk/DUA badges and
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

- The unconditionally called detail hook owns `selectedStudentProfile`; `AulaDetail`
  renders the panel only when
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
E3 tests read the available page/profile sources. E5 adds current controller symbol
checks; E6–E7 follow the single controller return through `detail`. None references
deferred shell or student-controller files. Existing dead-code and participant
coverage remains intact through the authorized identifier-resolution adaptations.

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
