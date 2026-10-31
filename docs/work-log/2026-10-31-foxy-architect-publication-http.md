# Foxy publication service and HTTP — architecture contract

- Agent / role: /root/foxy_architect / architect
- Session or task ID: /root/foxy_architect (publication service/HTTP design)
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: bc2c7b6; concurrent E2 repository/schema candidate preserved
- Phase: Foxy F7, service and HTTP preparation/inspection/confirmation
- Status: completed (design only; behavioral RED/GREEN not run here)

## Request and scope

Design the next actionable service/HTTP slice over P1 and candidate E2; teacher access, safe DTOs/errors, replay and subsequent web integration. Write only this design record. No production changes, retained database, secrets or provider calls.

## Inspected evidence

Read current Foxy HTTP/router/input, host authentication and UoW, resource service and its tests, publication P1 repository, E2 confirmation repository candidate, runtime and worker, shared resource parsers, web Foxy proxy/client and selected tests. Actual P1 get only filters publication owner, so it cannot be exposed as an authorization-complete status endpoint. Current web proxy does not allow resource or publication routes; resource HTTP exists only directly at API. Current worker stores AI_INPUT_LIMIT, INVALID_INPUT or FILE_NOT_READY on its handled failures; generic quota/scanner/provider-specific explanations are not currently preserved and must not be invented by HTTP.

## First RED handoff

E3A createFoxyPublicationService({uow,publications,confirmations}) exposes prepare(request,resourceId,input), inspect(request,publicationId) and confirm(request,publicationId,input). First/third use write UoW and existing strict parsers; inspect uses read UoW and a new authorization-complete publications.inspect query. prepare returns unchanged P1 {created,publication}; inspect returns {publication,classroomRevision,classroomArchived,errorCode}; confirm returns the exact E2 four-field receipt. No worker, renderer or storage work inside these methods. Communicated to coordinator before HTTP/proxy details were finalized.

## Shared contract and service, E3A

Declare the response types in the existing domain resource contract and export through its current public barrel. Reuse PrepareFoxyPublication and ConfirmFoxyPublication and their strict parsers. No replacement shape for the already-reviewed E2 receipt.

```ts
type FoxyPublicationState = 'PREPARING' | 'READY' | 'FAILED' | 'PUBLISHED';
type FoxyPublicationSummary = {
  id: string; resourceId: string; resourceRevision: string;
  classroomId: string; unitId: string | null; topicId: string | null;
  title: string; state: FoxyPublicationState; revision: string;
};
type FoxyPublicationInspection = {
  publication: FoxyPublicationSummary;
  classroomRevision: string;
  classroomArchived: boolean;
  errorCode: 'AI_INPUT_LIMIT' | 'INVALID_INPUT' | 'FILE_NOT_READY' | null;
};
type FoxyPublicationConfirmation = {
  publicationId: string; materialId: string;
  publicationRevision: string; classroomRevision: string;
};
```

prepare returns {created:boolean,publication:FoxyPublicationSummary}; inspect returns FoxyPublicationInspection; confirm returns FoxyPublicationConfirmation. Keep the nine existing P1 summary fields to preserve its contract and tests. Public projections explicitly select these keys, not spread raw rows. Never include snapshot text, file ID, storage key, digest, lease, nonce, operation ID, raw renderer/scanner errors or arbitrary durable error strings.

The factory receives the actual UoW, P1 repository and accepted E2 confirmation repository. Normalize UUIDs and parse/copy input before the first await so callers cannot change request UUID, revisions or destination during authentication. Actual actor.id comes only from UoW. Both mutations run with write=true, including replay. Inspection uses read=false and the same actual authenticated request. Service does not start/stop workers, generate files, invoke a provider or inspect storage synchronously.

Add repository inspect(tx,ownerId,publicationId):Promise<FoxyPublicationInspection|null>. Use one SQL projection that joins the owner's publication to its owned resource and nondeleted owned conversation, owned destination classroom and owned source classroom when context is CLASSROOM. Recheck the actual fixed context, not a caller classroom claim. Missing or inaccessible yields null/NOT_FOUND. Teacher UoW already checks current role/verification and reauthenticates before and after the operation. Preserve read history after resource edits or source/destination archive; current resource revision and active destination are requirements for a NEW confirm, not for displaying history. Return the actual destination revision as a decimal string and actual archive boolean; these are an observation, not a promise that later CAS succeeds.

For FAILED, expose a stored code only when it is one of the three actual worker codes above; any unknown value becomes FILE_NOT_READY. For other states errorCode=null. FAILED is a valid resource representation, not an HTTP 5xx. Do not infer quota/scanner details that the current worker did not retain. A later change that preserves additional safe failure reasons needs its own contract/tests.

