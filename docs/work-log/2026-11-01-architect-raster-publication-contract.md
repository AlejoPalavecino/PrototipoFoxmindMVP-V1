# Foxy raster publication — implementation contract

- Agent / role: architect.
- Session or task ID: `/root/architect_next`.
- Date: 2026-11-01.
- Branch / worktree: `codex/foxy-ai`, `C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai`.
- Starting commit: `68f403c` (observed).
- Phase/spec: visual publication V-P1, [proposal](../../odd/tasks/foxy-ai-proposal.md), [generation integration](2026-11-01-architect-visual-generation-integration.md).
- Status: completed (design only; implementation and RED are pending).

## Request and scope

The coordinator requested exact raster publication signatures and essential schema/RED, preserving concurrent work. No production/test/migration edits, secrets or provider calls. ESTADO_DISENO: LISTO_PARA_TDD_RED.

## Public contract

Add to domain `foxy-ai-resource.ts`, parser/exports alongside existing publication types:

```ts
interface PrepareFoxyVisualPublication {
  requestId: string; assetRevision: string; classroomId: string; title: string;
  unitId: string | null; topicId: string | null;
}
type FoxyVisualPublicationSummary =
  Omit<FoxyPublicationSummary, 'resourceId' | 'resourceRevision'> & {
    sourceKind: 'VISUAL'; assetId: string; assetRevision: string;
  };
type FoxyAnyPublicationSummary = FoxyPublicationSummary | FoxyVisualPublicationSummary;
parsePrepareFoxyVisualPublication(input: unknown): PrepareFoxyVisualPublication;
```

Parser is strict: exactly these keys, existing UUID/revision rules, title 1..200 with no tab/newline, nullable unit/topic, topic requires unit. Existing TEXT summary/request/response remains unchanged; `FoxyPublicationInspection.publication` becomes the union. Use `assetId in publication` to narrow; do not invent resource IDs for visuals.

Extend existing `createFoxyPublicationService` options with `visualPublications`; add:

```ts
prepareVisual(request: unknown, assetId: string, input: unknown):
  Promise<{ created: boolean; publication: FoxyVisualPublicationSummary }>;
listVisual(request: unknown, assetId: string, input: unknown):
  Promise<{ items: FoxyVisualPublicationSummary[]; nextAfterId: string | null }>;
```

POST `/api/v1/foxy-ai/assets/:id/publications`: body above, 202 new / 200 replay. GET same route: existing `limit` default20, 1..50, nullable `afterId`; 200 list. Missing `visualPublications` disables only this capability with 404, without mock behavior. HTTP parses structural input before calling service; service validates again and enforces permissions/context.

Reuse existing GET `/publications/:id`, GET `/publications/:id/file?mode=preview|download`, POST `/publications/:id/confirm` (under the same API prefix), and management/retry/discard routes. Confirmation input remains `{requestId,publicationRevision,classroomRevision,confirm:true}`; receipt remains `{publicationId,materialId,publicationRevision,classroomRevision}`. No material exists before explicit confirmation.

## Repositories and materialization

New `apps/api/src/foxy-ai/visual-publication-repository.ts`:

```ts
createFoxyVisualPublicationRepository({ assets });
// assets: Pick<ReturnType<typeof createFoxyPrivateAssetReadRepository>, 'describe'>
prepare(tx, ownerId, assetId, input: PrepareFoxyVisualPublication):
  Promise<{created: boolean; publication: FoxyVisualPublicationSummary}>;
list(tx, ownerId, assetId, page: {limit: number; afterId: string | null}):
  Promise<{items: FoxyVisualPublicationSummary[]; nextAfterId: string | null}>;
```

Preparation authenticates teacher and current source/destination scope; READY asset, full integrity proof and exact revision are mandatory for new work. Hash includes operation/source ID/revision and every input field. Existing `(owner_id,request_id)` uniqueness remains shared across TEXT/VISUAL. Authorize before replay, then compare hash; replay precedes quota/CAS. Lock owner, source/destination classrooms ordered by UUID, conversation/source, publication, then P4. Sources from archived classrooms may be consulted under current ownership as in existing TEXT publication; destination must be active. New preparations cannot use discarded sources.

Keep the existing PDF descriptor exactly `{digest,sizeBytes,pageCount,rendererVersion}`. Add:

```ts
interface FoxyRasterPublicationArtifact {
  kind: 'RASTER'; digest: string; sizeBytes: number;
  mimeType: 'image/png' | 'image/jpeg'; extension: 'png' | 'jpg';
  width: number; height: number;
  producerVersion: 'foxy-diagram-png-v1' | 'foxy-image-original-v1';
}
type FoxyPublicationArtifact = LegacyPdfArtifact | FoxyRasterPublicationArtifact;
```

Export shared artifact types through domain barrel. PNG iff extension png; JPEG iff jpg. Diagram producer requires PNG. Raster limits remain 10MiB, dimensions 1..4096 and <=4M pixels. No raster pageCount, PDF filename, invented renderer version or markdown placeholder. Allocation/proofs/readers branch on this union, not permissive MIME strings.

Existing PublicationAuthority gains `authorizeVisualSource(capability,signal,tx?)` returning `{...FoxyPublicationLease,asset:FoxyPrivateAssetReadDescriptor}`. It denies TEXT and validates immutable publication snapshot against current READY asset/proof/revision and current source permissions. `open()` keeps TEXT snapshot unchanged; VISUAL snapshot is `{kind:'VISUAL',assetId,assetRevision,digest,sizeBytes,mimeType,width,height,producerVersion}`. Each async boundary revalidates the same scope; source storage key stays internal.

