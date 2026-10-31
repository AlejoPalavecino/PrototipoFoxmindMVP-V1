# Foxy R3 — session composition and complete materials UI

- Agent / role: /root/foxy_architect / architect
- Session or task ID: /root/foxy_architect (R3 composition/hook/UI)
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: a98f3a2; untracked runtime implementation/tests appeared during inspection and were preserved
- Phase: Foxy text materials/publication completion
- Status: completed (design only; no functional/visual verification by this architect)

## Current scope and inspected evidence

User narrowed the delivery to finish editable text materials and confirmed Library publication, then stop. Do not implement image or diagram generation in this delivery. Historical visual designs remain context, not an active implementation task.

Read actual R1/R2A/R2B/R2C at a98f3a2, current screen/session/workspace and tests, account/classroom clients, shared Dialog and broad UI contract. Inspected the concurrently authored foxy-workspace-runtime candidate and its current tests; candidate existence is not independent acceptance. Only this own design record was written. No production/test changes, secrets, retained DB, browser or providers.

## R3A runtime, initial RED already communicated

New createFoxyWorkspaceRuntime({subjectId,createFoxyClient,createClassroomClient,onChange,onIdentityRequired}) creates one Foxy client and one classroom client with the SAME identity callback, then chat/R1/R2A/R2B/R2C once. Constructor performs no I/O; init is idempotent and memoizes before emitting to avoid reentrant initialization. init starts chat.init and the real teacher classroom list; a list error does not destroy general chat.

Real list call is classroomClient.call<{teach:Classroom[]}>('', 'GET', undefined, runtimeAbort.signal), GET /api/v1/classrooms; filter actual teacher/nonarchived entries. Detail is call<Detail>('/'+id,'GET',undefined,combinedSignal), GET /api/v1/classrooms/:id. No sample rows or fabricated curriculum. Scope all promises by immutable subject ID and lifecycle/operation epoch, and combine detail caller abort with runtime abort.

Identity loss first latches closed, aborts and disposes all five controllers, clears snapshots/classrooms/private buffers, then notifies the parent exactly once. Dispose is idempotent; no request or callback may repopulate data afterward. Cleanup must attempt all owned disposals. No dirty-navigation prompt blocks an identity teardown. Explicit unmount dispose need not emit React state during cleanup, but getState afterward is empty/closed.

The runtime candidate actually exposes getState, init, dispose, reloadClassrooms, loadClassroom and child handles chat/resource/preparation/history/confirmation. Its snapshot has classroomsError (plural), not the initial proposed classroomError/classroomsLoading fields. Its loadClassroom resolves Detail|undefined when closed. H1 below adapts this actual shape without requiring an unrelated runtime rewrite; guarded UI facades are a later adapter, not raw child handles passed directly to presentation.

### Synchronization graph and reentrancy

- R1.onChange updates resource snapshot, then preparation.syncResource, history.syncResource and confirmation.syncContext.
- R2A.onChange invokes history.syncPreparation (its result guard coalesces repeated snapshots) and confirmation.syncContext.
- R2B.onChange invokes confirmation.syncContext.
- R2C.onChange publishes state only, except one receipt-triggered metadata refresh described below.
- Chat.onChange publishes chat state; resource navigation is guarded in commands rather than a generic synchronize-everything effect.

Batch nested callbacks with depth/dirty or a single guarded microtask. Propagate only downstream and publish one coherent aggregate after the graph settles; never run all sync methods in a React effect that depends on the aggregate state. Confirmation emits on sync, so an upstream edge would loop. A queued flush must recheck closed/subject epoch and read current state, never emit a captured private snapshot after teardown.

For a new confirmation receipt, stamp it consumed BEFORE scheduling one selected/history-list GET refresh. Fence that work to the same resource/publication context; no POST and no confirmation reset, which would lose its receipt. The existing runtime candidate already refreshes history once after resource.open resolves opened: the hook/UI must not duplicate that initial refresh after each state change or keystroke.

R3A RED: construction0requests; repeated/reentrant init one call set; list error preserves chat; actual routes/signals; both clients share identity; teardown happens before single notification; all private getters/snapshots empty afterward; late older classroom/detail/init results cannot revive state; no requests after closed; public snapshots cannot mutate internal state. Existing R1/R2 regressions remain unchanged.

## H1 hook — immediate next RED, no TSX required

New apps/web/src/lib/use-foxy-workspace.ts:

