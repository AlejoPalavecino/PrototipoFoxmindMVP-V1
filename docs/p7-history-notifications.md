# P7 attempt history and academic notifications

Teachers can enable one new pending attempt only after a real submission. Students revise a prefilled independent draft; previous deliveries, file custody and effective-grade pointers remain unchanged. This implements P7 participation, not P8 correction, scoring or result publication.

## Reopen and consult

1. Open **Actividades → Ver entregas recibidas** for any of the three activity types.
2. For a current student with a received submission and no pending draft, select **Habilitar otro intento** and confirm.
3. Optionally set a future individual deadline in the classroom timezone. Closed reception requires it. Ambiguous local times require an explicit occurrence; nonexistent times are rejected.
4. The student opens **Ver mis intentos** or the notification, reviews the history and selects **Continuar borrador**.
5. Explicitly transfer editing control, revise and confirm a new submission. Creating or transferring the draft is not a delivery.

The general deadline applies when no individual deadline is selected. A later general extension takes precedence only when it grants more time. Earlier receipt/deadline/late snapshots remain immutable. Existing published effective grades and delivered status remain effective while the new draft is unfinished.

## Data boundaries

- New answer rows and selection links prefill the latest submitted answers. No correction or grade is copied.
- Practical work references previously approved files; blobs, original custody, quota and original attempt links are not replaced or deleted.
- Teacher history includes former students and safe pending metadata. Private pending answers/files remain inaccessible to teachers. Students require current membership and may consult only their own history.
- Archived classrooms allow authorized consultation, not reopening or editing. A teacher's reopening grants no student editor capability.

## Public routes

| Method and classroom-relative route | Purpose |
|---|---|
| `GET /:room/activities/:activity/history` | Current student's own newest-first history and delivered/pending state. |
| `GET /:room/activities/:activity/history-submissions` | Owning teacher's all-type submitted history and safe pending metadata. |
| `GET /:room/attempts/:attempt/history` | Own historical attempt, or owning teacher's submitted attempt. |
| `POST /:room/activities/:activity/reopen` | Exact `{ revision, studentId, deadline, confirm: true }` body under existing P3/CSRF and classroom CAS locks. |

The existing practical `/submissions` and `/receipt` routes retain their previous contract. New history requests carry no editor capability. Existing answer, practical file and submission requests still require the student-owned editor token/epoch.

## Notification events

| Locked source transition | Recipient |
|---|---|
| Explicit publication, including later republication | Current students. |
| Actual published deadline/reception change, including a content-save path | Current students. |
| First-submission authorization | That current student. |
| Reopening after a received submission | That current student, targeting the new attempt. |
| Confirmed practical/questionnaire/evaluation submission | Owning teacher, targeting the submitted attempt. |

Events are inserted inside their source transaction. Source locks/CAS prevent duplicate retries, while distinct later changes remain distinct notifications. Draft saves, identical deadline saves, starts, autosaves, editor transfers and uploads do not generate these events. Academic events send no email.

List, mark-read and open revalidate the same current recipient/classroom/actual published-target access predicate. Reopened attempt targets require ownership; received-submission targets require the owning teacher and actual submitted status. Withdrawn/private/foreign targets remain inaccessible. Archived consultation, newest-first order and idempotent read timestamps remain supported.

Existing WALL notification rows and `{ classroomId, postId, replyId }` open payloads remain unchanged, including tombstone consultation. Academic targets use `{ kind, classroomId, activityId, attemptId }`; the UI routes them to Actividades and history/session rather than Muro. Mobile navigation keeps the selected tab visible.

## Verification and scope

See the [attributed worker record](work-log/2026-10-18-p7-history-worker.md) for observed checks, failures, bounded corrections and retained external evidence. Full P7 independent acceptance and publication belong to the coordinator's later T6–T8; this unit does not claim them.
