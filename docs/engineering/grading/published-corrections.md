# Correct a published final grade without rewriting history

The classroom teacher can rectify the final grade of an already published attempt. The server records the previous and new grades, required reason, authenticated actor and timestamp in the same transaction as the grade change, revision advance and student notification.

## Teacher workflow

1. Open a submitted attempt's existing correction view.
2. In the published-grade rectification section, enter a final grade from 0 to 10 (at most two decimal places) and a reason.
3. Review the previous/new grade and reason, then explicitly confirm. Cancellation writes nothing.
4. Success appears only after a fresh audit read and grading refresh succeed. An error requires reloading the current state; do not blindly repeat an old revision.

Archived classrooms allow teacher-only audit consultation, not correction. The teacher retains academic history after student departure. Students never receive the audit or its reason/actor; they receive the corrected safe result and a `GRADE_CORRECTED` notification, subject to current membership.

## Public boundary

| Route | Operation |
|---|---|
| `GET /classrooms/:room/attempts/:attempt/grade-corrections` | Teacher-only current published grade and full chronological audit. |
| `POST /classrooms/:room/attempts/:attempt/grade-corrections` | Exact `{revision,newGrade,reason,confirm:true}`; final grade is decimal text, reason is nonblank text up to 5000 characters. |

No client actor, previous grade, time, scoring criteria or effective pointer is accepted. Existing authenticated session, CSRF, current teacher, classroom-state and revision checks apply. Concurrent requests with one revision admit one correction; stale retries add no duplicate audit/event. Event failure rolls back every change.

## Preserved evidence

- The same published grade identity and original publication timestamp remain.
- Historical corrections never replace the effective-grade pointer. Correcting its current target changes the value used by subsequent averages without adding another effective grade.
- Prior audit, student answers, receipts/deadline/late snapshots, files, question points/feedback, overall feedback and locked activity content remain unchanged.
- No schema, dependency, email, answer-key release or P9 behavior is introduced.

## Verification

Run the four `tests/p8-corrections*.test.mjs` focused service/HTTP/proxy/client files after the API build. The separate `tests/p8-corrections-integration.test.mjs` uses owned services and production Next to prove the captured-email/account, browser correction, safe student result, notifications, restart and access-revocation boundaries. Own checks are not whole-feature independent acceptance.

`tests/p8-corrections-remaining-integration.test.mjs` is the distinct Q/E/restart continuation after the initial actual run's TP success and questionnaire grading-refresh429. It does not replay TP or turn the original failure into a passing run. It captures safe response metadata and permits one visible reload only after an observed valid Retry-After; a rejected refresh must not show success. The work record retains both executions and their separate outcomes.

`tests/p8-corrections-e-final-integration.test.mjs` is the explicitly authorized E-only missing-proof continuation: the real corrected-zero notification result, data/API/storage restart, membership revocation and signed-out denial. It repeats no TP/questionnaire journey and changes no product or check budget. The three fixtures share the same notification-result admission preparation: a real429 with valid Retry-After1..60 permits one wait and visible notification reopen; only the subsequent actual200 can support clean result assertions. Their historical executions remain separately attributed in the work record.

The assigned T3 own proof passed through the original TP journey, the later distinct questionnaire journey and the E-only final run4PASS, with focused15PASS, affected68PASS and unchanged source/build provenance. This is not a retrospective all-three-type passing run or whole-P8 independent acceptance. See [the attributed work record](../../work-log/2026-10-18-p8-t3-corrections-worker.md) for exact commands, historical failures, the authorization boundaries and final persistence/access evidence.
