# P4 — Isolated private file infrastructure

## Scope

User now requests P4 design and implementation in a separate worktree, integrating later. Base: 33fd80f62b9735e43124dc2df1a4d12c81f01c8a; branch codex/p4-private-files. This authority belongs to the current P4 workstream; the separate P3 task still closes P3 and stops. No merge, push, release, paid services or existing-data cleanup requested.

Continuation: "Bien, continuá con el diseño e implementación de todo lo que falta de P4 en ese worktree, sin tocar P3. La integración la hacemos después." This authorizes necessary worktree-local dependency installation and owned P4 storage/scanner/database services and component verification. Do not alter P3 source, the original checkout or its existing data; keep actual application integration deferred.

Normative sources: [functional specification](../../docs/foxmind-v1-functional-spec.md) sections 2/5/7/14/15; [schema](../../prisma/schema.prisma); [roadmap](../../docs/implementation-roadmap.md). Evidence: [initial work record](../../docs/work-log/2026-10-16-id-unavailable-p4-isolated.md), [current audit/fixes](../../docs/work-log/2026-10-16-id-unavailable-p4-audit.md). Preparation in the original checkout was inspected; its untracked files were not copied as implementation.

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
| P4-A | Isolated worktree, scope, contracts and deterministic policy/security gates with tests | implemented; original 11 checks/strict compile PASS, included in later 68PASS and acknowledged native scopes |
| P4-B | Official-source storage/scanner selection, bounded private adapters and real component proof | implemented; actual SeaweedFS/ClamAV and content checks PASS |
| P4-C | Durable upload/quota transitions, immutable completion, recovery and cleanup | implemented; automatic cleanup, atomic draft-plan promotion/rollback and quota races now verified |
| P4-D | Opt-in Nest/HTTP adapter, configuration and protected transfer/read contracts | implemented; actual Nest lifecycle and concrete domain-record resolver verified with real SQL/S3/ClamAV; real P3/P5/P7 integration deferred by user |
| P4-E | Independent security/concurrency verification, applicable native disposition and integrated exit proof | independent scoped rechecks PASS; native original/corrective scopes approved and acknowledged; application exit proof deferred by user |

Risk: authorization, untrusted parser/archive data, external services and quota/cleanup races require independent verification before phase acceptance. Use cohesive behavior work units with tests/docs, about 400 authored lines each; report overages without compression. No P3-native waiver carries forward.

## Ownership and validation

Own new apps/api/src/files, tests/p4-*, scripts/p4-* and P4-only docs/services in this worktree. Package/lock changes may occur only here and need reconciliation on integration. Avoid identity source, shared roadmap and shared Compose edits before integration. Dependencies and generated output remain worktree-local. Containers require unique owned labels, ports and volumes and bounded resource use; arrange actual service tests to avoid competing with P3's active Docker proof.

RED must fail on missing requested behavior, followed by focused GREEN and scoped build checks. Component mocks can prove failure handling, not real scanner/storage acceptance. No phase completion from interface/policy tests. Integrated acceptance includes wrong classroom/student, revoked session/membership, archived write denial, real infected/encrypted/spoofed/oversized files, scanner/storage outage, digest replacement, quota concurrency, duplicate completion and cleanup-versus-confirmation races.

## Handoff

Latest isolated implementation is complete and natively reviewed. Earlier units f2f9a0e/cleanup,18c2de8/record access,3e7c28c/promotion,bdda8d6/Office andce31410/probes remain history. Independent scoped [access17checks](../../docs/work-log/2026-10-16-p4_access_review-p4-audit.md)/[content-output33checks](../../docs/work-log/2026-10-16-p4_content_review-p4-audit.md) closed their three reported P2 issues in46611f2. Native review of all48paths used ten complete reduced scopes after the whole candidate exceeded context budget; four warning findings were fixed in2ea8523, then separately reviewed/approved/acknowledged with no findings. [Native coordinator and attributed records](../../docs/work-log/2026-10-16-id-unavailable-p4-native-review.md) retain exact bindings, original failures and limits. Current runner build0/68PASS (40component/startup/cleanup/output +27real service +1persistent restart), six migrations/drift0, owned cleanup0 and all P4 services exited. Source native approval is bound to2ea8523; passive closure documentation is separate. No known isolated defect from these reviews remains open.

Integration remains explicitly deferred until accepted P3 closure. Follow the [integration handoff](../../docs/p4-integration-handoff.md) for payload, trusted ports, migration/dependency reconciliation, lifecycle, staged domain connections and browser acceptance. Its later coordinator must preserve final P3 metadata rather than copy this branch's historical P3 summary. Do not merge uncommitted P3 candidates here or mark full application/phase accepted100% from isolated proof. No P3 source, push, merge, PR or publication occurred.

## Evidence and retained failures

- Original policy RED9fail/2pass -> GREEN11PASS and strict compile are retained in the original record.
- Adapter RED6fail -> GREEN6PASS. Parser RED5fail -> intermediate valid-Office failure -> worker execArgv failure -> GREEN5PASS. The actual strict worktree build subsequently passed. Worker stdout/stderr is drained privately, never raw file data logged.
- Initial real service run: one actual S3/ClamAV component PASS; service stub failures followed, including one dependent missing-fixture TypeError that is not meaningful RED proof for authorization. Subsequent public-service GREEN9PASS, then expanded GREEN15PASS.
- HTTP rejection regression observed200 versus400 for GET-with-body, then fixed. Initial HTTP/configuration/lifecycle helper additions had no pre-implementation RED; do not retroactively claim that they did. Later functional/real proof is recorded separately; independent acceptance remains required.
- SQL invariant RED exposed NULL CHECK semantics and phase-only link guarding. Metadata-snapshot RED observed50,000,001 versus583bytes. Added a forward hardening migration (never rewrote the already-applied custody migration) and snapshotted metadata before async calls. Changed-candidate real service GREEN18PASS.
- Earlier `node scripts/test-p4.mjs --persistent`: strict build0, policy/adapters/content/configuration26PASS, real service18PASS, persistent migration/restart1PASS. Superseded first by the historical59PASS audit checkpoint, then by current68PASS native-correction proof above; retained as history. Writer proof is not independent/native approval.
- Dependency regressions plus unchanged account contracts17PASS; full npm audit0known vulnerabilities. Schema drift check and structural checks are recorded in the work log when observed, never assumed from build.

## Audit requirement coverage (isolated implementation)

| P4 boundary | Implementation and observed proof |
|---|---|
| Private bytes; no anonymous download/overwrite | S3 conditional writes, mediated digest-checked reads; actual anonymous403/overwrite412 |
| Approved content/limits and quarantine | Policy boundaries, real PDF/image/OOXML/ZIP parsing, exact namespaces, archive ceilings; real ClamAV clean/EICAR/outage |
| Current authorization | Verified account/session recheck, scope/archive/membership locks, actual linked material/instruction records, private student attempts; revocation during scan |
| Quota and preserved history | Reservations/completion idempotence, concurrent quota denial, completed/draft/history retention, owned automatic incomplete cleanup only |
| Draft publication compatibility | Ready plan transfer to its actual classroom with same teacher/owner; immutable bytes, quota serialization, rollback and SQL guards |
| Runtime/setup | Opt-in HTTP/Nest lifecycle, explicit config, dedicated persistent services, real restart proof and stopped retained volumes |
| Acceptance still external | Independent/native isolated review completed; P3/P5/P7 application/browser integration deferred; no integration/publication inferred |
