# Private files — isolated P4 workstream

P4 is being built in the managed `foxmind-p4-files` worktree on `codex/p4-private-files`, from commit `33fd80f`. The original checkout continues P3. Integration is deferred; this worktree contains no copied uncommitted P3 authentication candidate.

## Implemented policy boundary

`apps/api/src/files/policy.ts` admits upload metadata using the approved purpose/extension/decimal-byte limits, denies file use unless completion, validation and clean scanning refer to the same SHA-256 digest, and determines whether an incomplete upload is eligible to be claimed after 24 hours of inactivity. It rejects malformed metadata and excludes confirmed drafts, completed files and linked history from that eligibility.

These functions do not validate actual file contents, scan bytes, authorize users, reserve quota or delete objects. Their result is only one required condition inside the future durable file service. They are deliberately not installed as HTTP endpoints. Current upload safety digests are a contract for the later persistence design, not fields already present in the Prisma schema.

Run the dependency-free policy checks with Node 24:

```powershell
node --test tests/p4-file-policy.test.mjs
```

## Later integration

The P3 identity adapter must provide a server-authenticated user and recheck session validity at mutation. Domain access must resolve the actual file relationship, active classroom membership, role for that classroom, archive state and private attempt ownership. Knowing a file UUID or matching its uploader is insufficient. PDF/image preview and every download require that current permission and the safety gate; Office/ZIP are download-only.

Storage and scanner adapters, actual inspection, durable quota/upload transitions, protected endpoints and cleanup are still pending. Storage candidate SeaweedFS and scanner candidate ClamAV are under evaluation; no version or image has been accepted or started. Official references: [SeaweedFS](https://github.com/seaweedfs/seaweedfs), [ClamAV scanning](https://docs.clamav.net/manual/Usage/Scanning.html) and [ClamD protocol](https://docs.clamav.net/manual/Usage/ClamdProtocol.html). A ClamD limit/error must never be interpreted as a clean scan; production quotas and hosting remain deferred.

Track work and acceptance in [P4 tasks](../odd/tasks/p4-private-files.md) and the [work record](work-log/2026-10-16-id-unavailable-p4-isolated.md). P4 cannot close until real service and integrated security/concurrency proof is observed.
