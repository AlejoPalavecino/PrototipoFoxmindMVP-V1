# Participation and editor control (P7 T2)

Current students can start their initial attempt, resume the same draft, consult confirmed state, and explicitly transfer editing to another tab or device. Teachers can authorize a first submission for historical consultation-only work. This unit does not implement attachment writes, answer autosave, submission, additional attempts or P8 grading.

## Student flow

- **Trabajo práctico:** **Abrir trabajo práctico** performs an explicit authenticated mutation before exposing eligible instructions. Ordinary detail/session and raw file reads cannot bypass that first-start boundary. Historical consultation-only students can read without creating a fictitious attempt.
- Closed reception does not prevent instruction consultation: an explicit first TP opening records the real DRAFT/content lock but returns no editor and no submission. Archived classrooms remain strictly write-free and permit instruction consultation without creating an attempt, because their content is already immutable.
- **Cuestionario / Evaluación:** consultation is read-only until **Comenzar**. Teacher preview never starts an attempt.
- An existing attempt is resumed, never incremented or replaced. Submitted attempts are consultation-only.
- The first acquisition returns a random capability only to that requesting tab. Other reads/tabs/devices initially receive consultation without a secret.
- **Transferir edición a esta pestaña** requires explicit confirmation and warns that unconfirmed changes are not transferred. It restores confirmed data, rotates the hash and epoch, increments the attempt revision, and keeps the same attempt identity.
- Capabilities live only in mounted tab memory. Reloading/closing does not promise recovery of editing ownership or unconfirmed changes. The UI offers no fake save/upload/submit controls while those units remain pending.

## Event-time obligations

Publication and successful actual enrollment call the same transaction-only helper while holding the existing classroom lock. Membership jobs remain intact; no polling job or lazy read reclassifies eligibility from today's deadline.

| Event | Rule |
|---|---|
| Publication to current members | Record assigned work once. |
| First enrollment | Existing undated/future activities are expected; already expired activities remain consultation-only even when late reception is allowed. |
| Actual re-entry after departure/removal | Preserve old rows/history; record missing absence activities as expected only when undated/still open. |
| Republication/general extension | Do not overwrite previous eligibility decisions. |
| Teacher first authorization | Current roster, published consultation-only activity, future individual deadline, explicit actor/reason/time; creates no attempt or submission. |

Actual membership periods distinguish first entry from re-entry. No last-activated field is invented and no historical retained-data backfill is performed.

## Interfaces

Paths are under `/api/v1/classrooms/:classroomId` and preserve repeated P3 authentication, verified-account/current-membership/archive authorization, mutation budget, bounded same-origin CSRF transport and private no-store responses.

| Method / path | Exact JSON body |
|---|---|
| `GET /activities/:activityId/session` | None; safe consultation/session state. |
| `POST /activities/:activityId/start` | `{}` |
| `GET /activities/:activityId/eligibility` | None; teacher current roster. |
| `POST /activities/:activityId/authorize-first` | `{revision,studentId,deadline}` |
| `POST /attempts/:attemptId/transfer` | `{revision}` |

`deadline` uses T1's `{local, offsetMinutes?}` classroom-zone minute resolver, including DST gap rejection and explicit repeated-time occurrence selection. It must be future as observed after transaction locks. Existing methods and request headers retain their previous shapes; the new optional client `attempt` method supports `X-Attempt-Editor` / `X-Attempt-Epoch` for attempt writes without leaking them onto ordinary requests. Transfer itself is authorized by current ownership plus explicit confirmation, not possession of the old tab's token.

The exported transaction-only `resolveAttemptContext` and `assertAttemptWrite` are the future attachment/answer write seam. They do not perform ingress admission or invent session validation. They recheck classroom/owner/current membership/publication/expected/DRAFT/reception under locks; token hash and epoch authorize, while an optional decimal revision separately enforces compare-and-swap. Future file operations must rerun this check after external I/O without sending a stale answer revision.

## Deadline policy

The pure reception helper uses server time freshly observed after the relevant locks. At equality, receipt is late or closed; no deadline is on-time. Starting, opening or uploading never reserves on-time receipt. The later applicable general/individual deadline wins, so extending the general deadline cannot shorten an authorized individual window. Consultation remains separate from reception. No arbitrary duration timer or previous submitted-snapshot rewrite is introduced.

## Evidence and next unit

See the [worker record](work-log/2026-10-18-p7-participation-worker.md) for exact RED/GREEN, builds, real-browser and affected-contract results, including any failures. These are own checks, not independent whole-P7 acceptance. Next: T3 private TP attachment drafts and explicitly confirmed submission, reusing the transaction-only write seam. Production attempt uploads remain denied until that integration exists.
