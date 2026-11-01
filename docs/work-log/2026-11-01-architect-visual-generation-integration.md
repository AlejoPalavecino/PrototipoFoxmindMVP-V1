# Foxy visual generation — one integrated delivery

- Agent / role: /root/architect_next / architect.
- Session ID: unavailable; actual task identity /root/architect_next.
- Date: 2026-11-01.
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai.
- Starting commit observed: 333620f.
- Phase/spec: visual generation integration, following [provider/budget](2026-11-01-architect-image-provider-budget.md) and [private read/discard](2026-11-01-architect-private-asset-read-discard.md).
- Status: completed (design only).
- ESTADO_DISENO: LISTO_PARA_TDD_RED for the integrated private visual-generation journey.

## Request and scope

Define one concrete integrated IMAGE+DIAGRAM journey, from accepted request through durable budget, provider and real custody to readable private artifact. Avoid completing isolated helpers as if they were product delivery. Only this architecture record changes; preserve concurrent read/transport/discard work. No production code, credentials, calls to real providers or retained data.

## Current facts

IMAGE adapter, response bounds, pure quote, safe diagram renderer, private reservation/custody and read implementation exist. Diagram provider adapter, durable visual jobs/shared budget/runtime and visual transport are not implemented. Existing text claim authority is tied to foxy_turns; reusing its security rules does not mean it can already authorize a visual job. Shared AI monetary ledger and active-job lists currently exclude visuals.

## One delivery and acceptance boundary

Deliver BOTH kinds through `POST /api/v1/foxy-ai/conversations/:id/visuals` ->durable job/budget ->one provider generation ->real private custody ->READY+assetId ->existing authorized private preview, including reload. `GET .../visuals/:jobId` polls; `GET .../visuals?limit&afterId` lists the same conversation's jobs. POST returns202 when created/200 on exact replay; GET200. Keep existing StartFoxyVisual parser/selection/context rules; no ad hoc prompt endpoint. No endpoint is declared done before worker/runtime/reader are composed. Reviewable commits may be small; the completion claim is this whole journey, not a parser/queue milestone.

This makes images/diagrams privately usable. Raster publication still needs the already-designed typed source/artifact branch V-P1, and must follow in the original feature before main integration. Physical cleanup remains independently disabled until remote fence proof; do not block safe generation/preview on speculative cleanup implementation.

## Exact public contracts

```ts
type FoxyVisualJobState='QUEUED'|'RUNNING'|'READY'|'FAILED';
interface FoxyVisualJobView {
  id:string;conversationId:string;kind:FoxyVisualKind;aspectRatio:FoxyAspectRatio;
  state:FoxyVisualJobState;assetId:string;errorCode:string|null;createdAt:string;
}
interface FoxyVisualLease {
  jobId:string;assetId:string;ownerId:string;conversationId:string;leaseNonce:string;
}
createFoxyVisualService({uow,conversations,jobs,configuration}): {
  start(request:unknown,conversationId:string,input:unknown)
    :Promise<{created:boolean;job:FoxyVisualJobView;conversationRevision:string}>;
  get(request:unknown,conversationId:string,jobId:string):Promise<FoxyVisualJobView>;
  list(request:unknown,conversationId:string,page:{limit:number;afterId:string|null})
    :Promise<{items:FoxyVisualJobView[];nextAfterId:string|null}>;
};
createFoxyVisualRepository({assets,privateQuotaBytes}): {
  enqueue(tx:SqlTransaction,ownerId:string,conversationId:string,
    input:StartFoxyVisual,snapshot:FoxyGroundingSnapshot,profile:FoxyVisualProfile)
    :Promise<{created:boolean;job:FoxyVisualJobView;conversationRevision:string}>;
  get(tx:SqlTransaction,ownerId:string,conversationId:string,jobId:string)
    :Promise<FoxyVisualJobView|null>;
  list(tx:SqlTransaction,ownerId:string,conversationId:string,page:{limit:number;afterId:string|null})
    :Promise<{items:FoxyVisualJobView[];nextAfterId:string|null}>;
};
createFoxyVisualQueue({database,configuration}): {
  claim():Promise<FoxyVisualLease|null>;
  renew(lease:FoxyVisualLease):Promise<boolean>;
  recoverExpired():Promise<number>;
};
createFoxyVisualBudget({limits}): {
  reserve(tx:SqlTransaction,lease:FoxyVisualLease,preflightTokens:number)
    :Promise<'RESERVED'|'ALREADY_DISPATCHED'|'NO_BUDGET'|'NOT_CURRENT'>;
  settle(tx:SqlTransaction,lease:FoxyVisualLease,usage?:FoxyImageUsage|null):Promise<boolean>;
  settleExpired(tx:SqlTransaction,jobId:string):Promise<boolean>;
};
createFoxyVisualCompletion({database,budget}): {
  finish(lease:FoxyVisualLease,result:{state:'READY'}|
    {state:'FAILED';errorCode:string;usage?:FoxyImageUsage|null}):Promise<boolean>;
};
createFoxyVisualWorker({database,queue,authority,loader,providers,renderer,custody,budget,completion,configuration}): {
  runOnce():Promise<boolean>;onModuleInit():void;onModuleDestroy():Promise<void>;
};
```

