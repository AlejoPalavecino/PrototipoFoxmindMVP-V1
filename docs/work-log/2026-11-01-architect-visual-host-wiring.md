# Foxy visual host wiring — exact opt-in contract

- Agent / role: architect.
- Session or task ID: `/root/architect_next`.
- Date: 2026-11-01.
- Branch/worktree: `codex/foxy-ai`, `C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai`.
- Starting commit: `68f403c` (observed).
- Phase/spec: V-H1, [visual integration](2026-11-01-architect-visual-generation-integration.md), [provider/budget evidence](2026-11-01-architect-image-provider-budget.md), [proposal](../../odd/tasks/foxy-ai-proposal.md).
- Status: completed (design only; implementation/RED pending).

## Finding and scope

ESTADO_DISENO: LISTO_PARA_TDD_RED. `application.ts` constructs Foxy with text configuration/provider only, so accepted visual runtime cannot be enabled in the real host. `GeminiFoxyImageAdapter` exists but has no production factory using bounded fetch. `foxy-diagram-adapter.ts` does not exist: renderer and a fake/injected DIAGRAM port are not a real diagram provider. Close all three gaps in one host slice. No secrets read, no provider calls, no production/test edits.

## Configuration contract

New `apps/api/src/foxy-ai/visual-configuration.ts`, exported through the Foxy barrel:

```ts
interface FoxyVisualHostConfiguration {
  configuration: VisualConfiguration;
  providerDeadlineMs: number;
}
readFoxyVisualConfiguration(
  env: Record<string, string | undefined>, ai: AiConfiguration | null
): FoxyVisualHostConfiguration | null;
```

`ApiConfiguration` gains optional `foxyVisual`; root `readConfiguration` calls the parser after existing AI parsing. Both flags `AI_IMAGE_ENABLED` / `AI_DIAGRAM_ENABLED` absent or exactly `false` return null and construct no visual SDK client. Any other non-true flag rejects sanitized configuration. Any true modality requires configured existing `AI_ENABLED`, Gemini backend and root classrooms/private files. Do not read a second key or expose key/configuration JSON through capabilities.

New `.env.example` entries (all modality flags false; prices/quota blank):

```dotenv
AI_IMAGE_ENABLED=false
AI_DIAGRAM_ENABLED=false
FOXY_PRIVATE_ASSET_QUOTA_BYTES=
AI_IMAGE_MAX_INPUT_TOKENS=65536
AI_IMAGE_MAX_OUTPUT_TOKENS=4096
AI_IMAGE_INPUT_USD_PER_MILLION=
AI_IMAGE_TEXT_OUTPUT_USD_PER_MILLION=
AI_IMAGE_OUTPUT_USD_PER_MILLION=
```

On opt-in, quota is mandatory canonical positive integer, >=10485760 and <=signed int64; parse bigint without Number conversion. IMAGE enabled requires its caps 1..65536 / 1..4096 and all three positive canonical decimal prices (existing rate grammar, <=6 decimals). No production price/quota defaults. Model and profileVersion are fixed allowlist literals `gemini-3.1-flash-lite-image` / `foxy-gemini-image-v1`; outputUsdPerMillion is exact max(textOutput,imageOutput), not the text price.

DIAGRAM uses existing configured `AI_MODEL`, canonical original `AI_INPUT_USD_PER_MILLION` / `AI_OUTPUT_USD_PER_MILLION`, profileVersion `foxy-diagram-provider-v1`; caps are min(ai.maxInputTokens,65536) / min(ai.maxOutputTokens,4096). Rates must satisfy the same exact decimal grammar; do not round/exponent-normalize an invalid rate. IMAGE does not require DIAGRAM enabled and vice versa. Disabled profiles are null; unrelated disabled-modality values do not activate providers.

Shared visual values: maxConcurrency=ai.maxConcurrency, maxJobAgeMs=ai.maxJobAgeMs (require >=180000), outer deadlineMs=180000, providerDeadlineMs=min(ai.deadlineMs,30000). The current bounded-fetch transport has its own tighter 15000ms wall bound. Budget limits passed to runtime are exactly `{dailyBudgetUsd:ai.dailyBudgetUsd,dailyActorRequests:ai.dailyActorRequests,dailyGlobalRequests:ai.dailyGlobalRequests}`. No separate visual allowance or global ledger namespace. Persist frozen per-job profile/rates through existing enqueue.

