# Private files — isolated P4 implementation

P4 is being built in the managed `foxmind-p4-files` worktree on `codex/p4-private-files`, from commit `33fd80f`. The original checkout continues P3. Integration is deferred; this worktree contains no copied uncommitted P3 authentication candidate.

## Implemented policy boundary

`apps/api/src/files/policy.ts` admits upload metadata using the approved purpose/extension/decimal-byte limits, denies file use unless completion, validation and clean scanning refer to the same SHA-256 digest, and determines whether an incomplete upload is eligible to be claimed after 24 hours of inactivity. It rejects malformed metadata and excludes confirmed drafts, completed files and linked history from that eligibility.

The policy functions are one gate inside the implemented durable file service. Separate modules now perform actual PDF/image/OOXML/ZIP inspection, real ClamAV scanning, private immutable S3 transfers, transactional quota/leases, safe retrieval and incomplete-upload cleanup. Additive custody/proof metadata is present in the Prisma schema. The opt-in Nest module and HTTP middleware are deliberately not registered in the P3 application.

Run the dependency-free policy checks with Node 24:

```powershell
node --test tests/p4-file-policy.test.mjs
```

## Later integration

The P3 identity adapter must provide a server-authenticated user and recheck session validity at mutation. Domain access must resolve the actual file relationship, active classroom membership, role for that classroom, archive state and private attempt ownership. Knowing a file UUID or matching its uploader is insufficient. PDF/image preview and every download require that current permission and the safety gate; Office/ZIP are download-only.

