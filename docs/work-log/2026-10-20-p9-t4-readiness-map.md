# P9 T4 service recovery readiness — Read-only map

- Agent/actual task: /root/p9_scanner_root_cause, read-only T4 readiness explorer; not final acceptance Verify.
- Persisted by: /root coordinator; explorer did not edit repository files.
- Date:2026-10-20; authoritative session ID unavailable.
- Starting/ending inspected HEAD:b1f024a3eda682a3aa52dd6f5a5d3c61c7126f12 on codex/p9-local-validation. Parent subsequently committed T3 as3f0af33d6a56c3fae36d6138778ea3048c4fb7ea.
- Coverage:T4/S1,S2,S5,S6; status completed map only, no runtime proof.

## Outcome

Use two new330000ms test/360000ms child groups: service recovery and mail recovery. Existing owned pause/resume controls already work; no helper/runtime repair is demonstrated. Do not replay Home/control/joined/capacity proof.

## Service group contracts

- Reuse withJourney/public setup and current editor authority; no SQL identity/role/attempt seeds.
- Questionnaire DB failure: pause before editing/flush because mutations acquire fresh CSRF. Actual auth/csrf503 should prevent answerPOST entirely. Observe retained unsaved text, Error de guardado · cambios sin confirmar, explanatory error, absence of Guardado confirmado. Restore DB in finally before observer SQL; click Reintentar guardado then require real success/persistence. Do not reload away unsaved content. Relevant QuestionnaireAttempt.tsx17-24/33-69, questionnaire-draft.ts64-97, classrooms-ui/api.ts296-305, classroom-client.ts24-26.
- Product PostgreSQL limits1000ms and identity transactions1500/2500ms differ from observer runtime.db5s; never query observer while paused. Pausing before CSRF prevents queued academic writes from escaping.
- Practical file input Seleccionar archivo del trabajo; action Subir archivo privado. Storage/scanner failure should report Error · carga no confirmada, no ready attachment/download, submit disabled. Existing deadlines storage10s/scanner30s require explicit response/UI waits beyond default12s without changing330/360.
- Expected failedPUT503 SERVICE_UNAVAILABLE, readyfalse, uploadUPLOADING, scanERROR/rejectionPROCESSING_UNAVAILABLE, custodyreserved/lease cleared. Storage typically validationPENDING; scanner validationAPPROVED. FileService84-151, storage19-31/scanner6-33.
- Practical upload UI creates a NEW intent on each retry, unlike PrivateFilePanel. After restoration remove the failed pending row with Quitar filename, then retry the retained selection/new upload. Cancellation removes the active slot but retains its reservation/bytes until actual incomplete cleanup. Do not assert immediate quota refund. Relevant classrooms/practical-submissions.ts21-34/45-70/84-87 and files/store.ts97-102.

## Mail group contracts

- Verify actors/classroom before pausingMail; invite a fresh nonmember, not already enrolled world.S.
- InvitationPOST returns200 delivery:queued, not actualSMTP delivery. UI initially Invitación guardada para enviar…; refresh Actualizar aula. Queued/error/Correo aceptado para envío are existing feedback; do not invent person-delivered status.
- Observe job p5.invitation/invitationID/generation/PENDING/attempt_count>=1/last_error_codeP5_MAIL_UNAVAILABLE and available_at through read-only SQL.
- Restore exact ownedMail container/volume/bindings, then natural retry completion/captured invitation. Retry availability is failure completion+60s, tick5s; SMTP connect/greeting3s/socket5s/dispatch10s. No timeshift/manualdispatch/resend/worker replacement.
- capturedInvitation helper has15s window; call after natural retry, not immediately after first failure. Invitations.ts99-106/http315-318,346; delivery54-98/118-158/186-188; ClassroomView132-139/369-376.

## Integrity and proposed surfaces

Use full academic-table union. Failed safety-upload rows legitimately change, so compare academic invariants and accepted baseline file IDs/bytes separately. Do not hash new upload bookkeeping as if unchanged were required. Each pause gets finally restoration plus native owner cleanup. No restart to simulate recovery.

New writer surfaces: tests/p9-service-recovery-integration.test.mjs; tests/p9-mail-recovery-integration.test.mjs; docs/p9-failure-recovery.md; docs/work-log/2026-10-20-p9-failure-recovery-worker.md. One actual command per new file, sequential fail-fast. Each group forecasts4 owned containers (DB512MiB/storage768MiB/scanner4GiB/Mailpit), hostAPI/Next/browser; mail60-75s natural retry wait. No new build needed while current bytes reconcile.

## Verification and handoff

Explorer only read feature/spec/matrix/source/current controls/clients/upload/outbox contracts and historical map231-232; source maps corrected initial guessed-path searches. No tests/builds/Docker/browser/edits/Git mutations; cleanupN/A. Parent spot checked practical cancellation retaining reservation in practical-submissions.ts and files/store.ts. Engram345-346. skill_resolution: paths-injected. Preserve baseline429 handling, old outbox-unavailable and retained P4-local advisories as notPASS.

Next: bounded writer implements only these first proofs, no speculative product fix. Final whole-P9 Sol/xhigh and main publication remain pending; no deployment. Risk:none for passive map; pending unit items2,3,4,5.

## Superseding actual observation — Refresh assumption corrected

The first service group passed, while the first SMTP group stopped before natural retry at the mapped Actualizar aula action. Coordinator source readback confirms ClassroomView146-154 renders that button only under rooterror; normal invitation-delivery error is separate. The earlier map suggestion was a fixture assumption, not observed product behavior. Both refresh locators in the new SMTP test need a normal public classroom reload/navigation, such as its already-working initial openClassroom call. Proposed correction is not applied and requires the bounded retry disposition recorded in taskL64. No product delivery defect is inferred; queued job/failure prefix proved, natural recovery/capture still unproved.