## Real provider factories

AI infrastructure owns SDK construction. Extend `apps/api/src/ai/foxy-image-adapter.ts` and new `foxy-diagram-adapter.ts`, export from AI barrel:

```ts
createGeminiFoxyImageAdapter(options: {
  apiKey: string;
  configuration: ConstructorParameters<typeof GeminiFoxyImageAdapter>[0]['configuration'];
  fetch?: typeof globalThis.fetch;
}): GeminiFoxyImageAdapter;

new GeminiFoxyDiagramAdapter({client,configuration});
// client: existing GeminiClient
// configuration: {model:string,maxInputTokens:number,maxOutputTokens:number,
//                 deadlineMs:number,profileVersion:'foxy-diagram-provider-v1'}
createGeminiFoxyDiagramAdapter(options: {
  apiKey: string;
  configuration: ConstructorParameters<typeof GeminiFoxyDiagramAdapter>[0]['configuration'];
  fetch?: typeof globalThis.fetch;
}): GeminiFoxyDiagramAdapter;
```

Both factories use installed `@google/genai`2.31.0, `vertexai:false`, no retries (`attempts:1` client/request), bounded fetch wrapping the injected/default fetch, configured deadline. Existing `createFoxyImageBoundedFetch` 16MiB/15s bound can protect structured diagram JSON too; no second unbounded client or transport. Constructors never dispatch. Existing single `ai.apiKey` is passed internally without logging; no new environment key or provider selection.

DIAGRAM adapter methods match existing visual port: `countTokens(input:VisualInput):Promise<number>` and `generate(input:VisualInput):Promise<{diagram:FoxyDiagram;usage:{inputTokens:number;outputTokens:number}|null}>`. Keep shared input/usage types in domain/public contract, no infrastructure import of Foxy worker implementation. Extract/reuse safe visual context serialization where helpful; retain distinct diagram system instruction/schema. Require exact-input same-model successful preflight ticket, consume once; no hidden count/generate retry or fallback model. Count/generate use identical content/system instruction. Context and documents are untrusted evidence, not instructions; no tools/URLs/search/cache.

Generate structured JSON with actual FoxyDiagram schema: schemaVersion foxy-diagram-v1, title/description, direction TOP_DOWN|LEFT_RIGHT, nodes1..30, edges0..60, additionalProperties=false throughout; enforce existing string limits/IDs/edge references via parseFoxyDiagram after schema parsing. No Mermaid/SVG/HTML/model code. Request responseMimeType application/json, responseJsonSchema, candidateCount1, automaticContinuation:false, temperature0 and output cap. Reject safety-blocked/non-STOP/multiple candidates, binary/function parts, invalid graph or overlarge text (>65536 UTF-8 bytes). Never turn generated markup into renderer input.

Known usage uses conservative totalTokenCount-promptTokenCount (including thoughts exactly once), as existing IMAGE helper; inconsistent/missing usage returns null for full-reservation settlement. Error/abort before dispatch is timeout/unavailable; uncertain post-dispatch outcome is PROVIDER_OUTCOME_UNKNOWN. Fixed bounds and no retry apply. Graph returns to existing safe local renderer and custodian, never public bytes directly.

## Host and lifecycle

`ApplicationOptions.foxy` gains `visualProviders?:{IMAGE?:VisualProviders['IMAGE'];DIAGRAM?:VisualProviders['DIAGRAM']}` using exported port types. Explicit null disables that modality. To prevent accidental real traffic in injected tests, any override mode (`options.ai` supplied, own textProvider property, or own visualProviders property) means visual modalities without explicit provider overrides are null. Only ordinary production mode with no overrides constructs default real providers, and only enabled modalities. Supplied fake ports cannot activate a disabled configuration flag.

In `application.ts` provider factory, pass all three actual runtime options: `visualConfiguration:configuration.foxyVisual?.configuration`, selected `visualProviders`, and the exact shared ai budget limits. Use AI factory exports and Foxy configuration/type exports; no SDK construction inside domain/worker. Keep legacy text override behavior. Malformed enabled configuration fails startup, not silent capability loss; missing overridden port yields disabled capability, no network fallback.