Configuration exact shape: `{enabled:{IMAGE:boolean,DIAGRAM:boolean},profiles:{IMAGE:FoxyVisualProfile|null,DIAGRAM:FoxyVisualProfile|null},privateQuotaBytes:bigint,maxConcurrency:number,maxJobAgeMs:number,deadlineMs:number}`. Budget `limits` is exactly `{dailyBudgetUsd:number,dailyActorRequests:number,dailyGlobalRequests:number}`. deadlineMs is outer-worker bound, safe positive<=180000; provider call<=30000 and custody<=120000, never a synchronous long HTTP request. Constructor subsets may consume only relevant fields.

FoxyVisualProfile base is `{kind,model,profileVersion,maxInputTokens,maxOutputTokens,inputUsdPerMillion:string,outputUsdPerMillion:string}` with IMAGE additionally `{textOutputUsdPerMillion:string,imageOutputUsdPerMillion:string}`; outputUsdPerMillion is the EFFECTIVE maximum output rate, not generic text pricing. IMAGE literals: kind IMAGE/model gemini-3.1-flash-lite-image/profileVersion foxy-gemini-image-v1; DIAGRAM literals: kind DIAGRAM/profileVersion foxy-diagram-provider-v1, model is the configured structured-text model. Caps1..65536/1..4096. No new key/provider. Preserve independent capability gates; disabled IMAGE must not disable DIAGRAM/reads. Repository receives explicit privateQuotaBytes; no hidden numerical default.

## Durable identity and smallest schema

One additive migration creates foxy_visual_jobs: id/owner/conversation/request IDs; UNIQUE(owner_id,request_id); asset_id UNIQUE plus composite owner/context FKs; input_hash; immutable prompt/kind/ratio/selection and actual grounding snapshot; frozen provider/profile/rates/caps; state/revision/error_code; created/updated timestamps; lease_nonce/until; dispatch_count constrained0..1,dispatch_started_at; reserved_microusd,usage_day,input_tokens,output_tokens plus preflight_tokens. No binary image, key credential or student data in job JSON/logs. Generic ledger helper column names are preserved deliberately. SQL guards forbid identity/profile replacement, nonce theft, terminal resurrection and dispatch_count decrement; all transition returns are explicitly typed boolean.

Enqueue hashes the FULL normalized request (conversation,revision,kind,prompt,selection,ratio), checks current ownership/session/context and exact replay before enabling/quota/CAS checks, then reserves existing10MiB asset and inserts job in SAME transaction. asset.request_id uses the same requestId. Increment conversation revision once with CAS; rejection rolls back both job and byte reservation. A collision with a different full job hash conflicts even if the asset's narrower reservation hash matches. Replay returns the original job and conversation receipt, no new asset/provider/budget debit. Public get/list always checks current conversation ownership; pages<=50 and bounded JSON, no raw snapshot/price/lease/prompt leakage beyond intended owner-visible input.

## Budget: reuse the current ledger, avoid a second subsystem

