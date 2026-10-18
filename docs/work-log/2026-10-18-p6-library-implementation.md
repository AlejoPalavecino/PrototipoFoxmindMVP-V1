# P6 Library implementation — In progress

- Agent / role: bounded backend and UI writer
- Session or task ID: /root/p5_backend_integration; authoritative session unavailable
- Date: 2026-10-18
- Branch / worktree: codex/p6-teaching / managed p4-p3-integration worktree
- Starting commit: 694cab70d8716faed9380f17a06d8afa3f2da74f
- Phase and detailed task/spec links: [P6 tasks](../../odd/tasks/p6-teaching.md), T2 / S1,S3
- Status: completed

## Request and scope

Implement the ordered P6 Library behavior after Plan: teacher publication and metadata/associations, private student consultation, confirmed unlinked deletion, existing P4 file safety and actual UI. No P7, Git history/publication, shared tracker or retained resource changes. Parent owns final integrated and independent acceptance.

## Work performed

Read exact injected skills, feature Specs/Tasks/L4-L5, current Plan reusable readyClassroomFile/advanceRevision, P4 file access/store/storage and actual Next proxy/client/UI. Artifact language: English documentation/code, existing Spanish UI language extended neutrally.

Implemented LibraryService extending PlanService under the original InvitationService DI token; shared transaction-local authentication, classroom lock/revision, Plan readyClassroomFile/advanceRevision and P4 FileStore are reused. Added exact GET/POST library routes and Next allowlist, teacher publication/metadata/associations, current usable student reads and actual Biblioteca UI with upload/approval/errors/preview/download/confirmed deletion. Existing activity links constrain deletion without implementing activities or notifications.

Added an eighth forward migration with nullable material tombstone/lease/error fields and files.blob_deleted_at. Explicit deletion immediately denies reads to all actors; the separately owned leased worker calls actual storage.remove outside SQL, retaining quota until acknowledged removal. Shared/linked files are protected. Root drains this worker before shared storage closes, including failure-safe cleanup sequencing. Historical SQL files remain untouched; own migration runner deployed twice/status/drift checks passed. Full browser and upgrade proof remains coordinator-owned.

## Verification

- Meaningful RED: `node --test --test-concurrency=1 tests/p6-library.test.mjs` — exit1; actual migrated SQL fixture reached missing listMaterials/changeLibrary and HTTP404. Eight failed tests include downstream dependency failures and a later fixture-only missing scanned_at/validated_at error; that fixture error is not claimed as feature RED.
- First backend GREEN preparation exposed two test-only issues (pg bigint string arithmetic and missing ended_by_id in a direct departure fixture). Corrected fixture conversions and used the actual existing leave method; preserved these failures, no timeout/policy changes.
- Client RED: `node --test --test-concurrency=1 tests/p6-library-client.test.mjs` — exit1,2FAIL for absent material-format policy/preview helper. Later targeted server-rejection copy RED1 observed an inherited PDF/DOCX-only message for ZIP material; material-specific errors now preserve original status and draft-plan behavior.
- `node scripts/build-api.mjs` — fresh exit0; Prisma generation0/API TypeScript0 under unchanged30second budget, including the final root drain sequencing.
- `node --test --test-concurrency=1 tests/p6-library.test.mjs tests/p6-library-client.test.mjs` — final12PASS/0FAIL/0SKIP, exit0 after last client copy change; owned database cleanup0. Includes deployed twice/status/drift checks through withP5Database.
- `node node_modules/typescript/bin/tsc --project apps/web/tsconfig.json --noEmit` and `node node_modules/typescript/bin/tsc --project apps/classrooms-ui/tsconfig.json` — exit0 each.
- `node --test --test-concurrency=1 tests/p4-file-policy.test.mjs tests/p4-host.test.mjs tests/p4-session-bridge.test.mjs tests/p5-host.test.mjs tests/p5-http.test.mjs tests/p5-session-bridge.test.mjs tests/p5-web-proxy.test.mjs tests/p5-ui-client.test.mjs tests/p6-plan.test.mjs` — observed54PASS/0FAIL/0SKIP; SQL cleanup0.
- Read-only baseline/current client differential (HEAD source in OS-temp) —8existing requests identical for mine/code/draft upload/classroom Plan/material uploads. A harmless Node typeless-module warning was reported; no configuration changed to suppress it. Scratch C:/Users/alejo/AppData/Local/Temp/foxmind-p6-library-differential-nWOeDQ left for parent cleanup, not removed by worker.
- Structural diff/link checks PASS, final readback confirmed. All owned SQL runs reported database cleanup0. No retained data, remote operation, dependency or Git history changes. Advisory400line overage retained as one coherent security/lifecycle/UI/test behavior; no code compression.

## Commits and outcomes

No commit by worker; parent owns Git.

## Handoff

T2/S1,S3 Library unit own implementation/checks complete; S2 independent whole-feature Verify and S4 publication remain parent-owned. No whole-P6 completion claimed. Parent next: adapt shared fixture migration inventory7→8, run actual Library API/UI/private-storage/upgrade/restart proof, continue ordered Muro/allowed notifications, then independent Verify and authorized delivery. No material-publication notification was invented.

HTTP GET/POST /api/v1/classrooms/:id/library, envelope {revision,operation}; operations/fields in docs/p6-library.md. UI tab Biblioteca; Archivo del material; Publicar material; Nombre del material; Unidad del material; Tema del material; Editar datos; Guardar datos del material; Eliminar material; Confirmar eliminación del material; Actualizar Biblioteca; Vista previa; Descargar material. app.get(LibraryCleanupWorker) is the sole explicit-deletion worker token; stop/drain before creating a new instance over the same durable rows. Teacher list deletionPending remains true until files.blob_deleted_at is recorded; students never receive deleted rows.

Risk: items1,2,3,4 (forward persistent format/deletion/quota, private-file authorization, shared HTTP/file/lifecycle behavior, classroom revision and durable deletion lease ordering). Independent/full integration proof remains pending coordinator.