P1 prepare must keep its matching replay semantics, including later resource edit and destination archive while current ownership/access remains. Add tests for destination ownership loss and changed-payload reused request IDs. A known owner/request uniqueness conflict must be CONFLICT with rollback, not raw PG23505 or fabricated success; unrelated SQL failures remain SERVICE_UNAVAILABLE. Do not return a prior publication that is now inaccessible merely because its request key matches.

Runtime composes the service outside text-generation enablement. Construct createLibraryMaterialPublisher({files:options.files.store}) through classrooms/public/index.ts, feed it to E2, and include services.publications. No new API secret, provider selection or environment flag. With AI disabled, existing resource preparation/history/confirmation remain available and the independent publication worker continues its existing lifecycle.

## HTTP, E3B

All paths below include the existing /api/v1/foxy-ai prefix. Add a small publication-route helper rather than growing the main router beyond the project file limit; keep cross-module imports at public barrels.

| Method and path suffix | Body / query | Result |
|---|---|---|
| POST /resources/:resourceId/publications | Existing parsePrepareFoxyPublication; no query | 202 for newly created private preparation; 200 matching replay; unchanged {created,publication} |
| GET /publications/:publicationId | No query | 200 FoxyPublicationInspection, including FAILED |
| POST /publications/:publicationId/confirm | Existing parseConfirmFoxyPublication; no query | 200 exact E2 four-field receipt, both original success and matching replay |

IDs use the existing strict UUID parser; unknown/duplicate query keys fail before the service. POST uses the existing JSON reader: 1 MiB, strict UTF-8, no content encoding, 10-second incomplete-body limit. Preserve handler 16 active slots and existing proxy/API time budgets. No wait for render/scan in POST prepare. No publication from GET or preparation; only confirm may create the student-visible material.

Keep installFoxyTransport's existing full-path mount, actual identity admission and teacher/email check. Both POSTs require the actual session, allowed Origin and session-bound CSRF even on replay. Never derive request authentication from owner fields in a publication row. Direct service calls retain UoW authorization, so transport admission alone is not the security boundary. Students cannot use any of these paths.

Preserve no-store, nosniff and sanitized {error:{code}}. Current mapping applies: AUTH_REQUIRED 401; role/email/Origin/CSRF failures 403; INVALID_INPUT 400; PAYLOAD_TOO_LARGE 413; NOT_FOUND 404; CONFLICT and FILE_NOT_READY 409; RATE_LIMITED 429; unexpected/DB failure SERVICE_UNAVAILABLE 503. If QUOTA_EXCEEDED is propagated by a future accepted service path, explicitly map it to 409 rather than defaulting to 503. Do not claim this is currently retained by the asynchronous publication worker. Wrong methods may keep the API's existing missing-route 404 behavior; the web proxy's existing method rejection remains 405.

## Web transport follow-up, E3C

The current web proxy whitelist rejects the existing resource routes, so backend HTTP alone does not make the journey reachable from web. Add only exact UUID-bounded paths/methods:

- POST /conversations/:conversationId/turns/:turnId/resource.
- GET/PATCH /resources/:resourceId.
- POST /resources/:resourceId/publications.
- GET /publications/:publicationId.
- POST /publications/:publicationId/confirm.

