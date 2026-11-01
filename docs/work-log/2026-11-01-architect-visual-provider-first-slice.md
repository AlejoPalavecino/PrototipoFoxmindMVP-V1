# Foxy visuals — provider decision and first safe artifact slice

- Agent / role: /root/architect_next / architect.
- Runtime session ID: unavailable; task identity /root/architect_next.
- Date: 2026-11-01.
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai.
- Observed base: 740adeb; concurrent management integration work preserved.
- Status: completed (design/research; no generation/provider/DB executed).
- ESTADO_DISENO: LISTO_PARA_TDD_RED for V-R0 renderer only.

## Sources and verified local constraints

Read [proposal](../../odd/tasks/foxy-ai-proposal.md), existing visual domain/parser/tests, IA and Files barrels, IA configuration/adapters/budget, FileScope policy and SQL file ownership. Installed packages: @google/genai2.31.0 and sharp0.35.5. Context7 returned official SDK and Sharp versioned documentation. Exa search failed401 missing provider key; no credentials were read or supplied. Fallback used only official Google pages through web read. Memory writes were not attempted under unregistered-host instruction.

The current official [image model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image) lists stable gemini-3.1-flash-lite-image, 1K output, image/text responses, 65,536 input and4,096 output-token limits; structured outputs and search grounding are unsupported. This makes it an image adapter, not the schema-enforcing diagram generator. No claimed latency or output guarantee is used as application acceptance.

