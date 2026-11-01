# Foxy IMAGE provider and conservative budget — design

- Agent / role: /root/architect_next / architect.
- Session ID: unavailable; actual task identity /root/architect_next.
- Date: 2026-11-01.
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai.
- Starting commit observed: 0df0cd4.
- Phase/spec: V-I1/V-B1, [visual provider decision](2026-11-01-architect-visual-provider-first-slice.md), [custody contract](2026-11-01-architect-private-asset-custody.md).
- Status: completed (design/research only).
- ESTADO_DISENO: LISTO_PARA_TDD_RED for V-I1a response parser/bounded transport and V-B1a pure quote; live enablement is not verified.

## Request and scope

Define a Gemini-native image adapter and safe shared budget, separated from private byte custody. Only this record may change. No credentials, real generation, spend, private data or production/migration edits. Concurrent inspector implementation and tests are preserved.

## Inspected evidence

Verified @google/genai2.31.0 in package.json and lockfile, existing public GeminiClient port and adapter/configuration/budget behavior, visual/text domain and trusted grounding projection. Context7 official versioned SDK docs succeeded. Reopened official Google model/pricing/image guide/REST reference; current candidate remains stable gemini-3.1-flash-lite-image. Local installed SDK declarations confirm imageConfig, usage metadata and HttpOptions.fetch seam. Final contracts follow below.

## Provider decision and official evidence

Keep Gemini Developer API, the installed SDK and existing GeminiClient models.countTokens/generateContent port. No OpenAI/Imagen/provider migration, raw parallel REST client, new credential source or key read. Inject the existing trusted client; host may extract one shared Gemini client factory to supply text/image adapters without duplicating credentials/config. The image adapter itself imports neither FileService nor storage/scanner/SQL.

The [official model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image) currently lists stable gemini-3.1-flash-lite-image, input65,536/output4,096tokens,1K output and image/text modalities. Structured output, search and URL context are unsupported. This adapter produces native bitmap bytes; diagrams retain the structured-text-model/application-renderer path.

