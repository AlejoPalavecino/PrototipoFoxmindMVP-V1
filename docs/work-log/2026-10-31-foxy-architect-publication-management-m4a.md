# Foxy M4A — management read, command service and HTTP

- Agent / role: /root/foxy_architect / architect
- Session / task ID: /root/foxy_architect (M4A service/routes RED contract)
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Observed base: e9e8070; concurrent cleanup lifecycle/runtime and tests preserved
- Phase: text material preparation/publication recovery only; no images/diagrams
- Status: completed (design only; no implementation/behavioral acceptance)
- ESTADO_DISENO: LISTO_PARA_TDD_RED

## Scope and evidence

Read actual domain resource/management DTOs, M0 policy, management retry/discard/scopes repositories, publication service, http-routes/input/handler and tests. Existing M1/M2 receipts and M3 cleanup remain their owners' work. Only this own record is written; no production/test/DB/provider/browser/secret use. Earlier recovery direction is in the [management/recovery design](2026-10-31-foxy-architect-publication-recovery.md).

The first cut adds a read projection and a narrow service. Next cut exposes three routes and composes that service. Existing GET publication inspection and its DTO remain unchanged. Proxy/client/controller/UI are separate later units; backend endpoint acceptance alone does not complete the teacher flow.

## Exact existing DTOs — reuse domain barrel

```ts
FoxyPublicationManagement = {
  publicationId: string;
  publicationRevision: string;
  canRetry: boolean;
  retryReason: FoxyPublicationRetryReason | null;
  canDiscard: boolean;
  cleanupState: FoxyPublicationCleanupState;
};
FoxyPublicationRetryReason = 'STATE' | 'SOURCE_CHANGED' | 'DESTINATION_UNAVAILABLE'
  | 'INVALID_RESOURCE' | 'REFERENCED' | 'BUSY' | 'CONTENT_REJECTED' | 'FILE_UNAVAILABLE';
FoxyPublicationCleanupState = 'NOT_REQUESTED' | 'PENDING' | 'FAILED' | 'DONE';
RetryFoxyPublication = {requestId: string; publicationRevision: string};
DiscardFoxyPublication = RetryFoxyPublication & {confirm: true};
FoxyPublicationCommandReceipt = {
  publicationId: string; action: 'RETRY' | 'DISCARD'; publicationRevision: string;
};
```

These types/parsers already exist; do not redefine them privately in transport. Strict decimal bigint revision, UUID, unknown-key and explicit confirmation validation remain the accepted parsers. Commands do not accept ownerId,fileId,classroomId, resource/snapshot content, cleanup/error/lease fields or a replacement publication ID.

A command receipt is immutable APPLIED revision from that command; a replay can return an older receipt after a worker/later discard advanced current state. It makes no assertion about current PREPARING/READY/PUBLISHED/DISCARDED or quota. The client must inspect current state separately, never synthesize it from action+receipt.

## M4A1 read repository and service — first small RED

Add inspect(tx:SqlTransaction,actorId:string,publicationId:string):Promise<FoxyPublicationManagement> to createFoxyPublicationManagementRepository. Delegate its cohesive read to a new publication-management-inspection.ts if needed to keep each file under200 lines. Return NOT_FOUND on absent/unauthorized publication, matching existing object concealment. Do not call lockFoxyManagementScopes from GET: it takes write locks/admission and is a mutation helper.

Read authorization matches current publication inspection: owner is current verified teacher, undeleted conversation with same owner, current source-classroom ownership when classroom context, current destination-classroom ownership. Archived destination remains visible; archive is a retry limitation, not a read/discard prohibition. Missing/deleted unit/topic and stale resource revision do not remove read access. Never create new rights to a revoked source.

Use one coherent SQL statement over authorized publication/resource/conversation/target and LEFT file/upload/custody, with EXISTS reference/proof facts, rather than derive policy from another public DTO. No FOR UPDATE/admission locks, storage, render, scanner, worker or provider calls. UoW read authentication still obtains its existing user lock/revalidations. Capabilities are advisory and command POST rechecks all current facts under M1/M2 locks.

