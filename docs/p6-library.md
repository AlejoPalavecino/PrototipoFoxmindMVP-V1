# P6 Library: private materials with explicit deletion

Teachers publish approved P4 files, edit their display title and curriculum association, and explicitly delete only unlinked/unshared materials. Students consult currently usable materials through the classroom's **Biblioteca** tab, including extra reading without activity links. Existing Plan, membership, session and archived-classroom rules remain authoritative.

## API

`GET /api/v1/classrooms/:id/library` returns permission-scoped materials. `POST` at the same route accepts exactly `{ revision, operation }`, sharing the classroom revision/lock used by Plan and settings.

| Operation | Exact fields after `action` |
|---|---|
| `publish` | `title`, `fileId`, `unitId`, `topicId` |
| `edit` | `id`, `title`, `unitId`, `topicId` |
| `delete` | `id`, `confirm: true` |

Use `null` for no unit/topic. A topic requires its actual matching classroom unit. Titles are nonblank and at most 200 characters. Metadata editing never accepts a replacement file; publish a new material to correct bytes. A classroom file may be published once, with purpose `material`, no target, matching classroom scope and existing P4 ready/content/scanning proof. Uploads still use the actual P4 `/files` interface and existing classroom quota.

List fields are `id`, `title`, `fileId`, `unitId`, `topicId`, `fileName`, `extension`, decimal-string `sizeBytes`, `ready`, `previewable`, `linked`, `deleted` and `deletionPending`. Students receive only active, currently usable materials. Teachers also receive unavailable files and deletion tombstones so the UI can report their actual state without offering unsafe links. PDF/JPG/JPEG/PNG may use the existing private preview response; Office/ZIP remain download-only. Preview failure retains download as an alternative.

## Deletion and conservation

1. The verified classroom teacher confirms deletion in an active classroom. The transaction locks/rechecks the material and rejects any activity link or another reference to its file.
2. `materials.deleted_at` immediately and irreversibly revokes teacher/student reads and publication reuse. Unit/topic associations are cleared so an intentionally deleted, unlinked material does not permanently pin otherwise deletable curriculum.
3. `LibraryCleanupWorker` leases one explicit tombstone per sweep, rechecks references, then calls the shared actual storage port **outside** SQL transactions. Its lease/token/error fields survive restarts. It never selects general uploads or implements retention expiry.
4. Only confirmed storage removal sets `files.blob_deleted_at`. Until then the file remains fully counted toward classroom quota. Failure retains both quota and the durable request, with sanitized `STORAGE_UNAVAILABLE`; later five-second sweeps retry. A crash after storage accepted removal but before SQL acknowledgment safely repeats idempotent removal before releasing quota.

The tradeoff is conservative space reservation and a retained metadata tombstone instead of an unsafe hard-delete/optimistic quota release. Shared or linked historical files are never removed. The existing automatic incomplete-upload cleanup is unchanged and never used for this operation. Forward SQL guards preserve material identity and tombstones, reject linking a deleted material, and prevent restoring a recorded removed blob.

Root shutdown drains `LibraryCleanupWorker` **before** the shared file infrastructure closes, and still attempts other owned cleanup if deletion drain failed. Nest's imported Prisma teardown follows root cleanup. Startup/stop are idempotent; no worker-control HTTP endpoint is added. Trusted integration tests may use `app.get(LibraryCleanupWorker).onModuleDestroy()` to pause periodic work, instantiate a fresh worker over the same persisted database/storage after restart, or await the single-object `sweep()` while active. A stopped worker's sweep/start is a no-op.

## Upgrade and evidence

Apply the new eighth migration `202610180001_p6_library_lifecycle` before running this API. Its nullable columns keep all existing materials/files active; all seven historical migrations remain unchanged. The owned SQL runner applies migrations twice, checks migration status and verifies schema drift. Coordinator fixtures with explicit migration counts must be updated separately.

Focused checks cover SQL publication/association/immutability, rejected-command snapshots, shared/activity-link deletion guards, concurrent classroom mutations/deletion workers, persistent retry and conservative quota, former/unverified access, actual handler contracts and client preview/upload policy. [Attributed evidence](work-log/2026-10-18-p6-library-implementation.md) records RED and later fixture corrections separately. Actual browser/private-storage/restart journeys and independent whole-P6 verification remain coordinator-owned; this unit does not claim full P6 completion or implement P7.