Rechecked [pricing](https://ai.google.dev/gemini-api/docs/pricing): Standard input$0.25/M, text/thinking output$1.50/M, image output$30/M; the stated1K image example is1,120image tokens/$0.0336. Configuration freezes those modality rates, not an assumed flat image price. Standard only; no batch/discount/free-tier assumption. Actual paid-tier privacy policy is operator configuration, not inferred from key format. No classroom data may be dispatched until the selected provider project's handling satisfies the existing source-privacy policy.

The [image guide](https://ai.google.dev/gemini-api/docs/image-generation) documents variable image count and intermediate thought images; do not mistake an interim image for the final artifact. Its current examples favor Interactions, whereas [SDK2.31.0](https://github.com/googleapis/js-genai/blob/v2.31.0/codegen_instructions.md) documents models.generateContent native inlineData and imageConfig. Installed SDK declarations verify HttpOptions.fetch, imageSize/aspectRatio, countTokens.systemInstruction and modality usage fields. The [REST method](https://ai.google.dev/api/generate-content) is stateless generateContent. This is documentation/compile evidence only, not confirmation that this stable model accepts every SDK2.31.0 option. Keep real IMAGE capability disabled pending a bounded synthetic compatibility/usage test separately authorized by coordinator/user scope; no real call was made here.

## V-I1a — smallest provider-independent executable unit

Create `apps/api/src/ai/foxy-image-response.ts` with `parseGeminiFoxyImageResponse(response:unknown):FoxyImageResponse`, plus a cohesive bounded-fetch module. Domain types live in new `src/core/domain/foxy-ai-image.ts`; SDK types stay in AI infrastructure. No job, DB, budget mutation, scanner, native image decoder, provider call or enabled capability in this first unit.

```ts
interface FoxyImageUsage {
  inputTokens:number; outputTokens:number;
  // outputTokens includes every reported billable candidate/thinking token.
}
interface FoxyImageResponse {
  bytes:Uint8Array;
  declaredMimeType:'image/png'|'image/jpeg';
  usage:FoxyImageUsage|null;
}
parseGeminiFoxyImageResponse(response:unknown):FoxyImageResponse;
createFoxyImageBoundedFetch(baseFetch:Fetch):Fetch;
```

Parser requires no promptFeedback block, exactly one candidate and finishReason STOP, bounded parts (<=64), and exactly one final inlineData image whose part.thought is not true. Interim thought parts are never returned/persisted/displayed; bounded text parts are ignored as untrusted ancillary output, not a title, citation or operational instruction. Zero/two final images, text-only refusal, fileData/URL, tool/function/executable payload, malformed candidate/part or unsupported MIME rejects INVALID_AI_OUTPUT. Do not select the first of multiple final images. All part strings/arrays are bounded; total text<=65,536UTF8bytes. No convenience response.data/text getter is trusted in place of candidate inspection.

Final data is canonical standard base64 (no whitespace/data URL/base64url/noncanonical padding), <=13,981,016encoded characters and1..10,485,760decoded bytes, checked before decoding. Reject obviously mismatched PNG/JPEG signature. Return a defensive byte copy. declaredMimeType remains a provider claim; only the separate custody inspector establishes actual MIME/dimensions/valid still image. The parser never marks an asset READY or accepts model HTML/SVG. A valid final image can have usage=null; missing usage cannot earn a rebate.

Usage parsing is deliberately conservative: safe positive integer promptTokenCount and totalTokenCount with total>prompt are mandatory for an accepted generated image. For this no-tools/no-cache request, outputTokens=total-prompt includes candidates and thoughts. If candidatesTokenCount/thoughtsTokenCount/modality details exist, validate their nonnegative integer shape and internal sums without adding the same tokens twice. Contradictory/unsupported categories, tool/cache usage, zero alleged billable output for a final image, missing/incomplete totals or overflow ->usage=null. Modality details are not required for a discount because the initial settlement prices ALL output tokens at the highest configured output rate. Never treat absent thoughts count as proven zero without consistent complete totals.

Bounded fetch uses the installed SDK HttpOptions.fetch seam, not an SDK fork. Before returning the Response to SDK JSON parsing, consume its actual response stream under request abort/deadline and an absolute16,777,216byte cap, even without/misreported Content-Length; cancel/drain on overflow/error. Preserve HTTP status/headers for SDK classification, return a bounded owned body and never log URL query/header/body. No automatic retry/redirect or secondary URL fetch. Parser limits after SDK JSON are an additional layer, not a hard transport-memory cap on their own. This seam is present in installed SDK2.31.0; a fake SDK client bypasses transport caps and therefore does not prove them.

## V-I1b — exact provider port, immutable preflight and dispatch

```ts
type FoxyImageInput = Omit<FoxyTextInput,'purpose'|'message'> & {
  prompt:string; aspectRatio:FoxyAspectRatio;
};
interface FoxyImageProvider {
  countTokens(input:FoxyImageInput):Promise<number>;
  generate(input:FoxyImageInput):Promise<FoxyImageResponse>;
}
new GeminiFoxyImageAdapter({client:GeminiClient,configuration:ImageConfiguration});
```

Definitive adapter file/configuration clarification sent to coordinator/test_runner: `apps/api/src/ai/foxy-image-adapter.ts`; `ImageConfiguration` has exactly `{model:'gemini-3.1-flash-lite-image',maxInputTokens:number,maxOutputTokens:number,deadlineMs:number,profileVersion:'foxy-gemini-image-v1'}`. Token caps are safe integers1..65536/1..4096; per-provider deadline safe integer1..30000ms, preserving accepted request bounds. profileVersion fingerprints the fixed instruction/profile, not an extra SDK body field. Constructor uses injected GeminiClient and contains no API key, prices, storage or SQL.

Use new adapter/prompt helper exported from AI public barrel after acceptance. ImageConfiguration freezes model, allowed four ratios,1K profile, maximum input/output token limits, deadline and request-profile version. No price/token/model from browser JSON. AI_IMAGE_ENABLED is independently false/absent by default; enabled requires AI_ENABLED, existing Gemini provider, complete validated image configuration and full custody path. Reuse existing key internally; no new API key environment variable. Model initial allowlist contains only gemini-3.1-flash-lite-image; invalid/incomplete enabled config fails closed. Image-specific canonical decimal modality rates are required, without production defaults. Keep existing text configuration behavior intact.

Input is a fresh trusted projection of existing grounding, not a database record: GENERAL has no classroom/sources/documents/curriculum; CLASSROOM has authorized current curriculum plus selected PLAN/MATERIAL/past-ACTIVITY source content/document keys and warnings. Reuse existing bound source/document/history policy and remove internal UUIDs/owner/student data from serialized provider contents. No storage/file URL, personal submissions, grading/student reports or hidden classroom fallback. A document/model instruction is untrusted data. Classroom instruction says draw only selected evidence; missing sources remain explicit. Without enough readable context the application declines or requests clarification before paid image dispatch; native image output does not provide structured insufficiency/citation proof. All image claims need teacher review, and the displayed source provenance is the server's selected snapshot rather than citations invented by the image model.

prompt1..5000scalar code points; existing source limits20,documents6,aggregate20MB,history10pairs/262,144bytes remain enforced. Deep-copy nested strings/arrays/document bytes before any await. Fixed image instruction and all user/document data form one canonical immutable prepared request; fingerprint binds model/profile, exact content bytes, ratio,size,limits and instruction version. countTokens sends exactly that model/contents/system instruction and requires finite positive count<=configured input cap<=65,536. Unsupported/failed counting disables dispatch, never counts against a different model. generate requires the matching successful preflight on the same input ticket; no automatic hidden preflight/count fallback. Mutation after counting rejects before dispatch. Consume ticket once before network I/O; second generate cannot dispatch again. Durable at-most-one generation per job still belongs to worker/budget, not this in-memory map.

Generate request profile: candidateCount1, automaticContinuation:false, responseModalities TEXT+IMAGE, imageConfig{aspectRatio,imageSize:'1K'}, maxOutputTokens<=4096, thinkingConfig{thinkingLevel:MINIMAL,includeThoughts:false}, no tools/search/cache/remote chat/files. No responseMimeType/JSON schema on IMAGE. retryOptions.attempts1 at client and per request; bounded fetch installed. Compatibility of1K field/response modalities/thinking profile and whether total billed output is bounded by4096 must be verified before enablement, not inferred from model marketing limits. A rejected option fails AI_UNAVAILABLE; it does not trigger fallback model/size/retry.

Adapter returns only bytes/declared MIME/usage. Worker then separately invokes accepted custody inspector+real scanner+immutable storage; success from generate is not material preparation/publication. A failed scan/storage never calls generate again. AI monetary settlement occurs even if custody rejects the image.

Error mapping: input/preflight mismatch/count invalid ->AI_UNAVAILABLE or AI_INPUT_LIMIT for known size/token policy; explicit429->AI_RATE_LIMITED; explicit non-success provider status->AI_UNAVAILABLE; invalid complete response->INVALID_AI_OUTPUT. Abort/timeout before generation dispatch->AI_TIMEOUT; transport abort/loss/deadline after dispatch->PROVIDER_OUTCOME_UNKNOWN. Provider abort may still be billed. Public errors never include provider diagnostics/prompts/base64. All post-dispatch errors settle the full reservation initially, including safety refusal/invalid image unless a future proven-usage policy explicitly permits a lesser charge. No automatic redispatch.

## V-B1a — pure conservative quote before ledger changes

```ts
quoteFoxyImageBudget(input:{
  inputTokenCap:number; outputTokenCap:number;
  inputUsdPerMillion:string;
  textOutputUsdPerMillion:string;
  imageOutputUsdPerMillion:string;
}):bigint; // reserved microUSD
```

Positive fixed-point decimal rate strings matching `^(?:0|[1-9][0-9]{0,5})(?:\.[0-9]{1,6})?$`, numerical value>0 and exact bigint rational arithmetic; safe integer input cap1..65536/output cap1..4096. Fractional trailing zeros are accepted; no leading-zero integer, exponent, whitespace, sign, NaN, overflow or unknown fields. Reserve ceil(inputTokenCap*inputRate)+ceil(outputTokenCap*max(textRate,imageRate)) in microUSD. Unlike the earlier approximate counted-input quote, this initial release reserves the configured INPUT CAP as well, so small token-count differences cannot under-reserve. Count preflight still rejects excessive input. The model profile must bound ALL billable output, including thoughts; absent verified bound means IMAGE unavailable.

Settlement first release is conservative: with internally consistent complete usage and within verified caps, charge ceil(actualInput*inputRate)+ceil(actualAllOutput*maxOutputRate). This intentionally does not exploit cheaper text/thought output and does not double-count modality counters. Missing/invalid/uncertain usage consumes full reserved amount; never substitutes zero or assumed1,120tokens. Trusted rates/config snapshot is immutable per job; later config changes cannot reprice an old job. Known usage above reservation/caps records actual cost, flags the profile unavailable for further dispatch and requires investigation; silently clipping actual cost to reservation would hide spending. No hard service-side billing bound is claimed before synthetic cap verification.

## V-B1b/V-I2 — shared durable budget/job wiring, separate unit

New foxy_visual_jobs is a generation job, distinct from foxy_visual_assets custody. It binds owner/conversation/request fingerprint, kind/ratio/selected-source snapshot, asset reservation ID, provider model/profile/rate/token-cap snapshot, lease/dispatch marker/count, budget reservation/day and terminal sanitized error/usage. Store no credentials or provider conversation. Composite FKs preserve owner/context. A durable UNIQUE(owner,requestId) and input hash includes prompt/selection/all request options; asset reservation hash alone does not identify generation intent.

Extend the existing shared monetary ledger primitive under advisory78123001 and SAME ai_usage_daily capability/global+actor scopes. Do not create image-only daily counts/budget or reset allowance by modality. Typed job-table allowlist admits foxy_visual_jobs; raw SQL table names/prices never come from request JSON. Extract common reserve-amount/settle-amount logic while keeping existing text wrapper results unchanged. Include visual jobs in all relevant shared global/per-owner active-job queries; a modality cannot bypass maxConcurrency. AI requests/spend caps remain the existing shared configuration, not new separate image quotas.

Worker flow: authenticate/authorize+snapshot -> reserve private asset capacity -> preflight count -> under short current-lease/permission transaction reserve maximum monetary quote and durably set dispatch_count1/dispatch_started_at/config snapshot -> call provider once outside SQL -> settle usage under current durable ledger identity even if classroom/session access was revoked -> custody or terminal failure. A crash after dispatch marker but before network is conservatively uncertain and never auto-redrives generation. A crash after response but before settlement/recovery consumes full reservation. Private asset reservation and monetary debit cannot leak on rejected DB transaction; after provider dispatch, failures remain charged. Source mutation/revocation between count and dispatch fails freshness before dispatch; stale lease cannot spend or complete another claim.

Do not add image provider rates to generic text output price as if they were equivalent. Job recovery settles once on its original UTC usage_day and config; midnight/restart/config change cannot double-count, refund unknown work or grant a new daily allowance for the same dispatch. Full DB contract/migration is its own design/RED cut after pure quote+adapter acceptance; no unreviewed table is created by this record.

## ESTRATEGIA_EQUIPO_Y_SUPUESTOS

First worker owns new AI response/bounded-fetch files and pure image quote module; test_runner owns tests. Inspector/custody owners continue their surfaces. Coordinator serializes domain/AI barrels and later common-budget/runtime/migration edits. Split parser/transport and quote, then adapter, then durable job/ledger into approximately<=400line review units; each source module<200lines where cohesive. No new model/provider/schema dependency for the pure cuts. A passing fake-client adapter test is not live model acceptance.

## CRITERIOS_DE_TEST_DOT / first RED cuts

V-I1a parser/transport:

- Exactly one final PNG/JPEG success, thought image ignored, one final plus thought bounded, text-only/safety/MAX_TOKENS/no/two final candidates/images rejected. No URL/function/SVG. Strict canonical base64/size/signature; byte/result mutation isolation; no untrusted model text promoted to metadata.
- Missing/inconsistent/negative/overflow usage ->null; complete total includes thinking once; modality sums not counted twice. Valid bytes with unknown usage stay private/untrusted until custody, never get a zero-cost rebate.
- Bounded fetch actual stream with correct/missing/lying Content-Length, >16MiB body, stalled chunk/abort,429response, body cancellation/drain, no automatic second call. Test through installed SDK custom-fetch path with synthetic Response/stream to prove integration, not only helper invocation.

V-B1a quote:

- Exact bigint ceiling at tiny/fractional rates, cap boundaries, malformed rates/types/unknown fields, immutable config snapshot; max-output rate dominates mixed output; no floating under-reserve. Output at all-image maximum stays within quote; unknown usage takes full quote; excess observed usage is never clipped.

V-I1b fake-client adapter:

- Count/generate exact same prepared contents+system instruction/model and intended SDK options; no tool/cache/JSON/remote-history request. GENERAL/classroom projection restrictions, sources/document limits, opaque IDs stripped, prompt/data instruction separation, mutation after preflight blocked and one consumed ticket/one generate call.
- Before/after-dispatch abort/error/deadline classifications;429 and unsupported options no fallback/retry; source authority is rechecked by orchestration before paid dispatch; provider returns bytes only and never calls storage/scanner/Library.

Later actual PostgreSQL ledger RED: same-request race, max shared budget/count/concurrency with other AI features, insufficient byte quota before dispatch, competing text/image reservations, current/expired nonce, crash at dispatch marker/response/settlement, original-day midnight/config change recovery and exact-once full uncertain charge. Existing text regression unchanged. Enablement requires bounded synthetic real-provider model/options/usage-cap verification and then full real custody/student-Library confirmation journey. No credentials/calls were performed for this design.

## Verification, interruption and handoff

SDK/source/official documentation inspection and design only; no functional test, spend, retained database or secret read. While this task ran, coordinator escalated custody terminal/lease issues: source inspection identified missing boolean returns, and exact renewal/capability-close contract was recorded in the custody document and sent to coordinator/test_runner. These are reported there, not silently folded into provider scope. One own patch-context mismatch was retried after reading the exact paragraph; no production file touched.

Coordinator can start V-I1a and V-B1a RED with these exact APIs. Then complete adapter behind disabled IMAGE capability; wire the durable shared budget only after its migration/claim contract. Native image model's exact SDK compatibility and total billable token cap remain unverified runtime facts, not permission to call a paid provider. Node structural validation passed exit0 for this record and the updated custody record:2local targets each,0missing,0trailing-whitespace lines. No commit created by architect.