No generic budget rewrite is required. Extend existing BudgetTable allowlist with foxy_visual_jobs and wrap reserveAiTextBudget/settleAiTextBudget using a VISUAL effective configuration: count argument=inputTokenCap, maxOutputTokens=outputCap, frozen input rate and MAX output modality rate. This computes the already-approved conservative quote for every billed output token. The helper name does not require charging image tokens at the text rate. Validate canonical decimal strings with the existing quote parser; assert helper-computed reservation exactly matches quoteFoxyImageBudget for IMAGE before dispatch, rejecting invalid conversion/config rather than under-reserving. Store effective frozen rates in existing numeric fields and original canonical rate/profile JSON for audit. Existing text callers/config/results remain unchanged.

Use SAME ai_usage_daily capability, actor/global rows and advisory78123001. No independent visual allowance or currency counter. reserve sets the dispatch marker/count1 atomically BEFORE provider call. settle uses complete total input/output (including thoughts) at frozen effective maximum; invalid/missing/uncertain usage consumes full reservation. Preserve original usage_day across midnight/restart and exact-once reserved->consumed transition. Store actual job input_tokens after known settlement; keep preflight_tokens separately instead of mislabeling input-cap reservation as actual usage.

Visual RUNNING rows must be added to global AND per-owner active checks in every existing queue (Foxy, curriculum, activity, individual-student, grading), under shared advisory78123002. Changing only the new queue creates a bypass. Preserve current lock order; where both shared locks are needed use78123002 before78123001, short transactions and no external I/O. Focus regressions on cross-feature contention rather than refactoring all queue implementations into a new framework.

## One lease and one real worker path

Job and its private asset share the SAME fresh nonce/90s lease, acquired/renewed atomically under user->source room->conversation->job/asset locks. Claim changes QUEUED/RESERVED to RUNNING/PROCESSING; shared concurrency admission happens once. Renew every30s; no independently advancing job/asset nonce. The worker owns one outer heartbeat during load/count/generate; hand off serial renewal to existing custody lifecycle (renew immediately then30s) before receive/recover, using an adapter from its asset lease to queue.renew. Drain the outer heartbeat before handoff; do not run competing independent renewers. Overall bounded work uses accepted job-age/deadline policies; provider call<=30s, custody<=120s, never a synchronous long POST.

`createFoxyVisualClaimAuthority({database,maxJobAgeMs,assets})`, where assets is the existing private asset authority, exposes the SAME open/authorizeClaim/authorizeDocument/revalidateGrounding/close port as text authority. open returns existing structured snapshot/capability/documents PLUS `job:{id,assetId,kind,prompt,aspectRatio,profile,dispatchCount}` and `assetCapability:object`. All derive from the SAME persisted visual/asset nonce; close closes both scopes. Reuse createFoxyDurableLoader.load(scope,signal) and Files' public createDurableFoxyDocumentReader with those ports; no fake foxy_turns or new extractor. Use accepted grounding projection for GENERAL or selected classroom plan/material/past activities, without UUIDs/student data/URLs. Extend existing asset authority's linked-job check so every bind/proof/finalization transaction requires associated job RUNNING, matching nonce and fresh selected-source snapshot; standalone synthetic assets keep their test path. Classroom ownership alone is insufficient for a stale generation job.

Worker ports are explicit: providers.IMAGE is the existing countTokens/generate over FoxyImageInput yielding FoxyImageResponse; providers.DIAGRAM has the same input/count port yielding `{diagram:FoxyDiagram,usage:FoxyImageUsage|null}`. Renderer uses existing render({diagram,aspectRatio,signal}). Custody is Pick<existing private facade,'receive'|'recover'> and receives scope.assetCapability. completion.finish(lease,result) is the terminal writer; READY verifies current linked asset proof and fresh source/nonce; FAILED settles any outstanding reservation conservatively, including after access revocation. It returns strict boolean, never implicit void. Worker invokes budget.settle on known provider response before custody; completion/recovery settlement is idempotent when reservation already zero.

Worker sequence: claim ->load/parse authorized sources ->project exact IMAGE/DIAGRAM input ->count with the SAME selected provider ->revalidate source/job/asset fences ->reserve ledger/dispatch1 ->generate ONCE outside SQL ->settle money even if later custody fails ->IMAGE bytes or parsed DIAGRAM JSON+existing PNG renderer ->real inspector/scanner/conditional PUT/readback custody ->verify asset READY ->mark job READY with assetId. For IMAGE title defaults to safe app text and description to reviewed prompt; no untrusted companion model text is promoted to metadata. Teacher can refine display text in the later material flow. DIAGRAM title/description come from validated graph. Never skip native scan for generated bytes.

