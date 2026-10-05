# Classrooms mock boundaries

Import classroom/submission types, `classroomRepository`, `joinClassroomByCode`,
`submissionRepository`, `deliverSubmission` and `getClassroomColorTheme` from
`src/features/classrooms` (the public `index.ts`). Teacher list/creation components,
`useTeacherClassroomCreation` and pure creation operations also use this boundary.
Activity contracts, synchronous ownership, creation/assignment mappings and rendered
role activity lists also use this boundary. Muro and messaging workflows remain outside
this migration.

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

Active `TeacherActivityDetail` grading still updates only its local setter; the
legacy `AulasDocente` detail implementation still explicitly replaces shared data.
These persistence differences are intentional preservation, not a unified policy.

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
existing owners. Active `TeacherActivityDetail` remains local-only grading; dormant
`ActivityDetailView` and the remainder of the teacher detail suffix are untouched.
Student delivery still uses T2's synchronous submission operation and local status map.

Source comparison against `657b6f3` preserves wizard validation, resets, generated copy,
material/library upload and 1800/1600 ms uncancelled timers. Final creation still calls
parent assignment before its success toast and reset/close. The modal remains mounted
under teacher detail, including its existing `isOpen` early return and file refs; neither
list owns state or effects. Node tests cover pure contracts and shared compatibility,
not browser render/lifetime/navigation/toast proof. UI verification remains pending T8.

Run `npm run test` for Node/tsx legacy characterization, live compatibility and
membership/submission/creation/activity operation coverage.
Browser delivery guards, rendering and navigation still require UI verification.