```ts
useFoxyWorkspace({subjectId:string,onIdentityRequired:(code:string)=>void}) -> {
  state: ReturnType<Runtime['getState']> | null;
  runtime: Runtime | null;
  initializing: boolean;
}
// Runtime = ReturnType<typeof createFoxyWorkspaceRuntime>
```

This final H1 return shape supersedes the preliminary actions/loadClassroom return sent before reading the actual runtime candidate. H1 requires only the runtime API that already exists; the actions/leave adapter is H2. Export inferred runtime/snapshot aliases if useful instead of copying controller DTOs.

Effect depends only on subjectId. It constructs the runtime with factories identity=>createWebFoxyClient(fetch,identity) and identity=>createWebClassroomClient(fetch,identity), sets its initial snapshot, then init. Use refs for the latest onIdentityRequired callback and current subject so callback prop changes do not destroy/recreate a valid workspace. All observers check active AND current subject before setState or notifying the parent. Cleanup sets active=false before dispose, always.

Render fence: before the effect, on subject mismatch, closed runtime or identity loss, return state/runtime=null immediately. initializing=true until the current init promise settles; this distinguishes teacher classrooms loading from a genuine empty list without adding fictitious runtime fields. Identity callback clears hook binding before invoking the parent once. Noncooperative late promise results do not replace a newer binding or redirect teacher B based on an old teacher A failure.

H1 RED: initial null binding; one runtime/init for stable subject; changing callback does not recreate; A→B hides A synchronously before passive effect and disposes it; old callback cannot set state/notify for B; identity and unmount cleanup; current init only controls initializing; late list/detail/hook callbacks are ignored. Use actual hook lifecycle tests, not a pure static render claim.

## H2 session and guarded action adapter

FoxyScreen passes the verified user ID: <FoxyWorkspaceSession key={session.user.id} subjectId={session.user.id} onIdentityRequired=.../> only after authenticated/emailVerified/accountRole=teacher. A student never constructs the hook, clients or controllers. Key and hook subject dependency are both required; do not rely on an intermediate loading render to remount during a batched A→B transition.

FoxyWorkspaceSession replaces its existing manual useEffect/chat-only construction with H1. Do not leave both initialization paths running. Mount UI only with a matching open snapshot and its nonnull child states. It reads classroomsError and initializing for real load/error/empty distinctions. Use one session-level identity callback; no per-component fetch factory with a different teardown policy.

Add a separate guarded actions/leave adapter, e.g. createFoxyWorkspaceActions plus a thin useFoxyWorkspaceActions hook if needed. It consumes actual runtime/snapshot, exposes narrow child action picks to presentation, and retains navigation targets privately. UI does not call raw init/dispose/sync methods. Every forwarded action rechecks current runtime state/closed subject, rather than capture stale state from render.

Narrow action groups:

- chat: create/select/send/retry/loadMore/loadMoreConversations/loadSources/selectSource/selectTopic/loadCitations, using current methods; create/select are guarded against losing resource work.
- resource: open/close/updateDraft/save/retry/refreshConflict/resolveConflict; open validates the current READY answer identity and delegates runtime.resource.open (already loads history once).
- preparation: selectDestination/setTitle/selectUnit/selectTopic/prepare/retry, with real loader and current sibling mutation checks.
- history: loadMore/refreshList/select/refreshSelected; changing selection is blocked during a pending confirmation.
- confirmation: review/setReviewed/confirm/retry/reset; no body/CAS construction in TSX.
- cancelLeave, discardAndContinue, saveAndContinue and a safe leave-request entry for local navigation.

Adapter view state includes leave:{reason:'unsaved'|'pending'|'busy',canSave:boolean}|null, openingResource:boolean and loadingDestinationId:string|null as necessary for UI loading labels. These are local UI facts, not fabricated backend progress. Destination of the deferred navigation stays private; the first target stays fixed until cancellation or explicit resolution. Another click while the leave decision is open does not silently replace it.

Cross-operation guard: do not start SAVE during uncertain/in-flight PREPARE or CONFIRM, nor a new PREPARE during SAVE/CONFIRM. Confirmation pending locks resource edits, destination metadata and publication selection; history refresh remains a read and must not discard its retry intent. Preserve R1's supported typing while SAVE is in flight; do not disable its textarea merely because busy=true. It may still have newer dirty text after ACK.

Close/open another resource/change conversation/create another conversation/internal page leave checks R1.dirty or pending/busy mutations in R1/R2A/R2C. A durable PREPARING job with acknowledged POST is recoverable and does not alone block leaving. Show explicit save/discard/stay for unsaved text. For an uncertain publication, explain that closing does not undo a possibly completed request and offer retry/stay/close view; never call it server cancellation.

