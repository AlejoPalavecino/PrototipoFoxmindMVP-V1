# Foxy M4C/M4D — recovery client and teacher UI

- Agent / role: /root/foxy_architect / architect
- Session / task ID: /root/foxy_architect (M4C proxy/client and M4D controller/UI)
- Date: 2026-10-31
- Worktree / branch: C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai / codex/foxy-ai
- Observed base: 620af88; concurrent backend M4B routes/runtime and tests preserved
- Phase: finish text materials/publication and recovery; no images/diagrams
- Status: completed (design only; functional/browser acceptance remains open)
- ESTADO_DISENO: LISTO_PARA_TDD_RED

## Evidence and scope

Read actual web proxy/client, workspace runtime/actions/hooks/Screen/Session, resource/history/confirmation controllers and materials Dialog, backend management service and existing domain DTOs. Source existence/review status is not independent acceptance. Only this own design record is written. No production/tests/DB/provider/browser/secret execution. Builds on [M4A backend contract](2026-10-31-foxy-architect-publication-management-m4a.md), [recovery policy](2026-10-31-foxy-architect-publication-recovery.md) and [M3 cleanup](2026-10-31-foxy-architect-publication-cleanup-m3.md).

## M4C proxy/client — first small RED

Final exact new WebFoxyClient methods (supersede preliminary managementPublication name):

```ts
inspectPublicationManagement(id:string,signal?:AbortSignal):Promise<FoxyPublicationManagement>;
retryPublication(id:string,input:RetryFoxyPublication,signal?:AbortSignal):Promise<FoxyPublicationCommandReceipt>;
discardPublication(id:string,input:DiscardFoxyPublication,signal?:AbortSignal):Promise<FoxyPublicationCommandReceipt>;
```

Reuse domain barrel types and existing publicationPath/agendaId/call implementation. GET /publications/:id/management has no body/CSRF fetch. POST /:id/retry and /:id/discard use existing fresh-CSRF/same-origin/no-store/abort30second behavior. Serialize input before awaiting CSRF, so caller mutation during that GET cannot change captured UUID/CAS/body. Client generates no UUID, retries nothing automatically and does not infer state/space from receipt.

Proxy adds only UUID-shaped /publications/:id/management GET and /publications/:id/(retry|discard) POST. Query must be empty. Keep current encoded/traversal/backslash/path rejection, body/content-type/encoding/size/time limits, JSON response2MiB, request1MiB and metadata30second upstream timeout. These are tiny JSON routes, never binary. No wildcard publication mutation allowlist, arbitrary limit increase, redirect following or new forwarded credential headers. Proxy wrong method keeps existing405 behavior; backend wrong method stays its existing404 policy. Existing prepare/inspect/confirm/file routes unchanged.

M4C RED: exact paths/methods; invalid ID before upstream/CSRF; unknown/duplicate query and encoded path reject without upstream; wrong method; forwarded actual cookie/origin/X-CSRF/body byte identity; no automatic POST repeat; body snapshot while CSRF deferred; abort/expired identity uses same shared callback; safe no-store/nosniff/error handling and bounded responses; no binary/redirect acceptance on these paths. Constructor/client method availability tests are not a substitute for actual proxy-handler integration.

## M4D1 companion controller — exact API/state

New apps/web/src/lib/foxy-publication-management-controller.ts; split read/command helpers if needed for under200 lines/file and400 lines/reviewed unit. Reuse actual sibling controller inferred getState types and WebFoxyClient picks.

```ts
createFoxyPublicationManagementController({
  client, // Pick of the three M4C methods
  resource,preparation,history,confirmation, // getState only
  onChange:(state:State)=>void,
  onReconcile:()=>void,
  uuid?:()=>string,setTimeout?,clearTimeout?,
}) => ({
  getState,syncContext,refresh,retryPreparation,reviewDiscard,setDiscardReviewed,
  discard,retryRequest,cancelDiscardReview,dispose,
});
type State = {
  management:FoxyPublicationManagement|null;
  loading:boolean; busy:boolean; pending:null|'RETRY'|'DISCARD';
  discardReview:FoxyPublicationSummary|null;
  discardReviewed:boolean;
  canRetry:boolean; canReviewDiscard:boolean; canDiscard:boolean;
  receipt:FoxyPublicationCommandReceipt|null;
  error:string|null; errorCode:string|null;
};
```

