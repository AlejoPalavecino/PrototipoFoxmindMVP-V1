# Browser DIAGRAM failure diagnosis — rendering contract gap

- Agent / role: /root/diagram_failure / architect; runtime session ID unavailable.
- Date: 2026-11-01; branch codex/foxy-ai; worktree C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai.
- Scope: diagnose real browser DIAGRAM FAILED/AI_INPUT_LIMIT without another provider request, secret, prompt or raw model-output read.
- Status: completed (diagnosis/design only). ESTADO_DISENO: LISTO_PARA_TDD_RED.
- Root class: C, new rendering compatibility defect. Layout reserves one text line for otherwise valid multi-line title/edge labels. No product ambiguity requiring user decision.

## Evidence and exclusions

Coordinator supplied only numerical job facts: preflight=76, input=76, output=352, maxInput=65536, maxOutput=4096, dispatch_count=1, reserved=0. In visual-budget.ts, reserve clears input_tokens after writing preflight_tokens. Known input_tokens and output_tokens are restored only by settlement with successful returned usage; an unknown settlement leaves output_tokens null. Therefore the provider generate and structured-response parser completed, and settlement ran before the failure. Both token counts are within configured caps; checkUsage would use INVALID_AI_OUTPUT for an excess, not this code.

In visual-worker.ts the following stage is parseFoxyDiagram (INVALID_INPUT on failure), renderer.render, and custody.receive. The sole AI_INPUT_LIMIT emitter reached in this post-settlement path is diagram-renderer-layout.ts. Custody does not emit that code. Thus the failure stage is deterministic diagram rendering, not an input-token limit. The exact title/edge/node shape from the live response was not retained and was not inspected; do not claim which specific string overflowed or that this proof recovers the original graph.

Current layout fixes titleHeight=70 and gives its text62 pixels at font30 (one line); edges get21 pixels at font14 (one line). Yet the accepted schema allows up to200 characters per title/node/edge label. For a1600-square canvas the title capacity is45 conservative units and the legend cell capacity30; a modest valid title or relationship description can therefore fail after a paid generation.

Offline command imported parseFoxyDiagram and createDiagramSvg using Node --experimental-transform-types. Synthetic results (no network): short control schema=OK/layout=OK; edge label40 ASCII schema=OK/layout=AI_INPUT_LIMIT; title60 ASCII schema=OK/layout=AI_INPUT_LIMIT; node label200 ASCII schema=OK/layout=OK. This confirms an accepted-shape/renderability mismatch without needing another provider call. A guessed diagram-renderer-png.ts read was absent; actual worker entry is diagram-renderer-entry.ts.

## ESTRATEGIA_EQUIPO_Y_SUPUESTOS

Coordinator assigns layout_red tests and a worker owning only diagram-renderer-layout.ts plus cohesive private helpers if needed. Keep public domain, rendererVersion, transport, provider profiles, budget and publication unchanged. No new state, approval flow, DB migration or AI retry. Test worker must preserve existing security/cancellation tests and must not relax them. Other agents continue owning the running browser fixture and its cleanup.

## CONTRATOS_Y_PLAN_POR_SLICE

One <=400-line reviewed slice: make title/edge layout use two-pass measurement with the SAME existing conservative grapheme wrapper used for drawing. No raw SVG/HTML/model code acceptance, text replacement or truncation.

1. Measure title lines at existing font30 and available width, then derive title region height from line count and line height/padding; retain the existing one-line footprint where possible. Derive graph top from that region.
2. Build escaped legend text exactly from endpoint indices plus full edge label. Measure wrapping at existing font14 and column width. Keep the current deterministic column/row ordering, but calculate each legend row height from the maximum wrapped cell in that row plus padding, with prefix sums for y positions. Reserve the resulting legend region before computing node cell height.
3. Recompute remaining node space with those measured regions, keeping current readable node fonts16/20 and all content bounds. Draw with the same measurements so the measure/draw pass cannot diverge. Leave AI_INPUT_LIMIT when the finite canvas genuinely cannot fit at the current readable fonts; do not shrink arbitrarily, silently omit content, crop, paginate or fabricate abbreviated labels.
4. Keep4Mpixel cap, worker3s/resource limits,10MiB PNG cap, escaping, digest and cancellation intact. This minimum fix need not guarantee every maximum-cardinality/maximum-text graph fits one image; it must stop rejecting modest valid multi-line title/edge shapes that fit with wrapping.

## CRITERIOS_DE_TEST_DOT

- RED then GREEN: modest2-node graph with title60 chars, edge label40 chars, and both together must render in all four supported aspect ratios. Validate output dimensions/digest and preservation of a differing final suffix (no silent truncation).
- Multiple legend rows/columns with multi-line cells must have non-overlapping geometry; preserve deterministic ordering. Inspect generated PNG visually or assert measured bounds using safe structural output, not only mocked success.
- Existing escaped XML/grapheme tests, max-node/edge cardinality, cancellation/timeouts/worker-drain and forged-result checks remain passing. Truly dense impossible text still rejects explicitly with AI_INPUT_LIMIT without changing token caps or making network calls.
- Worker test with real renderer and synthetic provider returning such a graph must progress to custody/READY once, settling usage once. No additional live request needed for this regression.
- A future browser/Gemini retry is separate paid validation, authorized/coordinated by root; preserve current failed job and receipt. It must never silently regenerate the prior failed job.

## Verification and handoff

Read the actual worker, adapter/parser, budget/ledger, renderer and custody paths; no production/test edit, memory write, credential/fixture read, Docker mutation or provider request. Sent diagnosis and exact RED scope to /root/layout_red and coordinator. Next action: run RED for modest multi-line title/edge, implement adaptive measurement, then independently review and run offline renderer/worker regression before any new live attempt.