All have empty query whitelists. Preserve traversal/encoding rejection, content/method validation, cookie/Origin/CSRF forwarding, safe expired-session cookie clearing, redirect rejection, actual response status, 1 MiB request limit, 2 MiB JSON limit, 30-second JSON deadline and no-store. Do not introduce a generic resources/* or publications/* forwarder. File preview is a separate binary path below. No frontend component edits are required for E3A/B; assign E3C separately to avoid colliding with API work.

## Private artifact inspection, later E3D

Required before the final review/publish UI closes: GET /publications/:publicationId/file?mode=preview|download, default download. Expose only the publication ID in the path; never caller fileId or a storage URL. The read service uses the real request and existing FileService.read, not a durable worker capability or a fabricated session.

Resolve a current authorized private descriptor in read UoW; require READY or live PUBLISHED and the DB-backed artifact binding/proof. PREPARING/FAILED is FILE_NOT_READY; deleted/inaccessible publication/material/blob is NOT_FOUND. PUBLISHED requires the bound material live; READY may expose its frozen older resource revision to the still-authorized teacher for review, while confirmation freshness remains separate. Allow archived-classroom read history.

Perform FileService.read outside SQL transactions. Copy/bound returned bytes, verify expected size and SHA-256, then resolve/revalidate descriptor and permissions in a second read UoW before returning any bytes, as the existing citation reader does. Descriptor binding/state/revision changes, revocation or conversation/material deletion during I/O deny; never leak a stale success. No locks held during storage I/O. Unknown errors stay sanitized; actual identity errors remain authentication errors.

Return only PDF or octet-stream bytes with safe constant disposition (inline for PDF preview, attachment for download), no-store, nosniff, same-origin CORP and existing sandbox CSP. Reuse the handler binary branch. Add this exact path to proxy binary selection and mode query validation; preserve its existing 50 MB ceiling and 60-second deadline rather than enlarging limits. Actual text PDFs remain limited by the renderer's 10 MiB ceiling. A model-provided title is not a URL or filename header.

## Recovering preparations after reload, later E3E

Before declaring frontend recovery complete, add GET /resources/:resourceId/publications?limit=20&afterId=<uuid>. This returns {items:FoxyPublicationSummary[],nextAfterId:string|null}; limit 1..50, server fetches limit+1. Authorize the current owner/resource/conversation and source context first, then include only currently owned destination classrooms, preserving archived historical preparations. An afterId must resolve inside the same authorized resource/list scope; absent/foreign cursor is INVALID_INPUT or NOT_FOUND without details.

Order by created_at DESC,id DESC. The cursor carries only the last ID; resolve its exact stored created_at in SQL and compare the timestamp/ID tuple there, avoiding precision loss by serializing TIMESTAMPTZ(6) through JS Date milliseconds. Include PREPARING/READY/FAILED/PUBLISHED; query the selected item's inspection separately. No snapshot/bytes in list and no synthetic recovery based on a new request UUID. This is a separate repository/service/route/proxy cut, not required to start E3A/B.

## RED and verification ownership

E3A tests use synthetic PostgreSQL, actual repositories and UoW with scoped authentication fixtures. Test exact DTO keys, creator read/write and foreign/student/unverified denial, lost source/destination ownership and deleted conversation. Inspection must remain readable after archive/resource edit, preserve bigint strings and sanitize unknown durable errors. Make storage/scanner/provider/worker ports throw if touched. New inspect must not expose P1 get's owner-only access gap. Prepare/confirm replay remains durable and CAS-sensitive exactly as earlier contracts. Mutating the caller object while authentication awaits cannot change the sent operation. Runtime without AI/provider still exposes services.publications and uses the current independent publisher.

E3B route tests use small service spies: statuses 202/200/200, exact IDs/body and actual IncomingMessage forwarded, malformed IDs/extra fields/query/UTF-8/content type rejected before service, safe known/unexpected errors, no-store/nosniff and no synchronous work trigger. Retain existing resource/chat/citation HTTP regression. Pure admission spies prove dispatch contracts only: add one mounted integration with real synthetic teacher/student sessions, actual Origin and session-bound CSRF; student/anonymous/invalid-CSRF calls must reach no publication service, and a teacher's accepted prepare/inspect/confirm path uses the same real request.

E3C proxy tests exercise every new exact method/path, preserve request bytes/request UUIDs/revisions and CSRF/cookies, forward 202/200/409/404, reject unsupported children/methods/query/encoded traversal, and retain existing redirect/size/deadline/expired-cookie behavior. No browser QA is claimed for backend/proxy-only changes; UI dogfooding follows actual UI implementation.

E3D tests: real FileService plus bounded synthetic storage; ready preview/download hash and headers; not-ready and missing/foreign denial; source/destination revocation, material deletion, conversation deletion, byte tamper and artifact/revision change during a gated read; no bytes returned on any failed post-check. E3E tests: page boundary and same-timestamp ordering, exact cursor continuation, missing/foreign cursors, per-owner/resource/destination isolation and bounded DTOs.

Subsequent frontend client/controller tests: fresh CSRF, shared abort, serial polling only while PREPARING, no overlapping requests, stop/ignore late results on identity/resource changes, and no automatic POST retries. Preserve the exact request UUID/body and both revisions after network uncertainty; manually retry that same request. A definitive 409 requires refresh and a new explicit user confirmation if changing CAS values, with a new request UUID. Never reuse one UUID with updated payload. A replay receipt carries the historical commit revision, so do not replace a newer fetched classroom revision with an older receipt. Preserve unsaved edits and show current pinned resource revision/destination before explicit student-visibility confirmation. After final acceptance, verify student Library visibility with synthetic data.

## Verification

Read-only inspection and git status/rev-parse. Some initial guessed filenames were absent and some broad output was truncated; follow-up concrete reads located actual repository/parser sources. No tests, database, migration, provider or secrets executed. Production files were not edited by this architect.

Own document structural check exited 0: no trailing whitespace and both relative Markdown links resolve. Functional tests were not needed for this design-only change; all behavioral cases above are prescribed RED and independent verification, not observed PASS claims.

## Commits and handoff

No commit by this agent. First next task: E3A RED, then service and authorized inspection implementation, followed by E3B routing and E3C proxy in disjoint edit surfaces. Candidate E2 must pass its own independent review before runtime service wiring. Private PDF inspection and durable preparation discovery are subsequent explicit cuts before frontend completion. Shared roadmap is coordinator-owned. This builds on the [confirmation contract](2026-10-31-foxy-architect-publication-confirmation.md) and [authorized feature scope](../../odd/tasks/foxy-ai-proposal.md).
