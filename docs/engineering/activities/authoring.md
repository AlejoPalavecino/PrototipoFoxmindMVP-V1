# Authoring activities (P7 T1)

Teachers can prepare private drafts, resume them, preview without starting an attempt, and explicitly publish assignments, questionnaires and evaluations in the existing **Actividades** classroom tab. This is the authoring unit of P7, not acceptance of attempts, submissions or P8 grading.

## Quick path

1. Enter a classroom as its teacher, select **Actividades**, choose a type and create a private draft.
2. Complete the title, unit/topic and requirements. Save confirms persistence; publication is a separate confirmation.
3. Preview the saved content or publish it. Before participation, a published activity can be withdrawn and edited. After participation, only organization and permitted deadline/policy relaxations remain editable.

Invalid question rows are rejected even in drafts because the relational schema requires a nonblank prompt and positive, two-decimal points. The form retains unconfirmed invalid content visibly; closing/reloading is not durable offline storage. A newly created empty private activity can be resumed without claiming that an invalid question was saved.

## Public interfaces

All paths below are under `/api/v1/classrooms/:classroomId`. The existing Next proxy preserves same-origin transport, private no-store responses, bounded JSON, session-bound CSRF, Origin and ingress admission. The API repeats actual P3 authentication under the user lock and acquires the existing classroom lock/revision.

| Method and path | Purpose |
|---|---|
| `GET /activities` | Teacher draft/published/withdrawn list; current students see published activities only. |
| `GET /activities/:activityId` | Authorized detail, explicit safe student projection with no answer key, private grade or editor state. |
| `GET /activities/:activityId/preview` | Teacher-only saved-content preview; never starts an attempt. |
| `POST /activities/deadline` | `{local}` wall-clock minute resolution in the fixed classroom IANA zone, including DST occurrence choices. |
| `POST /activities` | Exact `{revision,operation}` authoring mutation. |

Operations use exact discriminated shapes:

```text
create   {action,type}
save     {action,id,payload}
publish  {action,id}
withdraw {action,id}
metadata {action,id,title,unitId,topicId}
deadline {action,id,deadline,allowLate}
```

`payload` contains exactly `title`, `unitId`, `topicId`, `instructions`, `attachmentRequired`, `instructionFileIds`, `materialIds`, `questions`, `deadline`, `allowLate`. A draft may have an empty title and null associations; publication requires a title and a unit/topic belonging to that classroom and to each other. Assignment publication requires observations, approved instruction files, or both. Question-based activities require nonempty questions; choice questions validate option counts, correct-option counts and scoring-rule inputs. This does not execute scoring.

Question inputs contain exactly `type`, `prompt`, decimal-text `points`, `scoringRule`, `options`; options contain exactly `text`, `correct`. Development has no options/key; single-choice uses `EXACT` and exactly one correct answer; multiple-choice requires two or more correct answers and `EXACT` or `PARTIAL`. Student projections never include either `correct` or `scoringRule`.

## Time, content and file conservation

- A deadline is `null` or `{local: "YYYY-MM-DDTHH:mm", offsetMinutes?: number}`. The reusable `activity-time.ts` resolver discovers actual IANA offsets and round-trips each candidate. DST gaps are rejected. Repeated local times require an explicitly selected returned offset. UTC instants are stored; displays include the classroom zone.
- After `first_started_at`, an existing deadline may stay unchanged or extend, but cannot be removed. An initially undated activity stays undated. Late reception may only become more permissive. Prior submissions are not modified or reclassified.
- Full content saves and withdrawal are rejected after participation. Separate metadata/deadline commands never rebuild questions/options or change instruction/material identities.
- Instruction upload uses the unchanged P4 file interface with `purpose: "instructions"`, classroom scope and exact `targetId: activityId`. Files must pass the actual upload/content-validation/scan same-digest gate before linking. They are PDF/DOCX, at most 20 MB each. Existing plan/material request shapes are unchanged.
- Material links require active, ready Library material in the same classroom. Unlinking never deletes a file. Existing P6 material conservation and classroom archive/current-membership policies remain in force.

## Remaining phase work

The T1 student consultation is distinct from the attempt-taking route. Later P7 units must connect actual eligibility, attempt-start events (including assignment instruction access), single-editor, autosave, submission, reopening/history and activity notifications. No academic email, private correction screen or grade publication is introduced here.

## Verification

The worker record lists exact observed commands and preserves initial failures. Controlled PostgreSQL fixtures test the domain separately from real P3 proof. The owned integration journey uses actual registration/captured verification email, production Next, private P4 services and real browser authoring; it does not seed SQL users as evidence of real authentication.

See [T1 worker evidence](../../work-log/2026-10-18-p7-authoring-worker.md) and [whole-phase tasks](../../../odd/tasks/p7-activities.md). Native approval and full P7 acceptance are not claimed by this unit.
