# Foxy H2 — guarded workspace actions and leave decisions

- Agent / role: /root/foxy_architect / architect
- Session / task ID: /root/foxy_architect (H2 facade and leave guard)
- Date: 2026-10-31
- Worktree / branch: C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai / codex/foxy-ai
- Observed base: cb72e81; concurrent untracked actions implementation/tests and worker records preserved
- Phase: text materials and confirmed Library publication; images/diagrams excluded by latest user scope
- Status: completed (design only; no behavioral or visual verification by this architect)
- ESTADO_DISENO: LISTO_PARA_TDD_RED

## Evidence and scope

Inspected accepted workspace runtime and current chat/resource/preparation/history/confirmation controllers, H1 hook, concurrent actions candidate, existing Screen/Session/Workspace, AccountNavbar and shared AppNavbar. Runtime acceptance at cb72e81 and H1 review status were reported by the coordinator; source existence alone does not establish acceptance. This record does not accept the concurrent H2 candidate.

Only this own design record and a correction/addendum to the [R3 composition record](2026-10-31-foxy-architect-workspace-r3.md) are documentation writes. No production/test edits, DB, retained data, secret values, provider requests or browser sessions. All example identifiers in tests must be synthetic.

The first executable cut is the pure actions adapter. It consumes the accepted runtime without changing child controllers or starting I/O. Existing child private request IDs, CAS revisions, retries and synchronization remain authoritative. Router listeners and TSX integration follow as separate cuts.

## H2A exact entry point and narrow facade

New apps/web/src/lib/foxy-workspace-actions.ts; split a cohesive leave helper if needed to keep files under 200 lines and each reviewed unit under 400 lines. Test_runner owns the corresponding new .test.mjs file.

```ts
type Runtime = ReturnType<typeof createFoxyWorkspaceRuntime>;
type Leave = {reason: 'unsaved' | 'pending' | 'busy'; canSave: boolean};
type Ui = {
  leave: Leave | null;
  openingResource: boolean;
  loadingDestinationId: string | null;
  error: string | null;
};
createFoxyWorkspaceActions({
  runtime: Runtime,
  onChange: (ui: Ui) => void,
  onNavigate?: (href: string) => void | Promise<void>,
}) => ({
  getState: () => Ui,
  sync: () => void,
  chat, resource, preparation, history, confirmation,
  requestNavigate: (href: string) => Promise<boolean>,
  cancelLeave: () => void,
  discardAndContinue: () => Promise<boolean>,
  saveAndContinue: () => Promise<boolean>,
  dispose: () => void,
});
```

The returned object itself is the actions facade. A later React wrapper may return {actions,ui}, but must not rename the pure API. Boolean continuation results indicate that the captured target was dispatched, not server publication success. An interrupted/denied/invalid/no-target continuation returns false. resource.close():boolean returns false when it opens a leave decision and true after local close. Other child methods preserve argument types through Parameters<Runtime[group][method]> and return their actual child result or undefined when denied; do not duplicate domain DTOs.

| Group | Required methods | Guard responsibility |
| --- | --- | --- |
| chat | create, select, send, retry, loadMore, loadMoreConversations, loadSources, selectSource, selectTopic, loadCitations | create/select request a leave decision when necessary; remaining methods preserve existing chat behavior |
| resource | open, close, updateDraft, save, retry, refreshConflict, resolveConflict | source validation, unsaved/uncertain leave, cross-mutation exclusion |
| preparation | selectDestination, setTitle, selectUnit, selectTopic, prepare, retry | destination loading state and cross-mutation exclusion |
| history | loadMore, refreshList, select, refreshSelected | confirmation intent locks changing selection; read refresh remains available |
| confirmation | review, setReviewed, confirm, retry, reset | fresh child review/CAS/retry; no conflicting resource/preparation mutation |

Do not expose child init/dispose/sync methods or raw clients to UI. All public actions inspect runtime.getState() at invocation; closed/disposed means no forwarding, callbacks, navigation or revival. Defensive snapshots must not reveal the private continuation, arguments, draft copies or request bodies. getState after adapter disposal or runtime closure returns an empty Ui. Adapter dispose cancels its own continuations/loading and clears local state; H1 alone owns runtime.dispose.

sync performs zero network or child sync calls. It may recompute an existing leave reason/canSave, emitting only when the public Ui changes. It must not auto-continue when a background request settles. The runtime DAG already synchronizes controllers and refreshes history once after resource.open; facade/hook/UI must not add a second initial list request.

resource.open(conversationId,turnId) requires the current chat conversation with that ID and a current loaded turn with that ID/state READY. Validate before deferring and again before executing a captured target. No call for an unloaded, foreign, QUEUED/RUNNING/FAILED turn. Use the real runtime method and loading flag, not a copied answer or fabricated saved resource.

## Mutation matrix

