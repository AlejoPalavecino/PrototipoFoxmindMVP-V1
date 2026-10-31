# P8 progress: three independent measures

The existing classroom shell now has **Progreso** for teachers and **Mi progreso** for students. Teacher member summaries also show current or preserved historical progress, followed by the unchanged submission/grade history.

## Read-only API

| GET | Authorized view |
|---|---|
| `/classrooms/:classroomId/progress` | Teacher: current class and current students. Current student: only their own progress. |
| `/classrooms/:classroomId/members/:studentId/progress` | Owning classroom teacher: one enrolled or former student's preserved records. |

Both routes require the real verified session and server-side classroom relationship. Archived classrooms permit these reads. Removed/departed students lose access immediately. A student cannot select a peer's progress; teacher history does not grant student access. Query selection, request bodies, write methods and attempt-editor capabilities are not accepted. Responses are private/no-store.

GET uses the existing transaction and classroom lock. It never creates an obligation, attempt, grade, audit, notification or membership. No migration or dependency is added.

## Calculation rules

| Measure | Source and rule |
|---|---|
| Completion | Published activities and persisted expected student/activity pairs. One confirmed submission makes one delivered pair; drafts do not. |
| On time / late | First confirmed submission ordered by persisted receipt, attempt number and ID. Use its saved applied deadline and late snapshot, not the current deadline, clock or latest attempt. |
| Pending resubmission | Additional state. Reopening preserves the previously delivered count and all original attempt history. |
| Individual average | Equally weighted effective published activity grades, including published zero. Pending/private/absent work is excluded, not zero. |
| Class average | Mean of exact individual means for current students with a published grade. Never pool grade rows or average already rounded displays. |
| Taught topics | `TAUGHT` topics / all classroom topics. This changes neither completion nor academic performance. |

Exact rational helpers from grading are reused. Round half up only at the final two-decimal display boundary. For example, `8.34` and `8.35` average exactly `8.345`, displayed `8.35`. Individual grades `10,10` and `4` give class average `7.00`, not `8.00`.

An expected count of zero has a null percentage and exactly `Sin actividades pendientes de seguimiento`. Positive all-delivered work shows `100.00%`. No applicable published grade has a null average, distinct from a published `0.00`.

## Eligibility and history

Current metrics use membership `EXISTS`, not a join over every historical membership period. Re-entry therefore reuses preserved obligations/grades without multiplying them. Departure/removal excludes the student from current class totals but preserves the separate teacher history.

Persisted P7 eligibility remains authoritative: already expired work is consultation-only until explicitly enabled; absence-created open work becomes expected at re-entry, while absence-created expired work does not. A withdrawn unstarted activity is excluded from the visible published-work denominator. Reading progress never assigns work or recomputes these decisions.

Only an effective published grade whose submitted attempt belongs to the same obligation and activity is included. Publishing a later lower grade replaces the prior value; an unpublished newer draft does not. A correction to the effective grade updates performance; correcting a historical grade does not make it effective.

## Existing UI behavior

Three labeled sections keep completion, performance and taught topics distinct. Explicit refresh clears retained values before loading; failures show an error and visible retry, not stale success. Changing scope aborts the previous request. Current and historical summaries capture `member.studentId` in client state without changing the old summary DTO.

Students receive no peer list, class average, private grading feedback, answer keys or teacher audit. Teacher history is labeled as excluded from current indicators. The existing responsive shell, Plan, Activities and old summary history are preserved.

## Verification

Focused calculation/SQL/HTTP/proxy/client tests are in `tests/p8-progress*.test.mjs`. The actual production-Next journey covers loading, clean admitted own/class/historical views, explicit refresh failure/retry, mobile layout, real publication/reopening, database/private-storage/API restart and fresh access denial. Its test330s/child360s ceiling and API30s/Next180s build ceilings are unchanged.

See the [attributed work record](../../work-log/2026-10-18-p8-t4-progress-worker.md) for observed results and historical failures. These are T4 own checks, not final whole-P8 independent acceptance or P9.