The current official [pricing page](https://ai.google.dev/gemini-api/docs/pricing) lists Standard input $0.25/M tokens, text/thinking output $1.50/M and image output $30/M; its stated1K image example is1,120tokens/$0.0336. It marks gemini-2.5-flash-image deprecated with shutdown2027-03-15. Prices are evidence dated today, not permanent constants or permission to spend.

The official [image guide](https://ai.google.dev/gemini-api/docs/image-generation) notes outputs can contain text/images, requested image count may not be followed exactly, and generated images have SynthID. It currently emphasizes Interactions examples; the installed [SDK2.31.0 guide](https://github.com/googleapis/js-genai/blob/v2.31.0/codegen_instructions.md) also documents native image output via models.generateContent/inlineData. Use the existing stateless generateContent integration behind a provider port first; a live synthetic compatibility test must confirm the chosen stable model/options before enabling it. Do not adopt remote conversational history implicitly.

FileObject has SQL CHECK num_nonnulls(classroom_id,classroom_draft_id)=1. FileScope supports classroom/draft, and draft authorization permits plan purpose only. A GENERAL-context private visual cannot be inserted into files as an unowned material or fictitious classroom draft. FileService accepts PNG/JPEG as classroom material after its existing proof/scan and quotas. Image storage before destination selection therefore needs a real Foxy private owner scope, not a weakened P4 invariant.

## Technical decision

DIAGRAM uses the configured text model's structured JSON behind a dedicated diagram adapter; parseFoxyDiagram is the source of truth and the application renders the pixels. IMAGE uses a separate Gemini-native-image adapter and configuration, initially candidate gemini-3.1-flash-lite-image at1K. Both converge on a bounded private asset descriptor and then the existing explicit destination/review/Library publication model. No model-generated executable markup or storage URL enters the browser.

Complete the diagram vertical journey before the image vertical journey, reusing the private artifact/publish path. First isolated cut V-R0 below has no SDK, DB, prices, migrations or externally visible generation.

## V-R0 exact contract: safe diagram PNG renderer

New apps/api/src/foxy-ai/diagram-renderer.ts (worker-facing factory), diagram-renderer-entry.ts and a cohesive layout/helper only if necessary. Export factory from Foxy barrel after acceptance.

createFoxyDiagramRenderer(options?) exposes:
render(input:{diagram:FoxyDiagram;aspectRatio:FoxyAspectRatio;signal:AbortSignal})
 -> Promise<{bytes:Uint8Array;mimeType:'image/png';width:number;height:number;digest:string;rendererVersion:'foxy-diagram-png-v1'}>.

Options only trusted test seams workerFactory/timeoutMs, following the accepted PDF renderer; not caller-supplied markup, filesystem paths or network loaders.

Input snapshot is synchronous and defensive. Reuse parseFoxyDiagram, reject zero nodes, retain current bounds30nodes/60edges and four requested aspect ratios. Fixed raster dimensions:1:1=1600x1600;4:3=1600x1200;3:4=1200x1600;16:9=1920x1080. Max4,000,000pixels, max10MiB returned bytes. Render all node labels, edge direction/labels and title. description stays separately accessible text, not an instruction or raw image markup.

Layout is deterministic from bounded graph+direction; cyclic graphs are legitimate inputs and cannot hang topological traversal. Use bounded grid/routing fallback for cycles. Generated SVG contains only application-authored geometric/text elements. Derive technical IDs from array positions; XML-escape all displayed text. No foreignObject, script, style from input, external image, href, file path, URL, event attribute, raw SVG or HTML. Wrap labels at grapheme-safe boundaries (no broken surrogate pairs); never silently truncate. Text must fit with minimum14px; if complete bounded content does not fit, reject AI_INPUT_LIMIT rather than producing clipped/misleading content. Exact text wrapping decisions are implementation details as long as these observable rules hold.

Rasterize using existing sharp. Official [Sharp0.35.5 constructor](https://github.com/lovell/sharp/blob/v0.35.5/docs/src/content/docs/api-constructor.md) supports SVG buffers and input-pixel limits; [output API](https://github.com/lovell/sharp/blob/v0.35.5/docs/src/content/docs/api-output.md) supports PNG buffers and processing timeout. Use explicit pixel/channel limits, failOn warning and unlimited=false. Native timeout alone excludes thread-queue waiting; run in a worker with the PDF renderer's termination/deadline pattern. Three-second wall deadline, cleanup awaited, abort never returns bytes. Validate worker result dimensions/PNG signature/digest and copy bytes before exposing it. Determinism means same graph/options/runtime produce same bytes; no promise across library/font versions. Version changes require rendererVersion change.

Error codes: INVALID_INPUT for malformed request/graph/ratio; AI_INPUT_LIMIT for valid graph that cannot fit/readably render within bounds; generic SERVICE_UNAVAILABLE for timeout/worker/rasterizer failures; aborted caller remains aborted under the accepted worker pattern. No input labels or native exception diagnostics in public errors.

## V-R0 DoT and ownership

test_runner writes new diagram-renderer.test.mjs first; slice_worker owns only new renderer/helper files and its record. Existing PDF/text/provider/management files remain untouched. One reviewable unit approximately<=400 authored lines; do not compress implementation/tests to satisfy it.

RED:
1. PNG signature/dimensions/ratio/digest and byte ownership; same fixture twice same result.
2. One-node, branching, cycle and maximum graph complete without infinite layout; preserve labels/direction.
3. Malformed, duplicate IDs, missing endpoints, empty graph and invalid ratio reject before worker.
4. XML/HTML/script/foreignObject/URL-looking labels stay text; no filesystem/network action.
5. Long labels either fully wrapped or explicit AI_INPUT_LIMIT, never clipped/truncated.
6. Caller/worker mutation cannot alter queued input or returned descriptor; invalid worker digest/PNG/dimensions rejected.
7. Abort before start, during render, worker error/exit and timeout terminate/drain with no late bytes.
8. Meaningful independent pixel review of representative branch/cycle/max diagrams, plus matching accessible text, before calling visual quality accepted.

## Next cuts after V-R0 (not yet implementation-ready)

V-G1: structured diagram adapter using current text provider/schema/count preflight; same trusted selected-source grounding projection, no search/tools. Its output is FoxyDiagram plus mapped references/warnings. Invalid model JSON fails, never rasterize arbitrary model SVG.

V-A1: private asset persistence for GENERAL or CLASSROOM conversation, teacher owner and fixed-context snapshot. New owner-scoped metadata/storage prefix and private-byte reservation; storage ports reuse host infrastructure, not another S3 client. Generate/scan/hash/asset readiness use durable fenced jobs. Auth is real UoW before and after I/O, same teacher/conversation/current source permissions. General has no hidden classroom fallback. Owner quota/retention/discard contract must be explicit before this migration.

V-P1: review visual then choose actual owned active destination. Copy exact verified asset bytes into classroom FileService material, re-scan/validate via real P4 and reserve classroom quota; preserve the private source asset so it can be reused. Confirm material receipt only after both file readiness and existing Library transaction. Never mutate scope/classroom of the private blob in place. Use distinct idempotency key per publication, immutable source asset digest/revision, actual destination CAS. Preview stays private until explicit confirmation. Existing text-PDF-only publication proof/renderer allowlists must not be loosened wholesale; add a typed artifact variant with appropriate validation.

V-I1: image provider adapter after its model/config/output parser/budget contract and private persistence are accepted. Request one image, one candidate, limited output and no automatic provider retry. Accept only final non-thought image bytes, one permitted artifact; text-only refusal or zero/multiple final images fail safely. Bound encoded response/decoded bytes, sniff actual format, decode dimensions/pages and reject non-PNG/JPEG, SVG, animation, excessive pixels or mismatch. Preserve generated-original bytes for proof/scanning; normalize only as a separately identified derived preview. Do not return a provider URL or model MIME as trusted proof.

## Cost control requiring a shared monetary reservation

Existing text-budget assumes one input and one output token price. Do not settle image output at the configured text output price. Add a shared reserve/settle money primitive under existing advisory78123001 and same actor/global ai_usage_daily budget; text wrappers retain behavior. Job freezes model, input/output modality rates, token/output limits and reservation BEFORE dispatch. Daily request/spend and concurrency caps remain shared across text/visual jobs; a new modality cannot reset them.

For a conservative initial image quote, reserve all bounded output tokens at the maximum configured output rate (image vs text/thinking), plus counted input, rather than assuming exactly1,120 image tokens. Model output/usage may be mixed. Count preflight must use the same actual model/content and snapshot fingerprint; unsupported counting or invalid configuration means capability disabled, not a lower-model estimate. Settle only validated complete usage; missing/uncertain outcome consumes the full reservation. Additional thinking and modality counters must be included without double-counting; no optimistic rebate from absent image-token details. A provider abort can still incur cost: do not re-dispatch an uncertain job automatically.

The candidate image model4,096 output cap is a provider fact, not proof the installed SDK caps every billed modality as expected. A synthetic live request must verify request options and usage semantics before production enablement. Prices remain supplied/validated config snapshots, not browser-controlled numbers. Runtime capabilities imageGeneration/diagramGeneration become true only when their whole configured provider+worker+private-storage path is available, independently from other capabilities.

## Limits and handoff

No key was read, no request dispatched and no spend incurred by this task. Context7 succeeded; one own query wrapper had a JavaScript parenthesis error before dispatch and was rerun correctly. Exa401 is an external research limitation, compensated by primary Google docs. Provider pricing/compatibility requires revalidation when implementation enables it; this document is not a successful integration test.

Parent can start V-R0 now. Keep later cuts behind their own RED and independent end-to-end proof; do not treat the existence of a renderer or provider mock as completed image generation/publication.

\n