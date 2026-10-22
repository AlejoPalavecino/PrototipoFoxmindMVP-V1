# P4 - Parallel preparation while P3 continues

## Scope and evidence

Current user asks: "Bien mientras se esta trabajando en P3. Podemos trabajar en la P4?" This document prepares an independent P4 workstream. It does not change the separate P3 coordinator's instruction to finish P3 and stop, nor claim P4 implementation has begun.

Sources: [roadmap](../../docs/implementation-roadmap.md), [functional specification](../../docs/foxmind-v1-functional-spec.md) sections 2/5/7/14/15, [Prisma schema](../../prisma/schema.prisma), [inspection record](../../docs/work-log/2026-10-16-id-unavailable-p4-preparation-2242.md).

Observed baseline: feat/p33-token-flows at 33fd80f62b9735e43124dc2df1a4d12c81f01c8a, with active uncommitted P3 work. FileObject, Upload, independent upload/validation/scan states and classroom storage quota fields exist. No storage/scanner module or operating proof was observed; schema existence does not prove feature completion.

## Confirmed requirements

| Area | Existing requirement |
|---|---|
| Storage | Private S3-compatible objects; local supporting services in containers. Backend remains on host. |
| Plans/instructions | PDF and DOCX only; at most 20 MB per file. |
| Materials/submissions | PDF, DOCX, PPTX, XLSX, JPG/JPEG, PNG and ZIP; at most 50 MB per file. |
| Submission count | At most five files, permitting up to 250 MB subject to classroom quota; no additional aggregate cap. |
| Security | Validate actual content/type, extension and size, then real scanning. No preview/download/submission before all required gates pass. |
| Inspection failures | Encrypted/uninspectable content rejected; unavailable/failed scanning never approves a file. ZIP contents never executed. |
| Exclusions | Legacy and macro-enabled Office formats; direct audio/video uploads; classroom cover/avatar uploads. |
| Access | Current classroom/record permission checked for preview and download; file identity alone never grants access. |
| Preview | Browser PDF/images when supported, with authorized download fallback; Office/ZIP download only. |
| Quota | Configurable per classroom; count plans, materials, all preserved attempts and confirmed draft files. Production GB value deferred. |
| Retention | Confirmed drafts do not expire. Only incomplete abandoned uploads qualify for automatic cleanup after 24 h inactivity. Preserve linked files/history. |

## Parallel boundaries

| Work | Parallel readiness | Dependency / ownership |
|---|---|---|
| Requirements, state transitions and acceptance design | Ready now; this initial map is complete | New P4-only documents. |
| Evaluate storage/scanner products and versions | Can proceed independently | Consult current official sources before recommending/pinning; verify licensing, inspection limits and resource needs. No provider/version chosen here. |
| Design isolated adapters and component checks | Can be prepared independently | Dedicated P4 worktree before source changes; agree exclusive paths. No edits to live P3 source/helpers, package/lock, schema or shared Compose. |
| Run storage/scanner containers and real component tests | Schedule separately | Owned names/ports/volumes and bounded CPU/RAM; avoid competing with P3 Docker checks. Reuse no P3 databases or inbox volumes. |
| Integrate protected file endpoints | Dependent integration | Consume accepted identity/session/CSRF behavior; preserve P3 ownership until handoff. P3 UI need not block isolated adapter design. |
| Enforce classroom/attempt access | Define now, integrate with relevant domain modules | P5/P7 workflows do not yet exist; controlled test fixtures may prove scoped file policy, never imply full classroom journeys. |
| Close P4 | Requires actual integrated evidence | Real storage/scanner, authorization, quota/concurrency and retention failures verified; not achieved by contracts/mocks alone. |

## Detailed tasks

- PREP-1 | completed | Reconcile requirements, current schema/module inventory and concurrent edit boundaries. Documentation inspection only.
- PREP-2 | pending | Define upload/validation/scan transitions and idempotency, immutable scanned-byte identity, quota reservation/release and interrupted-operation handling. Compare with existing migrations before proposing schema changes.
- PREP-3 | pending | Evaluate and choose supported local storage/scanner versions from official sources; define inspection depth/expanded-size/time/resource bounds without bypassing approved format limits. Define MB byte convention explicitly against existing contracts.
- PREP-4 | pending | Specify upload initiation/transfer/completion/status and authorized preview/download contracts, permission resolver inputs and sanitized failure outcomes. No permissive temporary public endpoints.
- IMPL-1 | pending | In an isolated worktree, implement storage/inspection adapters with meaningful test-first component evidence; actual isolated service validation scheduled around P3.
- IMPL-2 | pending | Integrate transactional metadata/quota reservations, concurrency-safe completion and real quarantine/scan gates with accepted identity behavior.
- IMPL-3 | pending | Add authorized retrieval and narrowly scoped incomplete-upload cleanup, preserving confirmed drafts and history.
- VERIFY-1 | pending | Observe public-interface checks, independent security/concurrency verification and applicable review; coordinator reconciles phase evidence only afterward.

## Acceptance cases to implement

1. Valid allowed files within each context limit upload and become accessible only after actual content validation and a real clean scan.
2. Spoofed extensions/types, legacy/macro-enabled Office, encrypted/uninspectable files, hostile archives and configured inspection-boundary violations cannot become usable.
3. Scanner outage/error/timeout or storage failure leaves access denied; retry never publishes an unscanned object or scans different bytes than those later served.
4. Unverified/revoked/unauthorized users and users from another classroom cannot preview/download; students cannot read another student's private attempts. Archived classroom writes are denied.
5. Concurrent uploads cannot oversubscribe quota; duplicate completion/retry cannot double-count or release another upload's reservation. Exhaustion blocks new uploads while retaining authorized access to already enabled files.
6. Five valid 50 MB submission attachments remain possible with sufficient quota; P7 owns actual delivery/attempt integration and locking.
7. Cleanup after 24 h inactivity touches only eligible incomplete uploads. Confirmed drafts, linked material, plan versions and preserved attempts survive cleanup and failure/restart races.
8. PDF/image preview failure retains authorized download; Office/ZIP remain download-only. No public object URL bypasses current record permissions.

No services installed, started or selected by this preparation. No production quota, paid hosting, publication or phase completion implied. Next concrete task: PREP-2, then official-source tool evaluation before implementation.