Storage is [SeaweedFS 4.48](https://github.com/seaweedfs/seaweedfs/releases/tag/4.48); scanner is [ClamAV 1.5.4](https://github.com/Cisco-Talos/clamav/releases/tag/clamav-1.5.4). Their tested image digests are pinned in the P4 Compose/fixture definitions. Official references: [ClamAV Docker lifecycle](https://docs.clamav.net/manual/Installing/Docker.html) and [ClamD protocol](https://docs.clamav.net/manual/Usage/ClamdProtocol.html). A limit/error never counts as clean. Production quotas, hosting and the real P3/domain bridge remain deferred.

Track work and acceptance in [P4 tasks](../odd/tasks/p4-private-files.md) and the [work record](work-log/2026-10-16-id-unavailable-p4-isolated.md). P4 cannot close until real service and integrated security/concurrency proof is observed.

## Dedicated local services

```powershell
npm run p4:local -- up
npm run p4:local -- migrate
npm run p4:local -- drift
npm run p4:local -- status
npm run p4:local -- stop
```

The launcher owns only project `foxmind-p4-files` and [compose.p4.yaml](../compose.p4.yaml). PostgreSQL uses `127.0.0.1:55434`, S3 `127.0.0.1:18334`, and ClamD `127.0.0.1:13311`. P3 database/Mailpit names, ports and volumes are untouched. Internal SeaweedFS filer/master/admin ports are not published; backend execution stays on the host. Stop preserves all dedicated database/object/signature volumes; no volume-deletion command is provided.

Generated local credentials stay in ignored `.p4-local/private.json` and `.p4-local/s3.json`; no `.env` is read/written. `p4LocalConfiguration()` returns them in memory to a trusted host caller. Never print that object or commit these files. If credentials are lost while retained volumes exist, restore local configuration; startup refuses to generate replacements. `status` reports observed states rather than claiming readiness from command exit alone.

The persistent scanner starts with the full signature-bearing image and runs FreshClam against its own signature volume. Startup rejects signatures older than seven days. Deliberately update/re-evaluate pinned images; never loosen inspection or stale-signature gates. Fixtures use real engine/signatures in disposable, owned resources. The tests leave no API listener or running service, while persistent development volumes remain available.

## Operational bounds

| Boundary | Limit |
|---|---|
| Plan/instruction | PDF/DOCX; 20,000,000 bytes |
| Material/attachment | Approved extensions; 50,000,000 bytes per file |
| Submission aggregate | No extra aggregate cap; five 50 MB files remain possible with quota; P7 owns count/attempt linkage |
| ZIP inspection | 1,000 entries; 100 MB expanded per entry; 200 MB expanded total including nested ZIPs; nesting depth 5 |
| XML/image inspection | 16 MB per XML part; UTF-8/UTF-16; no DTD/entities/macros; 25 million pixels |
| Parser worker | 128 MB V8 old heap, 16 MB young heap, 15 s wall time; input/expanded buffers separately bounded |
| Scanner | 50 MB input; 200 MB scan work; recursion 8; 1,000 files; limit/encryption alerts deny access |
| Host concurrency | One buffered transfer/inspection or read per FileService instance; no unbounded body queue |
| External calls | Storage 10 s; scanner 15 s; operation lease 90 s |
| Database | Short transactions: 2 s acquisition/4 s transaction ceiling; no external I/O inside |
| Cleanup | Incomplete uploads inactive at least 24 h; at most 100 candidates; stop starting claims after 30 s plus one bounded in-flight operation |

Expanded/parser bounds may reject a compressed file even when upload size is allowed. Rejection never becomes a clean verdict. Contents are never extracted onto host paths or executed. Classroom quota is taken from its stored value; draft quota is a required explicit bigint configuration with no production default. Quota exhaustion blocks new reservations while preserving authorized reads.

OOXML structural parts must use their actual package/document namespaces and exact internal Office document relationship type; an arbitrary matching suffix or a renamed XML root is insufficient. Transitional and strict document namespaces are admitted. This structural inspection complements real malware scanning; neither bypasses the other.

## Lifecycle and recovery

`begin` snapshots/adopts metadata, verifies the authenticated account, locks user then scope, checks actual record access and reserves quota. File creator, scope, key, size, name, purpose and record target become immutable. Backend-generated keys never leave the module.

`receive` checks creator/access/size, claims a lease and permanently binds the first SHA-256 digest. S3 writes use `If-None-Match: *`; a retry can reuse only the exact existing bytes. Validation and real scanning process the same snapshot; stored bytes are re-read before confirmation. Access/session are rechecked before the completion/proof transaction. Only then does the upload become usable. Repeating completion does not double-count; different bytes cannot replace the file.

Temporary failures retain quarantine and quota. Same-byte retries recover after the lease clears/expires; definitively invalid/infected content stays rejected. A stale worker cannot finalize over a newer claim. Retrieval checks the stored digest and rechecks access after I/O, so storage replacement/revocation never silently serves unchecked bytes.

Cleanup claims only old incomplete uploads under the same scope lock, blocks confirmation, deletes its owned object, then releases the reservation once. Deletion failure retains quota and a retryable lease/tombstone. Database guards prevent linking incomplete P4 files. Completed drafts and linked/history records never qualify. Explicit domain-driven deletion of retained materials is outside this cleanup API.

## Required integration ports

`FileAccess.authenticate(tx, request, action)` must enforce accepted P3 session/Origin/CSRF behavior. It is repeated after locking and during finalization and must not repeatedly mutate admission counters; the integrating middleware admits once per actual HTTP request. Session revocation must serialize with the same user lock. P4 independently checks verified-account state.

`createFileAccess({authenticate, authorizeAttemptWrite})` supplies the concrete record resolver. It checks actual plan/material links before student access, actual instruction/activity linkage and publication, instruction mutation locks, assignment/attempt ownership and status. Student attachment drafts remain private even from the teacher; the teacher reads only linked submitted attachments. Its two trusted ports are required: accepted P3 authentication and P7 active editor/deadline/five-file policy. The latter receives the original request and persisted attempt target and is repeated at each write check after external I/O. P4 does not recreate the P7 editor or submission workflow. Custom `authorize(tx, userId, target, action, request)` adapters must preserve all these rules. P5/P7 integration must retain user -> scope -> membership/record lock order and use the same scope lock for domain mutations.

There is no permissive/default adapter. Isolated tests use synthetic accounts and explicitly labelled test-only authentication/editor ports; the concrete record resolver is exercised against real domain records in PostgreSQL with actual storage/scanner I/O. These tests do not claim P3/P5/P7 application acceptance. See [HTTP contract](api/files.md). Neither the module nor the middleware supplies replacement authentication.

P5 publication calls `promoteDraftPlanInTransaction(tx, request, fileId, classroomId)` after assigning that draft's `published_classroom_id`, inside the same domain transaction. The standalone wrapper `promoteDraftPlan` is available for an already established publication. Only the verified draft owner who also teaches the destination may transfer a ready plan into that exact active classroom. Classroom then draft locks serialize quota transfer and concurrent uploads/promotions; repetition is idempotent. A forward database guard independently restricts that one scope transition, proof and quota while retaining immutable bytes/key/name/owner. Publication rollback also rolls back the transfer. Arbitrary reparenting remains rejected. This is a P4 integration primitive; the P5 publication wizard and application journey remain deferred.

## Verification

```powershell
npm run test:p4
npm run test:p4 -- --persistent
```

The first builds this worktree, checks policy/adapters/parsers/configuration and runs real PostgreSQL/S3/ClamAV journeys. The second also validates retained object/database state across an actual container restart, removes only its owned probe and stops persistent services while preserving their volumes. Fixture cleanup is label-restricted and reported separately. Independent/native acceptance and real application/browser integration remain separate proof.
## Automatic incomplete-upload cleanup

Installing `FilesModule` starts an immediate incomplete-upload sweep and repeats it every60seconds after the previous sweep finishes. Sweeps never overlap. Module shutdown cancels future sweeps and awaits its own bounded in-flight operation. Errors produce a fixed diagnostic without file or request data and remain retryable on the next sweep. Direct `FileService` consumers must own an equivalent lifecycle or install `FileCleanupWorker`; constructing a service alone does not start background work.