Facts use RAW p.error_code: the existing public inspection maps an unknown failure to FILE_NOT_READY; reusing that sanitized value would incorrectly enable a retry forbidden by M0's fail-closed allowlist. Source current is actual r.revision=p.resource_revision; destination usability is actual archive state; associations use actual owned unit/topic existence. Renderer compatibility uses FOXY_PDF_RENDERER_VERSION. File facts use actual phase/status/reservationReleased/blobDeleted, database proof identity/digest/content/scan completion and clock-based lease. No-file means p.file_id actually NULL; a malformed nonnull file binding/missing required row is SERVICE_UNAVAILABLE with no capabilities rather than fabricated file absence/DONE.

Reference fact includes ANY materials row, every plan version/instruction/attempt attachment and another publication; only this publication's own artifact reference is ignored. Public payload never includes those references' names/counts, raw error, digest, key, fileId, snapshot, nonce or timestamps. Reuse decideFoxyPublicationManagement, then explicitly construct the seven-field DTO from public publication ID/revision and the four policy outputs. M0 already defines exact precedence and excludes unknown failure codes.

New createFoxyPublicationManagementService({uow,management}) in publication-management-service.ts:

```ts
{
  inspect(request:unknown,publicationId:string):Promise<FoxyPublicationManagement>;
  retry(request:unknown,publicationId:string,input:unknown):Promise<FoxyPublicationCommandReceipt>;
  discard(request:unknown,publicationId:string,input:unknown):Promise<FoxyPublicationCommandReceipt>;
}
```

inspect validates ID and runs uow.run(request,false,(tx,actor)=>management.inspect(tx,actor.id,id)). retry/discard validate ID and existing strict input parser BEFORE running uow.run(request,true,...). Each uses the exact request, actor from uow and one caller-owned transaction; delegates existing repository retry/discard without pre-running stale policy or generating a UUID. Explicitly project receipt's three public fields, with expected action and identity guaranteed by the repository result; reject an inconsistent result instead of spreading it. No source snapshots/cleanup ports in service options.

M4A1 RED: exact seven fields and no leakage from extra internal columns; all M0 fact categories reflected; unknown raw error/null cannot enable retry even though old public inspection would sanitize it; READY/file proof/reservation/renderer cases match M2 policy; archived/stale/deleted-association visibility versus canRetry; wrong owner/source revocation/missing conversation404; malformed file binding fails closed and never shows DONE; uow read=false and mutation=true; same request/actor/tx; parse rejects before mutation; receipt projection/no UUID generation; existing first/replay/CAS error behavior preserved.

## M4A2 routes and runtime composition — next unit

Mount sibling runtime services.publicationManagement=createFoxyPublicationManagementService({uow,management:createFoxyPublicationManagementRepository()}). Leave services.publications and existing prepare/list/inspect/confirm contracts intact; no unrelated child-controller changes. Export factory through the Foxy public entry where composition requires it. Runtime owner is exclusive while M3 review is active; coordinator assigns the short wiring after review or as a separate noncolliding handoff.

Extend FoxyHttpServices with that service and route matching in http-routes.ts (or a small dedicated route helper if size demands). Paths under /api/v1/foxy-ai:

| Route | Body/query | Status/result |
| --- | --- | --- |
| GET /publications/:id/management | no query keys | 200 seven-field FoxyPublicationManagement |
| POST /publications/:id/retry | exact RetryFoxyPublication; no query keys | 200 three-field receipt, first and replay |
| POST /publications/:id/discard | exact DiscardFoxyPublication; no query keys | 200 three-field receipt, first and replay |

Existing GET /publications/:id still returns FoxyPublicationInspection, whose errorCode concerns preparation only. POST200 acknowledges the durable transaction, not finished preparation or physical deletion; do not return an invented synchronous material or released-byte count. Wrong methods keep the current route policy404 rather than introduce a separate405 policy. Recognized invalid UUID400, unknown path404, duplicate/unknown query400. Reuse existing body content type/size/time limits and strict JSON parsers; no new arbitrary proxy limits.