Explicit discard-and-continue calls R1.discardAndClose as the root clear; its synchronization graph clears preparation, history and confirmation context/intent without permanently disposing controllers. Then perform the captured navigation if still current. Do not call guarded R2C.reset while its intent is pending and assume it cancelled anything. save-and-continue navigates only after actual successful save AND latest state is clean/no pending; a late ACK with newer dirty text stays in the editor. A failed/conflicted save preserves data and navigation request.

Use a beforeunload warning for unsaved/uncertain work and the same adapter for internal app navigation, including navbar/back navigation. Implement against the supported Pages Router lifecycle in its own focused helper, not string throws scattered in UI. New-tab PDF/download links do not leave the editor. No local/session storage of private text or promise that unsaved text survives reload. Dispose/unregister all handlers on unmount/identity.

H2 RED: exactly one runtime per verified teacher; no old manual construction; action guards cannot be bypassed by directly invoking disabled handlers; captured leave targets/body remain immutable; SAVE ACK with newer draft does not navigate; explicit discard does not publish/cancel server work; sibling sync finite and no request storm; A→B/teacher→student/guest clears all old content; callbacks from old scope cannot route new subject.

## R3 UI components and exact data boundaries

Current paths to integrate: apps/web/src/components/foxy-screen.tsx, foxy-workspace-session.tsx and foxy-workspace.tsx. New component surfaces can be tested in parallel with H1/H2 using pure snapshot/action props; UI ownership must not overlap the runtime owner.

- FoxyWorkspace keeps chat behavior and original immutable answers; accepts a narrow chat facade, chat state, real classroom choices and onOpenResource(conversationId,turnId). Add Editar recurso only for READY text answers, including when textGeneration.enabled=false. Do not disable saved-resource operations because the original aula cannot generate new text.
- FoxyResourceWorkspace takes the four actual resource/preparation/history/confirmation states, real classrooms, guarded actions, loading flags/leave and the shared detail loader. It owns ONE existing Dialog for resource loading/editing/unavailable state and all following inline sections.
- FoxyResourceEditor({state,actions,locked}) renders resource title/markdown, Unicode counters, private-save status and explicit conflict comparison/keep-local/use-server/refresh actions. Inputs remain controlled by R1; original chat answer is unchanged.
- FoxyPreparationPanel({state,classrooms,actions,locked,loadingDestinationId}) clearly separates Título del recurso from Nombre en Biblioteca, real target aula, unit/topic/null and Preparar PDF. Loader state must not masquerade as no classroom; inactive/unavailable destinations have a visible reason. Use actual IDs only and reset association through R2A's selectors.
- FoxyPublicationHistory({state,actions,loadClassroom,fileUrl}) shows server-ordered preparations and actual version/state, cursor controls, selected inspection and old-version warning. Preview/download links use the current server-authorized publication ID only. Any selected destination label comes from that publication's classroomId, not preparation.destination of a different form.
- FoxyPublicationConfirmation({state,actions}) renders the exact frozen review destination/title/unit/topic, checkbox and final Confirmar publicación, uncertainty retry and actual receipt. Never reconstruct CAS in component state or check by default. Show success from receipt, not a local checkbox or PUBLISHED guess.

Use the shared actual loader for publication destination metadata when it is not already known: cancel/fence that read by publication/subject, display Cargando destino/No disponible on uncertainty, and never replace a missing historical unit/topic with Sin tema. Null means no association; a nonnull deleted ID means association unavailable. R2C's reviewed names are already actual fresh data and can be reused in the final summary.

The runtime owner may expose a pure publicationFileUrl delegation to its one existing client, rather than constructing another client in UI just for a URL. Its route is /api/v1/foxy-ai/publications/:id/file?mode=preview|download; UI permits only READY/PUBLISHED and actual safe same-origin builder output. New tab, noopener/noreferrer; no model HTML/href, fake PDF, Blob renderer or automatic review from link click. Server reauthorizes bytes. Existing /mis-aulas?aula=<uuid> CTA is labeled Abrir aula; it does not directly open Biblioteca. QA selects the real Biblioteca tab.

R3 access-denial follow-up is a focused composition port, not a controller rewrite: on ambiguous publication/preparation403/404, verify the current R1 resource using the shared client's GET getResource, coalesced/fenced once per failed operation. Success preserves draft without adopting its new body/revision; confirmed resource403/404 closes private editor through root clear; generic probe failure preserves draft and shows retry. Destination-only loader failure must not erase R1. Do not parse localized R2B error strings to determine auth; observe actual client errors at a scoped port wrapper or use an explicit guarded probe action. Actual AUTH/verification always uses immediate joint teardown.

