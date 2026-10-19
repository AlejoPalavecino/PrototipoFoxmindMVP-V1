# Explicit grade publication and safe results

T2 releases a saved correction only after a separate teacher confirmation. Saving privately never publishes, notifies or changes the effective grade. Published zero is valid; pending manual points or an absent assignment grade block publication.

## Public operations

| Operation | Contract |
| --- | --- |
| `POST /classrooms/:room/attempts/:attempt/publish-grade` | Exact `{ "revision": "…", "confirm": true }`; existing authenticated teacher, active classroom and revision CAS. No client-provided grade or editor capability. |
| `GET /classrooms/:room/attempts/:attempt/result` | Own current student or actual classroom teacher's historical record. Archives allow consultation. Before publication returns only pending status and attempt ID. |

Publication checks original saved question coverage and non-null finite integer rational pairs before using the teacher preview. Manual values must represent at most two decimal places and remain within available points. The server recalculates objectives and the final scale with the existing exact scoring helpers, without intermediate rounding. Published consultation uses the persisted final grade, not a fresh private preview calculation.

## Atomic source transition

The existing classroom lock and expected revision serialize publication. One transaction updates the saved grade and exact question scores, publication timestamp, effective-grade pointer and classroom revision, then inserts one `GRADE_PUBLISHED` event addressed to the actual student. Any failure rolls back all those changes. Replays cannot publish again or duplicate the event.

A new published attempt replaces the effective grade even when lower. A private correction or pending resubmission preserves the previous effective pointer. Historical published results remain readable with `isEffective: false`. T3 owns reasoned correction and teacher-only audit; T2 does not implement it.

## Privacy and navigation

The result DTO explicitly projects submitted answer text, selected option IDs/text, earned points, feedback, persisted grade/date and authorized own attachments. It never spreads the teacher DTO or returns correct flags, scoring rules, full option lists, unselected keys, private draft feedback, audit rows or private actor IDs.

Grade notifications use a separate selector so existing WALL/P7 notification shapes stay unchanged. List, read and open share the complete grade → same attempt → activity → obligation → recipient ownership and current membership predicate. Forged same-activity targets or revoked recipients cannot mark an event read. Historical publication is permitted after departure, but the event remains invisible without current access. Events do not send academic email.

The existing history hosts the student result panel, and the existing academic notification navigation opens the exact attempt. The teacher editor disables publication for unsaved, unpersisted, pending, published or archived corrections. Confirmation never implicitly saves local edits.

## Verification

Focused publication SQL/transport/client tests are in `tests/p8-publication*.test.mjs`. The canonical actual all-type journey is `tests/p8-publication-integration.test.mjs`; its first run passed questionnaire/evaluation but stopped during pre-existing TP opening refresh admission. A separate authorized TP-only journey, `tests/p8-publication-tp-integration.test.mjs`, passed publication, real file retrieval, restart and access revocation without repeating those passed types.

Both fixtures reuse `p8-publication-browser-helpers.mjs` to require actual successful session/start/refresh responses. Only an observed429 permits one bounded Retry-After wait and visible reopen; existing explicit editor transfer restores control when needed. No token injection, policy relaxation or silent request retry substitutes for the UI. The distinct TP run needed no admission recovery. The pre-existing start-before-refresh failure is an advisory, not a T2 source modification.

Attributed commands, original failures, targeted proof and retained evidence are in [the T2 work record](work-log/2026-10-18-p8-t2-publication-worker.md). Whole-P8 acceptance and publication remain the coordinator's responsibility.