New `apps/api/src/files/foxy-publication-raster-source.ts`, exported by the files barrel:

```ts
createDurableFoxyPublicationRasterSource({files,authority,inspector}): {
  read(capability: object, signal: AbortSignal):
    Promise<{bytes: Uint8Array; artifact: FoxyRasterPublicationArtifact}>;
}
// files: Pick<FileService,'storage'>
// authority: Pick<PublicationAuthority,'authorizeVisualSource'>
// inspector: existing private-image inspector's inspect port
```

Read uses storage already owned by FileService: authorize before/after GET and inspector, snapshot/copy bytes, verify exact size/hash/codec/dimensions. No session-token synthesis, second client or new provider. Extend existing publication worker options with `rasterSource`; branch VISUAL to this reader and TEXT to current renderer. Missing raster port fails closed for VISUAL. `ensureFile` accepts the artifact union; normal TEXT callers remain valid.

Allocate a NEW P4 classroom material file with `foxy-ai.png`/`foxy-ai.jpg`; charge destination quota and run FileService receive/validation/scanner again. Never alias/promote the private storage key or waive scanning because private source was clean. Reuse existing queue heartbeat/recovery and completion/confirmation. Recovery reuses already allocated exact descriptor/file; never allocates a second copy for the same publication. A source change/discard during preparation or confirmation prevents publication. After confirmed publication, the Library copy is independent: private discard does not revoke it, and an authorized exact confirm replay returns the prior receipt for a live material.

## Additive schema and safety constraints

One successor migration to existing `foxy_publications`, not a parallel publication subsystem:

- Add `source_kind` TEXT default `TEXT` constrained to TEXT/VISUAL; `source_asset_id` UUID and `source_asset_revision` bigint with composite FK `(source_asset_id,owner_id)` to assets.
- Make resource_id/resource_revision/snapshot_markdown nullable only for VISUAL. Exact XOR source CHECK: TEXT has resource/revision/markdown and no asset fields; VISUAL has asset/revision, no resource/revision/markdown. `snapshot_title` stays populated.
- Add immutable `snapshot_visual` JSONB (NULL for TEXT; validated raster metadata above for VISUAL).
- Add `artifact_mime_type`, `artifact_width`, `artifact_height`. Existing TEXT rows with allocated file backfill application/pdf, dimensions NULL. Extension is derived from the exact MIME, not independently trusted.
- Extend artifact CHECK: empty allocation has ALL artifact fields NULL. Allocated TEXT retains current PDF limits/pageCount/renderer allowlist and PDF MIME. VISUAL has exact snapshot digest/size/MIME/dimensions/producer, pageCount NULL, 10MiB/4Mpx bounds; existing `renderer_version` column stores the exact trusted producerVersion on VISUAL, with separate allowlist. No false PDF metadata.
- CHECKs must be total boolean predicates with explicit IS NOT NULL guards (SQL NULL does not reject). Nonnegative source revision, owner FK, source/snapshot/artifact immutability and existing terminal/discard guards include new columns. Preserve existing receipts/leases, state machine, file/material identity and terminal invariants.

Update ALL hardcoded resource joins/PDF predicates in repository, authority, allocator, queue/recovery, completion, confirmation, file reader and management/cleanup. Extract a cohesive source resolver instead of copying permission SQL with divergent branches. File reader and HTTP return exact PNG/JPEG/PDF headers, no-store/nosniff/sandbox and attachment fallback; no raw private key/digest in public DTOs.

## RED and verification

1. Domain strict parser/union and SQL XOR/FK/NULL/immutable/terminal guards; legacy PDF suite unchanged behavior.
2. Actual POST202/poll/preview/confirm receipt/Library student read for PNG, JPEG and diagram PNG, GENERAL and CLASSROOM; no student access before confirm.
3. Source/context/owner/revision/discard corruption before and during copy/scan/confirm; byte digest, MIME, codec, dimensions mismatch fail closed. Destination archive/quota failure produces no visible material or duplicate charge.
4. Prepare/confirm replay exactly one file/material; crash with allocated/ready P4 file resumes same identity and proof. Discard private after published retains student copy and confirm replay. Retry/discard/cleanup use correct source and exact format; PDF regressions.
5. Runtime worker wiring and UI (preview, prepare, inspect, explicit confirmation, material link) with real P4/scanner fixture; no provider call required to publish synthetic READY assets.

Observed inspection: Git HEAD; domain publication types/parsers; HTTP routes; publication service/repository/authority/allocator/worker/reader/completion/confirmation; Prisma schema/migrations; private asset descriptor/proof; P4 policy/facade. Read-only searches of some guessed filenames/wildcard paths failed (nonexistent singular publication domain filename / authority-queries; Windows glob path syntax); corrected to actual resource domain and directory `-g` search. No functional tests executed because this assignment only defines contracts. Node filesystem structural check: 2 local links, zero missing targets, zero trailing-whitespace lines, exit 0.

## Outcome and handoff

Contract sent directly to `/root/red_management` and coordinator. First action: RED domain/schema and complete publish journey, then implementation by disjoint modules. Coordinator owns shared roadmap. No commits created, no implementation claimed. Engram persistence unavailable in this scoped task; this repository record carries the contract.

Recovery clarification communicated separately: dispatched generation with absent/unrecoverable bytes uses `PROVIDER_OUTCOME_UNKNOWN`; earlier message label `GENERATION_INTERRUPTED` was inconsistent and must not replace existing RED/documented code.