Constructor0I/O. getState defensive; closed/disposed empty state. No UUID/CAS input body/snapshot copy in public pending state. Identity binding is actual current resource.id and history.selectedId; selected inspection must belong to that resource and selection. refresh():Promise<void> coalesces management GET reads; no history mutation. syncContext():void performs no I/O, only fences/invalidates/recomputes state. reviewDiscard/setDiscardReviewed/cancelDiscardReview are local void actions. retryPreparation/discard/retryRequest return applied/conflict/uncertain/unavailable when attempted, undefined when gated; no new I/O/UUID on duplicate while busy or existing intent (only retryRequest may repeat an idle uncertain intent).

Read and mutation epochs/signals are separate. Changing resource ID/selected publication ID or disposing aborts both and clears state/timers/private intent. Same-publication revision/state advances invalidate management capability and discard review/checkbox, but MUST NOT clear an uncertain command or its command epoch. A refresh with inspectionLoading or temporarily null inspection likewise cannot erase the same-ID intent. Old subject/selection replies never emit, navigate or reconcile another binding.

Validate management response ID/revision, exact known enum/boolean types and canRetry iff retryReason=null. Enable only when its ID/revision exactly matches the currently inspected publication, no newer history/preparation entry contradicts it, no read error/loading and no conflicting mutation. Non-DISCARDED expects cleanup NOT_REQUESTED; DISCARDED expects PENDING/FAILED/DONE and no retry/discard capability. Unknown/inconsistent response fails closed. Raw extra server fields are not put into state. A newer management revision requests one onReconcile for that observed floor; a lower revision is rejected. Deduplicate reconciliation for the same observed mismatch to avoid an automatic GET loop. Manual refresh remains possible.

New retry uses server canRetry, the same current resource/publication IDs and saved resource.revision matching publication.resourceRevision; no in-flight/pending R1 SAVE/PREPARE/CONFIRM or another command. It retries the stored snapshot, not the current textarea. A local dirty draft may remain: it is neither saved nor overwritten by this operation. UI explicitly states the saved version is retried and editor changes are retained. Old/stale/incompatible content remains governed by M0/M2; never silently prepare a replacement file with a new UUID.

Discard review uses server canDiscard with coherent ID/revision and no conflicting mutation. It is allowed for a stale saved revision, archived classroom or dirty local draft because it removes only that unpublished preparation. reviewDiscard freezes the current visible publication summary, clears checkbox and performs no server mutation. setDiscardReviewed accepts true only for that still-current review; review/checkbox invalidate on selection/publication changes. discard sends confirm:true only after explicit checked review. cancelDiscardReview changes local review only and is unavailable while a command intent exists. Do not call R1.discardAndClose here: that is H2's distinct action for closing a local editor and would lose the draft this operation promises to preserve.

## Command intent, receipts and errors

On a new retry/discard, capture one private immutable {resourceId,publicationId,action,input}; generate UUID once and publicationRevision from coherent current management/review. No optimistic publication-state or quota update. Set busy=true and public pending=action. While busy, duplicate calls do no new request/UUID. Unknown outcome keeps the private intent, pending action and busy=false; retryRequest resends EXACT original ID/body/CAS with a fresh transport CSRF token. It does not re-gate against current canRetry/canDiscard: a same-ID publication may already have advanced, and backend receipt replay is authoritative.

Receipt must match captured publication/action and valid bigint revision exactly capturedCAS+1; project exactly the three public fields. A malformed200/JSON/network/timeout/503/429 outcome remains uncertain with original intent; do not reconstruct a new request. Matched receipt clears intent/pending, records receipt and requests onReconcile once; a refresh callback failure never converts a known successful command into uncertain or discards its receipt. applied means command acknowledgment, not completed preparation or removed bytes.