Same-operation duplicate invocation may delegate to the child's single-flight promise. Cross-operation exclusion must not disable R1's supported typing during SAVE. All gates apply to direct handler calls, independently of disabled buttons.

| State | Allowed | Denied |
| --- | --- | --- |
| R1 SAVE pending/busy | typing; existing save/retry single-flight as supported; read history | PREPARE; CONFIRM; unguarded context/resource changes |
| PREPARE pending/busy | preserve/continue local typing; that intent's retry; read history | resource.save AND resource.retry; new PREPARE; CONFIRM; changing preparation metadata/destination |
| CONFIRM pending/busy | that intent's retry; read history | draft edits/save/conflict adoption; preparation changes; history.select; unrelated new mutation |
| Acknowledged durable PREPARING publication only | normal close/navigation; recoverable inspection/history | no restriction merely from durable job state |

Review/confirm check no R1/PREPARE pending/busy, then preserve child checks. Metadata/selectors check their own pending/busy as well as confirmation; do not rely solely on a UI disabled state. Read access errors still follow shared runtime identity teardown. Object403/404 and current-resource revalidation retain their separate [R3 composition](2026-10-31-foxy-architect-workspace-r3.md) policy; do not parse localized child error strings for identity.

## Leave decision and uncertain recovery

The private continuation is one of CLOSE, SELECT_CONVERSATION, CREATE_CONVERSATION, OPEN_RESOURCE or NAVIGATE. The first blocked target stays fixed until cancel/resolve; another click cannot silently replace it. Clone create input at capture. Public Ui contains no destination ID, href, request body or text. Each continuation belongs to this adapter/runtime identity and operation epoch, never another teacher.

Dirty R1 or any R1/PREPARE/CONFIRM pending/busy causes close/select/create/open/local navigation to show leave, with no destination call. Prefer pending over busy over unsaved when multiple states apply. canSave requires dirty valid editable R1, no conflict or errorCode CONFLICT, and no pending/busy mutation. A pure initial resource loading view with no dirty/pending mutation may be explicitly closed through root local clear; do not claim to cancel server work.

- cancelLeave clears the captured target/leave only, with no child call.
- saveAndContinue is available only when canSave. Capture the current target identity, invoke the actual R1.save, then re-read latest state. Continue only after result saved, latest dirty=false, no pending/busy sibling and still the same active target/epoch. A newer draft typed while SAVE is in flight remains visible and prevents continuation. Failure/conflict/uncertainty preserves the draft and target.
- discardAndContinue is an EXPLICIT informed close of local work, including PREPARE/CONFIRM pending/busy. Call runtime.resource.discardAndClose as the root clear; its DAG clears preparation/history/confirmation context and local intents without permanently disposing reusable children. Then dispatch the fixed target once if still active. Do not refuse this choice merely because an uncertain request exists, and do not call confirmation.reset as a substitute for the root clear.
- The confirmation/prepare request may already have committed. Copy must say that closing does not undo it. No DELETE, cancellation claim, automatic retry or replacement UUID/CAS. The same READY chat answer reopens its idempotent existing resource; listing its real preparations recovers a possibly committed publication and inspecting it reveals actual state. A successful lost confirmation is recovered as PUBLISHED, with no second student material; do not require the old local receipt to inspect it.
- If the target async action is running, retain an in-progress latch until it settles. Later cancel/dispose/runtime-close invalidates completion callbacks; it cannot navigate a new subject or emit stale Ui. Clear private captured arguments as soon as target is consumed/cancelled/disposed.

On internal NAVIGATE, accept only safe application-local absolute paths (single leading slash, no protocol-relative form, backslash or control characters). Missing onNavigate or invalid href returns false and a short generic error without clearing private work. No fallback window.location or model-provided href. Callback failure is a local navigation error, not a publication failure.

## H2A RED cases

1. Constructor/sync/getState: zero I/O and zero child synchronization; unchanged sync emits zero times. Snapshot mutation cannot affect adapter.
2. Exact chat facade covers every method in the table using actual arguments/results. No child lifecycle escape. Resource history initial load remains one runtime-owned call.
3. Direct resource.save AND resource.retry calls during PREPARE pending and busy both produce zero child saves. Matching retry delegates unchanged private intent. Cross-operation matrix and typing-during-SAVE are exercised separately.
4. Dirty close/select/create/open/navigation captures one immutable target and calls no target. A second request does not replace it. Cancel changes no child. Invalid href/missing navigation port leaves data intact.
5. Source-open mismatch/unloaded/nonREADY denied before child; changing current conversation while leave is shown prevents old target from opening. Valid current READY delegates with loading cleanup and no duplicate history refresh.
6. Save-and-continue: one successful clean save dispatches once; fail409/uncertain/newer typing/in-flight sibling blocks continuation and preserves target. Dispose/identity after awaiting save prevents late navigation.
7. Explicit informed discard during PREPARE and during CONFIRM uncertainty root-clears and continues once, without new POST/UUID or promise of cancellation. Late ACK cannot repopulate the closed context. Reopen same answer/list exposes any committed server preparation.
8. Confirmation intent prevents edit/destination/history-select direct calls; selected/list refresh still delegates and preserves intent. Acknowledged PREPARING alone allows leave.
9. Same subject holds one facade; closed runtime/disposed adapter returns empty Ui and no forwarding, callbacks or late flag resets. Adapter disposal does NOT dispose runtime. Reentrant onChange cannot execute/capture a second target or loop.
10. Async navigate rejection/late settle and async open races are handled once; canceled/replaced identity cannot receive navigation/error. No optimistic publish or source recreation is introduced.