The current handler's admit runs before service and supplies actual session/general admission, origin/CSRF on writes. UoW reauthenticates teacher/email and owner scope in transaction. Tests must cover actual read=false/write=true admission rather than only a raw repository call. Safe errors: invalid input (400), missing authentication (401), forbidden or invalid origin (403), hidden object (404), conflict (409), rate limit (429) and generic service failure (503). Existing safe no-store/nosniff/JSON headers apply; never return raw database or storage diagnostics. No endpoint invokes sweep/worker start/stop or storage directly.

M4A2 RED: each exact path/method/body dispatches once with original request/id; valid first/replay status200; missing session/teacher/email/CSRF/origin and hidden object; invalid ID, unknown/duplicate query, malformed/non-JSON/oversize/unknown-key input zero service calls; wrong method/path; sanitized error and headers; revoked source/archived target/stale CAS; after retry, inspect actual current revision/state instead of guessing; after discard, no preview/read/confirm resurrection and management cleanup remains pending until actual marker. Old publication endpoint tests remain valid unchanged.

## State separation for later UI

publication.state describes the preparation lifecycle; management.cleanupState describes only physical removal requested by explicit discard. They are independent, not a flat combined status:

| Preparation | Cleanup | Meaning/UI |
| --- | --- | --- |
| FAILED | NOT_REQUESTED | Preparation failed. Reintentar preparación only when canRetry; Descartar only when canDiscard. |
| PREPARING/READY/PUBLISHED | NOT_REQUESTED | Usual existing flow; no cleanup claim implied. PUBLISHED is managed from Library. |
| DISCARDED | PENDING | Preparation revoked; file/space removal pending. No preview, confirmation or preparation retry. |
| DISCARDED | FAILED | Still discarded. Safe cleanup failed/blocked; quota retained. Do not call this a new failed preparation. |
| DISCARDED | DONE | No allocation existed or blob_deleted_at was committed after removal ACK. Resource/chat answer still retained. |

No DONE from phase deleting, expired lease, storage failure, receipt or elapsed90seconds. Public management has no cleanup failure reason beyond safe FAILED, so UI must not invent a storage diagnosis; say space could not yet be released. A live lease is not percentage progress. No new byte estimate is needed; actual classroom usage remains authoritative.

Later management controller requests management for the currently inspected publication and requires ID/publicationRevision equality before enabling an action. A mismatch refreshes inspection under serial/fenced reads, not a retry loop or mutation. Selecting a discarded pending/error preparation may poll management at five seconds even though existing R2B PREPARING polling has stopped. DONE stops that cleanup polling. Use one coalesced read and selection/subject epoch; no cleanup version fabrication or writes on poll. POST always rechecks capabilities, so a stale button cannot bypass CAS/auth.

The uncertain command action keeps its private original UUID/CAS/body for Reintentar solicitud. Reintentar preparación is a new user command against a freshly confirmed FAILED revision and differs from repeating an unknown request. Explicit discard requires review/confirm true and warns that saved resource is retained and quota releases only after removal; no automatic deletion or new preparation. Client/proxy/controller/UI changes remain next assigned units, not part of this backend-first M4A proof.

## Ownership, checks and handoff

First worker owns new inspection/service helper plus management repo's small inspect export; test_runner owns tests. Next transport owner edits routes/type and exclusive runtime wiring; later owner handles web proxy/client. Do not edit current M3 lifecycle files concurrently or modify accepted M0/M1/M2 behavior to make projections easy. Use existing domain contracts and public barrels across slices; reviewed units under400 lines.

Source/Git inspection and PowerShell structural/link check passed: one local link resolves, no trailing whitespace or zero-width characters. Guessed read paths publication-retry.ts and http-publications.ts/integration.ts were absent and were corrected to actual publication-management-retry.ts/http-routes.ts/host.ts. No functional/DB/provider/browser execution by architect. Engram host persistence remains unavailable from previously observed unregistered-session hook failure; this own record is the durable handoff.

First unfinished work: M4A1 read/service RED, M4A2 HTTP and runtime integration RED, then proxy/client/companion UI and actual synthetic retry/discard/quota/browser QA. Design readiness does not declare this feature complete.