CONFLICT/409, INVALID_INPUT/400, CSRF_INVALID and ORIGIN_NOT_ALLOWED are definite rejection: clear intent, review/checkbox and stale capabilities; preserve resource draft and request one current-state reconciliation; return conflict. Do not automatically issue another mutation. AUTH_REQUIRED/EMAIL_VERIFICATION_REQUIRED use the shared client's immediate runtime teardown; standalone controller also clears/latches identity loss. Object FORBIDDEN/NOT_FOUND clears this companion's private state/review/intent and shows unavailable; it does not erase R1's draft or fabricate permission. Current-resource access revalidation remains the existing workspace policy. No raw exception/code/key rendered as user prose.

## Read polling and90second safety

Poll only management GET at five seconds for the same selected DISCARDED publication whose last valid cleanup state is PENDING or FAILED. One timer and one read at a time; manual reads coalesce, every callback checks current identity/read epoch. A transient GET failure disables actions, shows a safe update error and may continue the same bounded polling using the last confirmed pending-cleanup binding. No overlapping recursive retry, no mutation on a poll. Stop DONE, selection/resource change, identity, dispose. Known DONE for that publication must not regress to PENDING/FAILED in a stale response.

No client countdown, elapsed-time DONE, percentage or policy that releases space at90seconds. Backend's initial quiet window is a minimum safety wait; a cleaner claim failure keeps its own90second lease and may take longer. UI queries state rather than predicting it. No-file discard can legitimately report DONE immediately only from actual management response. FAILED cleanup is still a DISCARDED preparation, not a new failed preparation or permission to retry generation. Actual classroom usage is the authoritative byte counter.

M4D1 RED: constructor0IO; exact state/no private body leakage; read validation/mismatch/raw enums; distinct read/command epochs; new retry and discard gating; dirty draft retained byte-for-byte; explicit unchecked review; one UUID/body despite caller/context mutation; uncertain retry across same-ID revision/state advance; malformed receipt uncertainty;400/409/auth/object failure distinctions; one reconcile per accepted/conflicted attempt with reentrant callback safety; serial selected cleanup polling PENDING/FAILED/DONE, no90second inference, stale DONE regression denied; dispose/identity/old subject clears all timers/data/callbacks.

## M4D2 runtime/facade/navigation composition — separate RED

Create this companion once with the SAME Foxy client/identity callback, after existing children. Snapshot adds management:State|null; closed snapshot has null; dispose includes it. Keep the existing DAG downstream: R1/preparation/history/confirmation changes call management.syncContext. management.onChange publishes aggregate only; it never syncs an upstream child or confirmation. A context stamp resourceId:selectedId:inspectedRevision:state schedules one coalesced raw management.refresh when a real selected inspection changes; not every loading flag, draft keystroke or aggregate render.

onReconcile queues a context-fenced/coalesced read sequence: history.refreshSelected and refreshList once, then raw management.refresh for the still-current identity. Receipt handling and read-mismatch reconciliation are read-only, analogous to existing confirmation metadata refresh. Stamp before scheduling, guard reentrancy and do not duplicate requests from a React sync-all effect. A repeated mismatch of the same floor cannot self-sustain a refresh loop; surface manual update if source has not caught up.

Facade adds management:{refresh,retryPreparation,reviewDiscard,setDiscardReviewed,discard,retryRequest,cancelDiscardReview}; no child sync/dispose/init exposure. Manual facade refresh may refresh selected history first and then raw management, whereas the controller's polling reads only management. Pending/busy management joins H2 leave pending/busy checks and disallows conflicting SAVE/PREPARE/CONFIRM and history.select (direct handlers too); read refresh remains allowed. Normal draft typing is retained except existing confirmation lock. Same original uncertain intent remains retryable idle; no re-gating by the newly advanced state. Explicit H2 close/discardAndContinue root-clear still closes local view only and invalidates this companion's context through R1/history reset, without undoing the server command.

Add management.pending/busy to actual Session onRegister.shouldBlock as well as actions.block, so native beforeunload and app-link leave guards agree. Acknowledged cleanup PENDING/FAILED alone does NOT block leaving: cleanup is durable. Pagehide/identity teardown disposes the new controller, and native cached return re-verifies session under the accepted document-boundary design. H1 owns runtime lifecycle; no second client/hook per panel.