Add minimal `GeminiFoxyDiagramAdapter({client,configuration})` in AI: same countTokens/generate ticket discipline as IMAGE, input identical shared visual grounding shape, JSON schema for FoxyDiagram, parseFoxyDiagram plus1..30nodes/60edges, safe usage accounting. It returns `{diagram:FoxyDiagram,usage:FoxyImageUsage|null}`, no pixels/markup. IMAGE adapter already exists. No separate graph library, prompt-planning model call or third provider stage.

## Crash/failure behavior

Never auto-redrive generate after dispatch_count1, even if no response or a configuration change occurs. Provider ambiguity consumes full quote. Expired work may recover only exact bound storage bytes through existing custody (or recognize already READY asset); same shared nonce is reclaimed atomically and a new provider request is forbidden. If bytes were lost before durable storage, mark FAILED/PROVIDER_OUTCOME_UNKNOWN and retain byte charge pending explicit discard. No new automatic refund/deletion. A crash after asset READY but before job READY is reconciled to READY from exact linked asset proof, not regenerated or debited again. No model fallback/alternate source/partial output on parser, scan or freshness failure.

## Files and indispensable proof

Implementation surfaces: domain visual-job DTOs; Prisma+one additive job migration; Foxy visual repository/service/queue/budget/claim authority/worker; small diagram adapter; runtime/http/capabilities composition; typed budget allowlist and existing queue predicates. Reuse asset custody/renderer/read and existing content projection/loader. No new S3 client, storage scheme or publication fake. Coordinator owns shared files; test_runner tests first, workers own disjoint job/budget/provider/wiring responsibilities. Approximately<=400line review commits may form one logical deliverable; do not declare the feature complete between them.

Required RED is one integrated matrix, not dozens of helper-only stops:

1. Actual PostgreSQL job+asset atomic enqueue/replay/CAS and actor/global shared budget/concurrency against a text job; frozen rates/UTC midnight/exact-once uncertain settlement; changed full prompt/selection conflicts. No reservation leak on rolled-back enqueue.
2. Fake provider plus REAL existing inspector/storage/scanner fixture: GENERAL and classroom, IMAGE and DIAGRAM produce READY+private GET bytes with matching hash; one dispatch; reload/list survives runtime restart. Before READY students/other teachers get no bytes, and afterward private ownership still applies.
3. Source revocation/change before dispatch means zero generate calls; during generation/PUT/scan no stale READY. Shared lease expiry/reclaim, abort/shutdown and stale worker cannot complete. Scanner/storage failure never triggers another provider call. Exact blob recovery and asset-READY/job-RUNNING crash gap are explicit tests.
4. Actual HTTP202/poll/private raster headers and installed SDK bounded synthetic fetch; existing text-budget/queues/publication/P4 success regressions. A real bounded synthetic IMAGE compatibility/usage-cap test remains a separate exit proof before enabling that configured model; source-only/fake tests do not establish it.

## Real blockers and handoff

No unresolved business choice blocks coding. Current genuine dependencies: structured DIAGRAM adapter must be written, job/budget/runtime must be wired, and actual private S3/scanner integration plus IMAGE model/billable-cap compatibility must be observed before real enablement. Production quota/pricing configuration has no default; tests inject explicit safe values. Physical cleanup's remote fence is not proven and stays disabled; raster Library publication is still required before original-feature/main completion. Do not stop the whole implementation to request hypothetical approval or research a new provider.

Architect inspected source/contracts only, no calls/keys/DB/test mutations. Partial integrated handoff was sent to coordinator early on request; exact configuration/profile/authority/custody/completion signatures were supplied directly to test_runner. This record is ready to dispatch as ONE journey with RED and parallel disjoint ownership, not a new chain of preparatory milestones. No commit by architect. Node structural check passed exit0:2local Markdown targets,0missing,0trailing-whitespace lines.
