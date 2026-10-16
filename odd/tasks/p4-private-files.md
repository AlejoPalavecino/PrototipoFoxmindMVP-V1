# P4 — Isolated private file infrastructure

## Scope

User now requests P4 design and implementation in a separate worktree, integrating later. Base: 33fd80f62b9735e43124dc2df1a4d12c81f01c8a; branch codex/p4-private-files. This authority belongs to the current P4 workstream; the separate P3 task still closes P3 and stops. No merge, push, release, paid services or existing-data cleanup requested.

Normative sources: [functional specification](../../docs/foxmind-v1-functional-spec.md) sections 2/5/7/14/15; [schema](../../prisma/schema.prisma); [roadmap](../../docs/implementation-roadmap.md). Current evidence: [work record](../../docs/work-log/2026-10-16-id-unavailable-p4-isolated.md). Preparation in the original checkout was inspected; its untracked files were not copied as implementation.

## Requirements and integration design

- Private S3-compatible bytes. No public bucket, anonymous object access or presigned download bypass of current record permissions. Host backend mediates authorized reads.
- Context limits: plan/instruction PDF or DOCX, 20 MB; material/attachment PDF, DOCX, PPTX, XLSX, JPG/JPEG, PNG or ZIP, 50 MB. Here MB means 1,000,000 bytes. Up to five submission attachments, no additional aggregate cap. Classroom quota remains configurable, with no production GB default.
- Independent upload, actual-content validation and scan states. Only completed bytes with approved validation and clean real scan become usable. Bind validation/scan to immutable object identity/digest. An error, skipped inspection, expired result or object replacement must never open access.
- Reject encrypted/uninspectable archives and macro/legacy formats, including misleading extension/content. Resource ceilings must produce rejection or retryable failure, never a clean verdict.
- Session/user identity comes from the accepted P3 session validator; never accept a request-supplied owner or global role. A required server-side permission resolver checks current membership, classroom archive state and actual associated plan/material/attempt. No permissive default resolver or public HTTP route while integration is pending.
- Storage bytes and SQL are not atomic. Reserve quota under a classroom lock before transfer; reserve each upload once. Completion is idempotent and converts the reservation into retained usage exactly once. Failed operations retain a recoverable/quarantined state; retries cannot publish different bytes or resurrect a cancelled upload.
- All confirmed drafts, plan versions and preserved attempts count toward quota. Quota exhaustion blocks new upload reservations, preserving authorized retrieval of enabled files. Attachment count and attempt eligibility require P7 integration.
- Cleanup claims only incomplete uploads inactive at least 24 hours, rechecks under the same mutation locks and never deletes completed/confirmed/linked/history records. Claim before object deletion; retry safely after storage failure. Do not release quota until the owned deletion succeeds.

## Work units

| Unit | Deliverable | State |
|---|---|---|
| P4-A | Isolated worktree, scope, contracts and deterministic policy/security gates with tests | implemented candidate; 11 checks/strict compilation PASS, independent/review acceptance pending |
| P4-B | Official-source storage/scanner selection, bounded private adapters and real component proof | pending |
| P4-C | Durable upload/quota transitions, immutable completion, recovery and cleanup | pending |
| P4-D | Accepted P3 authentication/CSRF and domain-permission integration, protected transfer/read contracts | pending, integration later |
| P4-E | Independent security/concurrency verification, applicable native disposition and integrated exit proof | pending |

Risk: authorization, untrusted parser/archive data, external services and quota/cleanup races require independent verification before phase acceptance. Use cohesive behavior work units with tests/docs, about 400 authored lines each; report overages without compression. No P3-native waiver carries forward.

## Ownership and validation

Own new apps/api/src/files, tests/p4-*, scripts/p4-* and P4-only docs/services in this worktree. Package/lock changes may occur only here and need reconciliation on integration. Avoid identity source, shared roadmap and shared Compose edits before integration. Dependencies and generated output remain worktree-local. Containers require unique owned labels, ports and volumes and bounded resource use; arrange actual service tests to avoid competing with P3's active Docker proof.

RED must fail on missing requested behavior, followed by focused GREEN and scoped build checks. Component mocks can prove failure handling, not real scanner/storage acceptance. No phase completion from interface/policy tests. Integrated acceptance includes wrong classroom/student, revoked session/membership, archived write denial, real infected/encrypted/spoofed/oversized files, scanner/storage outage, digest replacement, quota concurrency, duplicate completion and cleanup-versus-confirmation races.

## Handoff

First unfinished implementation: P4-B service selection/adapters and real component verification. P4-A has observed RED (9 failures/2 passes), GREEN (11 passes) and strict TypeScript compilation; independent verification/native disposition remain pending. P3 remains owned by the original coordinator. Reconcile its accepted identity API and current dependency graph before P4-D; do not merge uncommitted P3 candidates into this worktree. P4 remains incomplete until all units have applicable observed proof.