M4D2 RED: finite callback graph, one client/companion, no GET storm from typing; coalesced receipt/mismatch refresh with current selection only; all mutation/navigation direct-call gates; uncertain close doesn't publish/cancel/reset saved draft; cleanup background doesn't cause leave prompt after acknowledged discard; new controller included in A->B/student/identity/pagehide cleanup and late callbacks ignored; accepted R1/R2 and Back behavior preserved.

## M4D3 existing-style UI and actual QA

Add a pure FoxyPublicationManagementPanel in the current resource Dialog under selected preparation. Props: actual selected publication, companion state and narrow facade actions (plus a parent-computed cross-operation lock if needed for presentation). No fetch factory, polling or storage inside TSX. Pass state/actions through Session/ResourceWorkspace; keep original chat/textarea/private resource/history/confirmation behavior. Reuse p5 actions/notice/tokens and inline confirmation; no nested Dialog/new art or images/diagrams.

FAILED row: Reintentar preparación only when allowed; copy that it retries this saved PDF version and retains editor changes. Map actual retryReason to concise guidance (changed resource -> save/prepare new version; unavailable destination -> review destination/new preparation; rejected/invalid/incompatible -> edit/new preparation). STATE is normal for nonFAILED, not a generic alarming error. Do not turn unknown fields into inferred reasons.

Descartar preparación opens inline frozen title/version review and unchecked acknowledgment that the private PDF will be removed while the saved resource/editor remain. Confirmar descarte sends the command; Conservar preparación cancels local review. It does not call the existing leave-button handler Descartar cambios y continuar. During busy show the actual request status; uncertain shows No pudimos confirmar la solicitud and Reintentar solicitud using original intent, plus existing informed close option. Do not label this server cancellation or claim a failed preparation was removed before the response.

DISCARDED display: PENDING -> Preparación descartada. La liberación de espacio está pendiente; FAILED -> La preparación sigue descartada. Todavía no se pudo liberar el espacio; DONE -> El archivo fue eliminado or no-allocation equivalent only when actual data distinguishes it (otherwise safe El espacio de esta preparación ya no está reservado). Generic DONE alone cannot tell whether a blob existed, so do not invent that history. Keep metadata tombstone visible, hide preview/confirm/retry-generation, retain actual resource and allow manual Actualizar estado. No fake quota counter/countdown. PUBLISHED uses Library management, never this discard action.

History must treat DISCARDED as terminal just as PUBLISHED for stale/equal-revision conflict handling; old READY/PREPARING reads cannot revive preview/confirmation. Current available-file condition already limits preview to READY/PUBLISHED; preserve it. Receipt is a neutral command acknowledgment (Reintento registrado/Descarte registrado. Actualizando estado), not a generated material or quota update. Cleanup FAILED does not show a new preparation-retry button.

Component RED/QA covers explicit review, code/state separation, busy/uncertain/replay, reason guidance and draft preservation, inaccessible target, stale terminal rows, keyboard/focus/escape and320/390/1440 layouts. Actual ego(lite) synthetic journey must prove existing FAILED after reload -> same-publication retry -> READY -> explicit Library confirmation exactly once; discard while dirty -> draft retained -> immediate file denial -> actual PENDING despite time -> storage failure/restart -> DONE and actual quota release. Exercise double clicks/lost response/current-state advance, account switch, native navigation and cleanup while AI disabled. No real provider/retained data or seeded DONE substitute for that proof.

## Ownership, checks and handoff

M4C owner edits proxy/client only; test_runner owns their tests. M4D1 owner edits new pure controller/helpers; M4D2 gets exclusive runtime/actions/Session composition after backend M4B review; M4D3 owns new panel and tiny materials integration. Do not overlap current backend runtime owner or accepted controller code unnecessarily. Coordinator owns roadmap, commits and final stop after materials/publication QA.

Source/Git inspection and PowerShell structural/link check passed: three local links resolve, no trailing whitespace or zero-width characters. Guessed use-foxy-navigation.ts/workspace-navigation.ts reads were absent and corrected to actual Screen/Session/bridge code. No functional/DB/browser/provider checks by this architect. Engram host persistence remains unavailable from the observed unregistered-session hook rejection. First unfinished tasks: M4C RED, M4D1 RED, composition, UI and actual end-to-end synthetic QA. No completion inferred from design or mock responses.