## Session revalidation and teacher changes

Verified session identity is the runtime binding; subjectId is never an authorization claim sent as a substitute for cookies. Existing endpoints reauthorize every operation. At minimum, changes to the verified session user ID/role must remount or close the runtime as above, including before queued responses can render.

If adding focus/visibility revalidation (useful after opening a PDF or logging in another tab), keep it as a separate gate helper using actual account.session, single-flight and epoch-protected. Hide navbar/private workspace presentation while identity is being checked, but do not destroy same-teacher controllers/draft merely on focus. A paused Session may keep its hook mounted while returning only the checking UI; after the same verified teacher, restore it; a different teacher/student/guest disposes the old scope before showing another. Failure stays behind a retry gate, with no new user mutations. Do not put a session poll on every editor keystroke or claim instant cross-tab revocation without this mechanism. A late old account response cannot restore a newer denial or reopen teacher A's scope for B.

## Visual/UX and acceptance

Reuse Notice/Dialog and existing p5/folder-panel/--fm-* tokens. Confirmation/leave choices are INLINE in the resource Dialog to avoid nested shared title IDs. Desktop can use two columns; at320/390px stack with min-width0, wrapping and accessible actions in normal flow. No fixed footer obscuring text, no horizontal nested scrolling and no new decorative generation assets. Use aria-invalid/describedby and short polite statuses, not an aria-live editor full of model text.

States/copy must distinguish private saved text, PDF preparing privately, READY awaiting review, FAILED with saved content retained, frozen older version, archived/unavailable destination, uncertain request and actual confirmed student visibility. No fake stage/percentage or silent automatic publish. Library title and PDF/resource title can differ and must be labeled clearly. Never infer a current plan topic from NEXT.

After TSX edits, run relevant React review, type/build/boundary checks and independent native review. Test_runner owns component/hook/action tests and live ego(lite) QA in a dedicated task Space. Use synthetic current teacher/student sessions and actual API/resource/render/P4/Library flow with documented synthetic provider/storage/scanner ports; no retained configuration or real provider. Prove save/reopen/conflict, preparation/reload/history, actual PDF bytes, one material for double confirm/replay, private-before-confirm and student Library visibility afterward. Cover expired session/account switch, scope denial, archive, deleted association/material, keyboard/dialog focus, 200% zoom, reduced motion and320/390/768/1440 layouts. Do not infer live proof from static markup or seed a PUBLISHED row as substitute for confirmation.

## Work partition and verification

Runtime owner keeps foxy-workspace-runtime.ts/new helper/tests while under review. H1 owner writes only use-foxy-workspace.ts and its tests, using current inferred runtime types. H2 adapter owner writes new guarded action/navigation helpers; TSX owner edits screen/session/workspace and new pure resource components/scoped CSS. Test_runner owns all tests. Avoid simultaneous writes to Session or Screen; coordinator assigns their integration after H1/adapter contracts and runtime acceptance. Shared roadmap and final stop at materials/publication are coordinator-owned.

Only source/document/Git inspection here, including candidate implementation authored by others. No test, DB, browser or provider execution by this architect. Initial runtime/hook and TSX contracts were sent to /root as soon as available; H1 final return shape above explicitly reconciles the runtime candidate to avoid blocking RED with future facade types.

First next tasks: H1 lifecycle RED and independent pure TSX component RED in parallel; H2 guarded adapter and integration after runtime acceptance; full synthetic text-material publication QA before stopping this delivery. See [resource UI direction](2026-10-31-foxy-architect-resource-ui.md), [R2C confirmation](2026-10-31-foxy-architect-confirmation-r2c.md) and [backend HTTP](2026-10-31-foxy-architect-publication-http.md).

## Attributed H2 follow-up

Coordinator later reported R3A accepted at cb72e81 and H1 in review. The exact narrow actions API, explicit informed uncertain-close behavior, mutation matrix and RED cases are now in the separate [H2 actions and leave record](2026-10-31-foxy-architect-actions-h2.md). This supersedes preliminary facade shapes above only where specified; it does not claim that H2 or browser/navigation QA passed. Pages Router Back/history reconciliation is a separate verified cut; beforeunload alone does not cover SPA Back. This architect corrected two accidental zero-width characters in this own document and reconciled first-target ownership. Production and tests remain untouched by this architect.
