# Confirmed questionnaire and evaluation attempts

Questionnaire and evaluation answers remain private drafts until the student explicitly confirms submission. This P7 slice never creates a correction, calculates scores or publishes grades.

## Student flow

1. Consult the activity's existing read-only question/option overview without starting an attempt. It shows safe prompts/options, not correct-answer keys or scoring rules. Press `Comenzar` explicitly to start the first attempt; the overview is then replaced by the taking controls rather than duplicated.
2. Edit development, single-choice or multiple-choice answers. Autosave runs after two seconds without changes and on question navigation.
3. Wait for confirmed persistence. Errors retain editable answers on screen and offer retry; closing or reloading does not guarantee recovery of unconfirmed changes.
4. Press `Enviar respuestas`. Pending saves must succeed before the confirmation is available. The dialog reports unanswered questions, warns that they earn zero points, and requires explicit incomplete confirmation when applicable. Canceling creates no submission.
5. A confirmed server receipt freezes answers and revokes editing control. Teacher review/publication belongs to P8, outside this implementation.

## Public API

All routes require existing real P3 session, current verified identity/membership, CSRF for writes and current classroom authority. Attempt writes also require `X-Attempt-Editor`, `X-Attempt-Epoch` and an independent current attempt `revision`.

| POST route under `/classrooms/:classroomId/attempts/:attemptId` | Exact JSON body | Outcome |
|---|---|---|
| `/answer` | `{revision, questionId, text, optionIds}` | One confirmed answer plus new revision; no submission |
| `/submit-answers` | `{revision, confirm:true, confirmIncomplete:boolean}` | Immutable receipt; independent server unanswered count |

Development text preserves plain multiline content exactly, permits clearing and has a 20,000-Unicode-character limit. Choice answers have empty text and only distinct options from their question; single-choice permits zero or one selected option. Foreign questions/options, mixed types and unknown fields reject without mutation. Saving one question per request preserves the existing 512 KiB ingress ceiling.

## Concurrency and timeliness

- Existing transaction-only classroom/activity/membership/attempt locks serialize saves, editor transfers and submission. Revisions prevent silently submitting an older confirmed draft after a conflicting save.
- The tab-memory save queue serializes requests, updates its revision only from confirmed persistence, and tracks each question's edit generation. An older acknowledgement never marks a newer edit saved. Focus reads do not overwrite pending edits or rewind the queue.
- If a response is lost after persistence, a confirmed refresh may advance the CAS revision without marking local changes saved. Reads arriving during a write wait for its acknowledgement before reconciliation; explicit retry persists the retained local intent. Older focus epochs cannot roll back a completed editor transfer.
- A second tab is initially read-only. Explicit takeover restores only confirmed data and warns that unconfirmed changes are not transferred. Capabilities never enter URLs, cookies, localStorage or sessionStorage. Epoch loss invalidates pending acknowledgements.
- Submission uses the server's complete-JSON-body receipt recorded on the original request, never a client timestamp or upload/request start. Current permissions/editor/deadline configuration are revalidated under locks. A body completed before the deadline remains on time if later processing waits cross it; equality is late or closed under the existing policy.
- No grade tables, effective-grade pointers, scoring rules or answer keys are written/exposed by this flow. Existing TP routes and file behavior remain separate.

## Proof and scope boundary

Focused tests cover controlled SQL rejections and persisted-state hashes, HTTP/proxy/client ingress and a deterministic generation-aware queue. The real journey covers actual P3/captured-email identity, production Next/API/PostgreSQL, both activity types and confirmed reload, alongside explicitly labeled network-controlled delay/failure cases. Small-file classroom setup uses existing S3/ClamAV proof; this is not a new file-capacity claim.

See [the attributed T4 record](../../work-log/2026-10-18-p7-questionnaire-worker.md) for exact command outcomes, failures, retained OS scratch and handoff. Full independent P7 acceptance and publication remain coordinator-owned.
