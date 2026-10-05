# Classrooms submission pilot

Import submission types, `submissionRepository`, `deliverSubmission` and
`getClassroomColorTheme` from `src/features/classrooms` (the public `index.ts`).
Other classroom flows remain outside this pilot.

## Contracts

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

`mockData.sharedSubmissions` and `updateSharedSubmissions` are live compatibility
exports from the same owner, not copies. Legacy writes are immediately visible on
feature reads and vice versa. Existing local UI snapshots do not auto-refresh.
Active `TeacherActivityDetail` grading still updates only its local setter; the
legacy `AulasDocente` detail implementation still explicitly replaces shared data.
These persistence differences are intentional preservation, not a unified policy.

Run `npm run test` for Node/tsx characterization and pure-operation coverage.
Browser delivery guards, rendering and navigation still require UI verification.