## H2B React binding and UI props (separate cut)

New use-foxy-workspace-actions.ts binds one adapter to H1's nonnull runtime object identity. Stable onChange observer copies Ui; ref the current navigation callback. Null/closed/mismatched binding synchronously exposes no old actions/Ui. Cleanup disposes adapter only. Invoke adapter.sync after a new coherent runtime snapshot, not every keystroke via a child sync-all loop. H1 remains the sole creator/disposer of runtime and sole initializer.

Session consumes H1 {state,runtime,initializing}, passes narrow guarded chat to existing FoxyWorkspace plus onOpenResource(cid,tid), and passes actual R1/R2A/R2B/R2C snapshots and narrow groups to new materials presentation. Resource dialog leave choices use adapter Ui/actions. Do not keep Session's prior manual chat-only construction. Screen passes the verified teacher subjectId and key; students do not mount this binding. Draft/confirmation data never goes to local/session storage.

The single materials Dialog uses inline leave content rather than a nested Dialog. Unsaved copy offers Guardar y continuar / Descartar cambios y continuar / Seguir editando. Pending/busy copy offers Reintentar solicitud where supported / Cerrar vista y continuar / Permanecer; say the operation may already have completed and will be consulted on reopening. When canSave=false never show a working save choice. UI disables conflicting actions but pure facade tests prove enforcement independently.

Keep real snapshot field names: classroomsError; R2B inspectionLoading/inspectionError; R2C review.publication.revision. loadingDestinationId and openingResource are adapter-local UI flags, not backend progress. Use accepted R1 conflict resolution and R2C explicit checkbox, CAS and receipt without rebuilding payloads.

## H2C app navigation/browser bridge (separate cut)

Shared AppNavbar already accepts onNavigate and preserves modified/new-tab clicks. AccountNavbar currently routes itself and notification selections; add an optional onNavigate override used consistently by both, defaulting to current router.push outside Foxy. Register the active session's requestNavigate with Screen; adapter onNavigate directly invokes router.push so it cannot recurse into itself. Unregister on subject change/unmount. PDF new-tab preview does not leave the editor.

Use native beforeunload only for actual page unload with unsaved/uncertain work; it does not cover SPA back navigation. Pages Router beforePopState can decline Next's handling, but the caller then owns history reconciliation; returning false alone is not proof that Stay preserves URL/history. routeChangeStart is not a documented cancellation mechanism. Source: [official Pages Router useRouter reference](https://nextjs.org/docs/pages/api-reference/functions/use-router). Context7 lookup was attempted first and failed with monthly quota exceeded; this official fallback was read without using a browser session.

Keep the browser bridge in its own helper with supported router APIs, single-flight target, cleanup restoring the default handler, and no private Next history fields or thrown-string event cancellation. Its RED and ego(lite) QA must demonstrate browser Back -> Stay (same content AND actual address), Back -> explicit Continue exactly once, forward history, nested app navigation and teardown. Native Back behavior is not considered verified by the pure H2A tests or this design. If actual router behavior requires an additional focused cut, keep the interface/navigation gate visible as incomplete until that cut passes.

## Team ownership, verification and handoff

H2A owner edits only new pure adapter/helpers; test_runner owns new tests. H2B owner edits only its new hook/test surface. Session/Screen/Navbar/TSX owner integrates afterward with coordinator-assigned exclusive surfaces. No accepted child/runtime files need changing for H2A; pure fileUrl delegation and source-access probe, if needed, remain explicitly assigned small follow-ups. Do not restore visuals scope.

Observed checks for this design: source/Git inspection and PowerShell documentation structural/link check passed for this record and the R3 composition record: six local Markdown links resolve; no trailing whitespace or zero-width characters. Functional/DB/provider/browser tests were not run because this is a design-only deliverable. Behavioral acceptance remains with test_runner/reviewer and coordinator. First unfinished work is RED evidence for any unmet H2A cases, then narrow adapter implementation/review, H2B binding, materials TSX and actual end-to-end synthetic publication QA.

Engram project/context/search reads succeeded, but saving slice/foxy-workspace-actions-h2 was blocked by the host hook: Codex host session is not registered; start a new Codex session to register it. No session identity was invented and no unrelated host lifecycle was started to bypass this. Repository records are the durable handoff; memory persistence remains unavailable for this task.
