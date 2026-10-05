# Classrooms mock boundaries

Import classroom/submission types, `classroomRepository`, `joinClassroomByCode`,
`submissionRepository`, `deliverSubmission` and `getClassroomColorTheme` from
`src/features/classrooms` (the public `index.ts`). Teacher creation/list composition,
activities, muro and messaging workflows remain outside this boundary.

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

Run `npm run test` for Node/tsx legacy characterization, live compatibility and
membership/submission operation coverage.
Browser delivery guards, rendering and navigation still require UI verification.
