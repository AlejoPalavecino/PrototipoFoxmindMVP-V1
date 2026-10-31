# Practical assignment private drafts and receipts

P7 T3 adds private student file drafts and explicitly confirmed TP submissions. It extends the accepted participation service; it does not implement correction, grading, result publication, questionnaire answers or additional attempts.

## Student flow

1. Open a published practical assignment. The actual first instruction opening creates its initial attempt and locks the instructions, including when consultation is read-only after reception closes.
2. With editing control, select a file and explicitly upload it. Selection, upload and confirmed security approval are distinct states. Recover only server-confirmed attachments after reopening; editor capabilities remain in the mounted tab's memory.
3. Remove a draft attachment to deselect it, then upload another file if replacing it. Confirmed bytes, custody proofs, quota and prior attempts remain conserved. Canceling an unfinished reservation prevents later confirmation without prematurely releasing its storage reservation.
4. Explicitly confirm submission. Cancel leaves the draft unchanged. Mandatory assignments need at least one approved file; optional assignments allow a confirmed zero-file submission. Submitted attempts become read-only and display a receipt, not a grade.

## Boundaries that matter

| Concern | Enforcement |
|---|---|
| Private files | Existing P3 cookies, admission, Origin/CSRF and repeated transactional authentication remain in force. A teacher cannot read a student's unsubmitted files. Actual classroom ownership, not a global role, controls teacher receipts. |
| Single editor | `X-Attempt-Editor` and `X-Attempt-Epoch` are required for TP mutations and file writes. Every existing P4 I/O authorization recheck is preserved. File checks do not use unrelated answer/upload revision CAS. |
| Confirmed recovery | The optional production ready-transition callback inserts the selected attachment and increments attempt revision in the same successful readiness/scan transaction. Retrying an already-ready, deliberately removed file never relinks it. |
| Limits | At most five selected files plus active unfinished reservations under the same classroom/attempt locks. Each file may be up to 50 MB, subject to available classroom quota; there is no additional aggregate cap. Completed but unselected custody does not consume an active slot. |
| Security proof | Selection is inserted only after actual ready/upload/validation/scan and same-digest proof. Pending or failed active uploads block submission until canceled. No incomplete-file trigger or scan gate is bypassed. |
| Receipt time | The original HTTP request receives a server-only WeakMap timestamp at complete JSON-body receipt. Current authority and current deadline configuration are checked after all locks, but submitted time and timeliness use that captured receipt. A complete body received before deadline remains on time across later lock waits. Equality or later is late or rejected according to current reception policy. Click, upload start, device clock and client timestamps never reserve timeliness. |
| Conservation | Ready-file removal only unlinks the current draft. It does not schedule Library deletion, set `blob_deleted_at`, release quota or retarget immutable file custody. Confirmed drafts never expire; incomplete cleanup remains the existing 24-hour policy. |
| Submission | Locks selected file proofs and pending reservations, rechecks current membership/archive/publication/expectation/editor/revision, then atomically sets submitted status, trusted receipt, applied deadline, late flag and next revision/epoch. Concurrent duplicate submissions cannot both succeed. No grade tables are written. |

## API additions

All paths below are under `/api/v1/classrooms`. Mutation bodies are exact JSON objects; extra owner, timestamp or policy fields are rejected.

| Method and path | Body / result |
|---|---|
| `POST /:classroom/attempts/:attempt/attachments-remove` | `{ revision, fileId }`; current editor required. |
| `POST /:classroom/attempts/:attempt/submit-practical` | `{ revision, confirm: true }`; current editor required. |
| `GET /:classroom/activities/:activity/submissions` | Teacher-only submitted receipt list; no drafts or editor secret. |
| `GET /:classroom/attempts/:attempt/receipt` | Teacher-only submitted TP detail with safe file DTOs; no grading controls. |

The existing file reservation/content routes carry `purpose: attachment` and the exact attempt target. The dedicated client adds validated editor headers to attachment metadata and binary PUT requests. Existing plan/material/instruction clients and ordinary classroom requests retain their prior request shapes.

The `submission-receipt.ts` helper is intentionally reusable by future T4 submission commands. Direct domain callers capture trusted method-entry receipt before waits; HTTP callers already carry complete-body receipt. File upload authorization still uses its current server deadline at each recheck rather than reserving permission from an earlier upload start.

## Evidence and scope

- `tests/p7-practical*.test.mjs` cover controlled SQL/domain, ingress, transport, atomic ready callbacks, races, conservation, privacy, receipt time and real browser journeys.
- The five-by-50 MB acceptance boundary uses an explicitly controlled ready-proof metadata fixture. It is not evidence of 250 MB passing actual storage/ClamAV scanning.
- The separate actual journey uses real small PDFs, private S3 storage, actual ClamAV, actual P3 registration/captured email/browser/API/SQL, API restart recovery, cancel/remove/replace, two-tab transfer during scanning, confirmed submission and teacher download.
- The targeted timing correction journey checks complete-body receipt versus delayed bodies and held locks through real HTTP/P3 with owned SQL deadline/lock fixtures. See the attributed work record for observed results and historical failures.
- Original passing post-lock receipt assertions were based on incorrect coordinator technical guidance; the specification was not changed. The correction retains that history rather than relabeling it accepted product behavior.

Whole-P7 independent verification and delivery remain coordinator-owned. T3 does not claim P7 completion or native approval.
