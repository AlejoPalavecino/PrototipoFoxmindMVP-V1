# Foxy complete proposal — next implementation boundary

- Agent / role: /root/architect_next / architect.
- Runtime session ID: unavailable; task identity /root/architect_next.
- Date: 2026-11-01.
- Worktree / branch: C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai / codex/foxy-ai.
- Observed HEAD: 740adeb.
- Status: completed (design of first cut only).
- ESTADO_DISENO: LISTO_PARA_TDD_RED for M4D2, not for the entire visual subsystem.

## Scope and source reconciliation

The user now authorizes completing the original proposal in this branch before integration. This supersedes earlier text-only stop boundaries. Complete recovery composition/UI, images and diagrams, real-provider verification when configured, and final acceptance; no merge/push/deploy is implied. Existing text-material live verification remains valid within its recorded synthetic limits.

Read the [accepted recovery controller contract](2026-10-31-foxy-architect-management-web-m4cd.md), [proposal](../../odd/tasks/foxy-ai-proposal.md), actual workspace runtime/actions/Session, management controller, visual domain/parser and text purposes/prompt. No production, tests, DB, provider, credentials or browser changed/executed. Memory writes are unavailable under the unregistered-runtime instruction and were not attempted. Another agent's new completion record is preserved.

## M4D2: exact first cut

No new public API/schema or provider decision is needed. Add the already-implemented management companion to the existing workspace graph, then expose narrow actions and actual unload guarding. Ownership: one worker edits runtime/actions/Session only; test_runner edits corresponding tests; no concurrent edits to these surfaces.

Files:
- apps/web/src/lib/foxy-workspace-runtime.ts
- apps/web/src/lib/foxy-workspace-actions.ts
- apps/web/src/components/foxy-workspace-session.tsx
- Tests with the same basenames; own work record.

Runtime constructs createFoxyPublicationManagementController ONCE after confirmation with the SAME client and identity callback, resourceBase, preparation, history, confirmation, onChange and onReconcile. Snapshot gains management: ReturnType<ReturnType<typeof createFoxyPublicationManagementController>['getState']> | null. Expose runtime.management internally alongside siblings. Closed snapshot has null; dispose includes management. The constructor remains zero-I/O.

DAG:
1. R1 callback synchronizes preparation/history/confirmation and management.
2. Preparation callback synchronizes history preparation adoption/confirmation and management.
3. History callback synchronizes confirmation and management.
4. Confirmation callback preserves its existing receipt refresh, then synchronizes management.
5. Management callback only publishes a batched snapshot. It never synchronizes an upstream child.

Initialization callbacks are not assumed absent: construct all downstream references before enabling propagation, or use a guarded initialization phase. Do not introduce a React aggregate-state effect calling all child sync methods.

Auto-read lane: after a coherent selected inspection changes, compute a canonical stamp resourceId:selectedId:publicationRevision:publicationState. Schedule one management.refresh in a microtask, recording the stamp BEFORE queuing. Capture existing contextEpoch, resourceId and selectedId; before I/O check all three, not just IDs (A→B→A is stale). No current inspection means no auto-read. Loading flag/typing changes with the same stamp do not read again. Acknowledged cleanup polling belongs only to the companion.

Reconciliation lane: a single coalesced task performs history.refreshSelected and history.refreshList, then management.refresh if the same context/epoch remains. It is read-only. The controller's deduplicated mismatch floor prevents endless mismatch→reconcile loops. A receipt or 409 produces at most one sequence; no auto-POST, no resetting its valid receipt, no guessed state from receipt. Use a helper if runtime exceeds cohesive size; no compressed code to fit budget.

Facade adds management with exactly refresh, retryPreparation, reviewDiscard, setDiscardReviewed, discard, retryRequest, cancelDiscardReview. Do not expose child init/dispose/sync. Manual management.refresh may run the same bounded selected-history refresh first; internal polling remains raw management GET.

Busy/pending management joins block() and Session.onRegister.shouldBlock. It blocks SAVE and SAVE retry, new PREPARE and its retry, new CONFIRM and its retry, selection of another preparation, and new management commands. It preserves textarea typing (except the existing CONFIRM lock), reads and the idle uncertain management.retryRequest. Durable cleanup PENDING/FAILED without a command in flight does not block exit.

The existing explicit leave discard closes the local view and invalidates all child contexts through R1; it does not cancel or undo a durable server command. Do not call R1.discardAndClose from the server-side preparation discard action.

Auth teardown disposes all six controllers before notification. Pagehide and subject change follow H1 ownership and accepted document boundary; no second runtime/client/hook.

## DoT: bounded meaningful tests

1. Runtime creates one extra companion/client count unchanged; closed state null and late callbacks ignored.
2. Select coherent preparation -> one management GET; typing/status-only callback -> zero extra GET.
3. Reconcile receipt/409 -> bounded selected/list/management reads; same mismatch does not loop.
4. Resource/selection A→B→A before queued read -> no stale GET or wrong state.
5. Management RETRY/DISCARD busy or uncertain blocks cross-mutations and selection via direct facade calls; typing and reads remain usable.
6. Native shouldBlock agrees with app leave guard for management intent; known cleanup alone does not block.
7. Auth, pagehide and subject teardown abort management read/command/timer; no extra POST or quota inference.
8. Preserve existing chat/editor/publication tests and actual draft bytes. Run web TypeScript and boundaries, then independent review once. Reopen only concrete failing requirements; do not add another design layer.

No DB migration or real provider call is part of M4D2. Unit stays below approximately400 authored lines; if exceeded, split runtime composition and facade/Session guard into two independently tested units.

## Immediate following cut: M4D3

Add the pure management panel to the current material Dialog. It receives actual selected publication, management snapshot and narrow facade actions. Existing accepted contract already defines labels, explicit unchecked discard review, retry-saved-snapshot versus retry-uncertain-request, draft preservation and cleanup PENDING/FAILED/DONE. No nested dialog or TSX polling. Extend history terminal guards to DISCARDED alongside PUBLISHED. Final synthetic flow: FAILED→same-ID retry→READY→confirmed Library; dirty draft→discard→immediate file denial→real cleanup acknowledgment/quota release.

## Visual subsystem follows recovery

Current repository has only visual request/diagram domain contracts; capabilities remain disabled. It does not contain durable visual jobs, provider image generation, diagram generation/rendering, private visual assets or publication. Existing diagram bounds are30nodes/60edges and structured data, not executable model HTML/SVG.

Before visual implementation, a separate narrow design must verify current provider APIs/model capability/pricing from official documentation and choose bounded actual output formats. Use a provider port and server-side stored assets, shared budget, private teacher authorization, source grounding and durable job/fencing patterns already in text. Images and diagrams must support GENERAL private ownership before a classroom destination is selected. Reuse file scanning/publication where compatible; do not weaken classroom-custody rules to force private assets into an incompatible file scope.

Diagram generation should return validated FoxyDiagram data; rendering is trusted deterministic application code. Image generation returns bounded bytes with verified MIME/dimensions, never an untrusted model URL used as browser href. No model credentials or raw secret logs. The first visual vertical slice should complete one asset kind from request through private preview and confirmed Library publication before adding the second kind. Do not call a provider solely to generate coding-session decoration.

The proposal's six text purposes already exist in UI/domain and are sent in text generation payload. Acceptance still needs actual provider examples for summaries/review/activity ideas/planning and classroom grounding; existence of purpose options is not real-provider proof. Any unavailable configured credential/provider evidence must remain explicit, not simulated as complete.

\n