Existing root AppModule/Foxy lifecycle starts visual polling exactly once and awaits `visual.close()` (worker then custody) before shared storage and Prisma destruction, including startup failure. Do not add another polling loop or destroy shared storage from provider. Abort/unknown charge semantics remain: shutdown does not prove remote provider cancellation, never re-dispatches a marked job and never releases an uncertain charge. Host acceptance must exercise real composition, not only createFoxyRuntime unit injection.

## RED and handoff

1. Pure parser: default off, independent modes, malformed/partial enabled settings, no key leakage, exact rates/max output price, bigint quota, bound caps/deadlines and exact shared limits. Existing text config unchanged.
2. Installed SDK with synthetic injected fetch: factories call correct model/count/generate options, IMAGE bounded fetch is actually installed; DIAGRAM structured graph parsed, tickets/usage/abort/no retries. No network/provider needed.
3. Compiled actual `createApplication` using fake visual ports and disposable PG/files/scanner: independent capabilities, POST202->worker->private READY->prepare->confirm->student Library for IMAGE/DIAGRAM; overridden missing/null port never falls back. Off mode does not instantiate SDK or start a visual provider.
4. App close/startup failure aborts and drains worker/custody before shared storage/Prisma; uncertain dispatched job settles/recovery without another generate. Existing application TEXT/PDF regressions.

Provider prices are explicit operator configuration, not guesses or copied into production defaults. Earlier official-source evidence is linked above; real SDK/model option and billable output-cap compatibility remains a separate observed proof before operational real enablement. This task authorizes implementation/wiring and synthetic verification, not reading credentials or spending against a provider. Do not claim the production provider was exercised from fake tests.

Observed: read application.ts/configuration.ts/AI barrel and adapters/budget/transport, visual runtime/types/profile, public domain, env.example and compiled-application test pattern. Confirmed diagram adapter missing by file inventory. Some guessed filenames/Windows glob paths failed; corrected to actual files/directory searches. No functional tests run for this design-only task. Node filesystem structural check: 3 local links, zero missing, zero trailing-whitespace lines, exit 0. No commits or production changes by this agent. Coordinator/tester receive this contract; coordinator owns roadmap.

## SDK countTokens correction — subsequent scoped diagnosis

The installed SDK2.31.0 `dist/node/index.mjs:9821` converter `countTokensConfigToMldev` throws on config.systemInstruction before fetch in Developer mode; shared TypeScript fields also describe Enterprise behavior. Earlier architecture requiring systemInstruction on both visual methods was incompatible. This correction supersedes that encoding requirement in this and earlier visual provider contracts.

Accepted minimal encoding: build ONE immutable/fingerprinted Content[] with fixed application instruction as its first text part, then bounded JSON user/context data and separate document parts. Both countTokens and generateContent use identical model/contents, with no config.systemInstruction on either method. Do not omit the instruction from counting, duplicate it in generation, switch backend, introduce raw HTTP or retry/fallback. Fingerprint includes instruction/profile/model/caps/contents; successful ticket is required and consumed exactly once. Instructions and evidence retain separate literal parts and application-owned ordering.

Moving instruction to a user-content part changes its API role; do not claim system-message priority or prompt-injection immunity. Confidentiality/side-effect boundaries remain enforced by selected authorized context, no provider tools/URLs/private IDs, output parser/renderer limits and custody/publication permission checks. Untrusted text cannot choose instruction/model/schema/tools. Token preflight establishes identical serialized content, not proof of remotely billed generation-config/schema overhead; conservative shared reservation/usage and operational compatibility proof remain required.

Local installed-SDK probe with synthetic injected fetch: unsupported count rejected, zero fetch calls; corrected count and generate made exactly two fake fetch calls, identical wire contents, systemInstruction absent and fixed instruction first, exit0. No network/provider/credential used. First probe script had a JavaScript brace SyntaxError (exit1 before evaluation); corrected the probe, not production. Required RED: assert those wire facts using real installed SDK, instruction occurs once, malicious user/document text stays data, mutation makes generate call count0, ticket single-use, safety/schema/usage/abort/no-retry regressions. Recommendation sent to coordinator/implementer/tester; no product/test edits.
