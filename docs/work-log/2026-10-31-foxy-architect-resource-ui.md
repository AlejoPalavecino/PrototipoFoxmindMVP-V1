# Foxy editable resource and publication UI — architecture contract

- Agent / role: /root/foxy_architect / architect
- Session or task ID: /root/foxy_architect (resource/publication frontend design)
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 0c44eac; later 0275d3a observed during concurrent work
- Phase: Foxy text resource editor, preparation, preview and explicit Library confirmation
- Status: completed (design only; no behavioral tests or visual QA performed here)

## Scope and inspected evidence

Design only, writing this record and preserving other agents' work. Inspected existing Foxy screen/session/workspace/chat controller/client and selected tests, real resource/publication domain/API candidates and proxy, classroom detail/Library/Dialog components, shared visual controls/tokens, classroom navigation and the ego-browser skill entry. Preview/list candidates were in review; existence is not acceptance evidence. No images/diagrams controls or simulated operations are introduced by this text slice. No production changes, retained data, secrets, DB or provider calls.

## Client first, UI-A

Add the actual six-field resource response type to the shared domain contract: {id,conversationId,sourceTurnId,title,markdown,revision}. Reuse E3 publication response types and current request parsers.

WebFoxyClient methods: resourceFromTurn(conversationId,turnId,signal); getResource(resourceId,signal); editResource(resourceId,EditFoxyResource,signal); preparePublication(resourceId,PrepareFoxyPublication,signal); listPublications(resourceId,{limit,afterId},signal); inspectPublication(publicationId,signal); confirmPublication(publicationId,ConfirmFoxyPublication,signal); publicationFileUrl(publicationId,mode='download'). The first seven use the existing exact JSON routes and safe transport; URL builder allows only UUID and preview/download and returns a literal same-origin API path.

Keep fresh CSRF for every write including resourceFromTurn, actual same-origin credentials, no-store, combined abort/deadline and existing identity notification. Capture/serialize the body before awaiting CSRF; subsequent caller mutations must not change UUID, CAS, title or content. Do not convert decimal revisions to Number or automatically retry POST/PATCH. Read history and resource actions remain available when textGeneration.enabled=false.

Client RED: exact methods/URLs/bodies; bigint string preservation; fresh CSRF and no CSRF for GET; mutation during deferred CSRF; abort; safe errors/identity; no automatic retry; safe file URL and invalid UUID/mode rejection. Current production client was 121 lines when inspected; split a cohesive resource client helper if the additions would exceed file limits, preserving one shared transport implementation.

## Initial controller, R1 — immediate RED contract

Create a separate foxy-resource-controller.ts; do not expand the chat controller with resource mutation state.

```ts
createFoxyResourceController({
  client: Pick<WebFoxyClient, 'resourceFromTurn' | 'getResource' | 'editResource'>,
  onChange,
  uuid?,
}) -> {
  getState();
  open(conversationId, turnId): Promise<'opened' | 'blocked' | 'failed'>;
  updateDraft({ title, markdown });
  save(): Promise<'saved' | 'invalid' | 'conflict' | 'uncertain'>;
  retry(): Promise<'saved' | 'invalid' | 'conflict' | 'uncertain'>;
  refreshConflict(): Promise<void>;
  resolveConflict(choice: 'keep-local' | 'use-server'): boolean;
  close(): boolean;
  discardAndClose();
  dispose();
}
```

Public state: {status:'closed'|'loading'|'editing'|'unavailable', resource:FoxyResource|null, draft:{title,markdown}|null, dirty:boolean, busy:boolean, pending:'SAVE'|null, conflict:FoxyResource|null, errorCode:string|null, error:string|null}. Exact request UUID/body remain in a private immutable intent, not exposed in state. The initial controller does not yet include publication, destination loading or polling.

open calls resourceFromTurn and uses its existing edited resource response, never reseeds from turn.answer. It validates the returned conversation/source identity, then sets persisted resource and editable draft separately. An active draft/pending save blocks replacing the editor; otherwise a new open aborts the prior load and increments an epoch. Every async result checks epoch, resource identity and abort; late results cannot populate another resource. Only a READY-turn teacher action opens the editor, not automatic creation for all rendered answers.

save without dirty returns saved without a request. Validate nonblank title/markdown, title <=200 and markdown <=50000 Unicode code points and existing prohibited controls, without trimming/replacing the user's text or truncation. parseEditFoxyResource alone does not currently impose markdown's repository maximum, so add that explicit UI preflight. Do not use UTF-16 maxLength as the sole Unicode cap. Invalid content stays editable and causes no network call.

First save captures resource ID, UUID, exact base revision and draft text. Concurrent save calls share one in-flight promise; a new save while a prior result is uncertain returns uncertain without creating another intent. ACK updates persisted resource/base revision, but replaces/clears draft only if draft is still exactly the submitted text. Typing while save is in flight must survive the ACK. Do not replace a known newer persisted revision with an older replay receipt; dirty is always derived against the preserved persisted base.

INVALID_INPUT is definitive: keep draft, clear intent, show correction. CONFLICT is definitive: keep draft, clear intent, set a private conflict latch and load the latest server resource into conflict, not into the editor. While latched, save returns conflict without a network call, even if that reload failed and conflict is still null. refreshConflict retries getResource using the same epoch/signal; it changes only the conflict snapshot, never draft or persisted base. A failed reload preserves the draft and latch; access loss closes private content.

resolveConflict('keep-local') requires a loaded conflict and no active/pending mutation: adopt conflict as the persisted base/revision, retain the EXACT current draft, clear the conflict snapshot/latch and recompute dirty. It performs no request. The next explicit save uses a newly generated UUID and the adopted revision. resolveConflict('use-server') explicitly discards local draft: adopt conflict into both persisted resource and draft, clear conflict/latch, dirty=false and perform no write. Return false without changes when busy, pending or no loaded conflict. UI labels are 'Conservar mis cambios' (followed by explicit Guardar) and 'Usar versión guardada', with the server version available for comparison. If another tab changes again, the next CAS can conflict again; never force or auto-merge an overwrite.

Transport/timeout/503 uncertainty preserves exact private intent and current draft. retry dispatches the identical intent/UUID/base/content, even if local text changed meanwhile; it never reconstructs payload from new state. close returns false for dirty or pending and otherwise aborts/clears and returns true. discardAndClose explicitly drops local changes and aborts/invalidates; it does not claim to undo a server mutation that may already have committed. dispose immediately clears private state and aborts; no late callback can restore it.

Actual AUTH_REQUIRED/EMAIL_VERIFICATION_REQUIRED use identity teardown; NOT_FOUND/FORBIDDEN clear the unavailable resource. Explicit CSRF_INVALID/ORIGIN_NOT_ALLOWED are definitive pre-mutation rejections: retain draft, release intent and show a safe correction/retry message; do not label them committed. Rate limiting may retain the exact intent for manual retry but never starts an automatic loop.

R1 RED: recover existing edits; late open ignored; failed load; Unicode/control limits retained locally; no-op save; double save one call; typing during ACK; exact retry after uncertain save; 409 draft/conflict separation; failed conflict reload still blocks save; refreshConflict preserves draft/base; keep-local adopts latest revision then saves unchanged local draft with a NEW UUID; use-server sends no write; another concurrent update conflicts again; blocked close/open; explicit discard; dispose/identity abort and no late updates. No publication/client destination dependencies in this first unit.

## Publication controller extension, R2

After R1, extend the controller through focused helper modules under 200 lines. Add a real loadClassroom(id,signal):Promise<Detail> port backed by createWebClassroomClient.call('/'+id,'GET',undefined,signal), and timer injection. State adds destination detail and metadata draft, publication items/nextAfterId/loading, selected inspection, confirmation review and a private typed pending intent SAVE/PREPARE/CONFIRM. Keep one resource mutation in flight; GET lanes can remain independent with their own epoch/abort.

Commands: selectDestination(id), updateMetadata({title,unitId,topicId}), prepare(), loadMorePublications(), selectPublication(id), refreshPublication(), reviewPublication(), setReviewed(boolean), confirm(), retry(). Input/draft changes invalidate the current confirmation review. Changing selected publication cancels its old polling lane but does not discard resource text.

Use the actual teacher classroom list from session for choices and real destination detail for units/topics/revision. General-context resources require choosing an owned active classroom. Classroom-context resources may default to their current owned active classroom; do not invent/default a current topic from NEXT. Allow any destination supported by the backend's owner/source checks. On destination change clear unit/topic; on unit change clear topic. Null unit/topic means extra material. Missing IDs or failed detail are unavailable, never fabricated index IDs or sample plan rows. Archived history remains inspectable; new publication destination must be active.

Open/reopen loads the saved resource and the first publication page. Load more serially using nextAfterId and exact server order, dedupe IDs and preserve higher publication revisions when merging stale list snapshots. Do not assume an empty/short page means end if the server cursor is present. Selecting a history item fetches its inspection; selecting a saved resource restores actual existing preparations rather than POSTing new intentions.

prepare requires a clean saved resource, no unresolved mutation and valid actual destination/metadata. Capture one UUID, resource revision and metadata before sending. HTTP acceptance selects the returned publication, updates the history list and begins status inspection; it does not publish. Metadata on an accepted preparation is frozen. A subsequent change requires an explicit new preparation, preserving prior history.

Poll only the selected PREPARING item, serial setTimeout at 2 seconds, scheduling after completion and never overlapping requests. Abort and ignore stale results on new selection/resource/conversation/account or dispose. Stop at READY/FAILED/PUBLISHED. Poll failure stops and offers an explicit refresh; do not turn an unavailable status into a fabricated completion. If a known current resource revision differs from the preparation's pinned revision, mark the view as an older version and stop polling/confirming that stale preparation; do not mutate its DB state. Loading resource data, not guesswork, determines that mismatch.

Uncertain PREPARE/CONFIRM retains the original private intent and uses retry unchanged. List matching by title/classroom is not proof that a particular uncertain UUID succeeded. A browser reload can rediscover actual jobs but cannot reconstruct a lost request key; never automatically make a replacement POST. SAVE/PREPARE/CONFIRM retries bypass fresh local eligibility reconstruction and let server replay/auth checks decide the recorded intent.

reviewPublication performs only reads: refresh inspection, current saved resource and destination detail, under epoch/abort. Require clean editor, READY, pinned resource revision matching current saved revision, active teacher-owned destination and current association. If detail and inspection report different classroom revisions, show changed data and require another review; do not spin or POST. Freeze publication ID, both CAS revisions and displayed destination/title/unit/topic in a review object with reviewed=false.

The user checks 'Revisé el recurso y quiero compartirlo con los estudiantes' and clicks the final action. confirm captures one UUID with the frozen publicationRevision/classroomRevision and confirm:true. Disable editing/destination changes while confirmation is pending. A changed selection/draft invalidates the review. An accepted four-field receipt is the original commit result; do not lower a newer fetched classroom revision to the receipt's historical value.

For 409, keep content, clear definitive failed intent and review, refresh actual state and require a new explicit confirmation if adopting new CAS; use a new UUID. For 503/timeout, keep review and exact pending confirmation; manual retry recovers the same receipt even if current inspection is already PUBLISHED. Do not clear that intent based only on a GET or fabricate a material ID. A replay after deletion may return NOT_FOUND; disable links and explain that the material is unavailable, never resurrect or automatically prepare/publish another. Missing/forbidden resources clear the editor's private state; identity failures use the shared session teardown.

R2 RED: real destination hierarchy/reset behavior; prepare requires saved/clean state; fixed intent despite local edits; complete list/cursor recovery; selection/poll race and no overlap; old-version detection; READY review reads without POST; checkbox/CAS frozen; one confirm for double clicks; retry after committed-but-lost receipt; conflict refresh without auto-write; archive/deletion/revocation; generation disabled; dispose clears all timers/private content. Tests use deferred promises and fake timers, no provider.

## UI composition and visual contract, R3

Session creates one shared WebFoxyClient and separate chat/resource controllers after the existing teacher gate. Its identity callback disposes both, aborts classroom requests, clears both states and requests identity once; cleanup is idempotent. Do not gate editor/history/publication on textGeneration.enabled or original classroom canGenerate: a still-authorized saved resource can be edited/shared with text AI unavailable.

Add 'Editar recurso' to READY text answers. Keep the immutable original answer in chat. Use one existing Dialog for the resource workspace, with separate components for editor, destination/preparation form, publication history/status and final confirmation section. Confirmation is inline in that same dialog; do not nest shared Dialogs with duplicate title IDs. Dialog focus uses the existing openDialog helper and returns to the origin action on close.

Suggested files: foxy-resource-workspace.tsx for orchestration, foxy-resource-editor.tsx, foxy-publication-panel.tsx and cohesive controller helpers. Only the UI owner edits workspace/session integration; client and controller ownership remain separate. Do not rewrite the chat controller or classroom Library during this cut. Reuse Notice, Dialog, existing p5 actions/primary, folder-panel and --fm-* surface/border/radius/spacing tokens. No new marketing art, gradients or image-generation controls. A scoped stylesheet is only needed for responsive editor/metadata layout; import once through _app and avoid global selectors.

Desktop dialog may use two columns for editing and destination/history; mobile stacks in reading order with min-width:0, full-width text fields and wrapping titles. Keep primary actions visible in normal flow, no nested horizontal scrolling or fixed footer covering the textarea. Use labeled textarea/input, code-point counters and aria-invalid/describedby for field errors. Do not put the full editor in a live region; announce concise save/preparation/publication updates through Notice/status. Use keyboard-accessible native controls, clear loading/error/empty/retry states and disabled reasons visible as text.

Labels and behavior: 'Guardar cambios' acknowledges only server success; 'Cambios sin guardar' remains while dirty; 'Preparar PDF' creates private work; PREPARING says 'Preparando archivo. Todavía no es visible para estudiantes'; READY says 'PDF listo para revisar'; FAILED says the saved resource is retained, using the actual safe reason; successful confirm says 'Publicado en la Biblioteca de [aula]'. Do not show invented percentages or scanning stages: public state does not contain them.

Preview follows the actual existing Library UX: use the literal publicationFileUrl for 'Abrir vista previa PDF' and 'Descargar PDF', only READY/live PUBLISHED, new tab with noopener/noreferrer. The server reauthorizes and validates on each request. Do not render model HTML, assume a link click proves review, or mark a PDF reviewed from iframe load. Teacher confirmation is the explicit checkbox/action. A failed viewer can use download; refresh inspection on returning to review. The first flow needs no custom binary client, Blob URL lifecycle or embedded PDF viewer.

Use the actual existing /mis-aulas?aula=<uuid> destination for a success CTA labeled 'Abrir aula', explaining the material is in Biblioteca. That route currently opens the aula/Plan, not a Library deep link. Do not invent ?tab=library or label the link as a direct Library jump. A later small HomeTarget navigation adapter may offer direct material focus after it is implemented and tested; current end-to-end QA explicitly selects Biblioteca.

Guard switching resource/conversation, closing and internal page navigation while dirty or a mutation result is uncertain. Reuse close() false to present explicit save/discard/stay choices. Add a browser beforeunload warning for unsaved/uncertain work; it is a warning, not a guarantee of refresh recovery. Internal app links/router navigation must use the same leave guard, while PDF target=_blank/download and account-expiry teardown bypass it appropriately. Do not persist private draft text in localStorage/sessionStorage or claim unsaved changes survive a reload. Saved text and preparation history recover from the backend. Discarding local state does not cancel an already committed server mutation.

## QA and completion evidence, R4

Component/hook RED follows the existing componentWithPorts/hookView patterns: READY action, server-owned edits, controlled fields and validation, save states, real destination/association choices, dirty/uncertain guards, status/error/history controls, preview URLs, explicit checkbox, no auto-confirm, receipt and archive/deleted handling. Verify malicious model strings remain escaped and executable HTML/links are never generated. Student gate constructs neither Foxy resource client nor controllers; identity expiry during open/save/poll/confirm clears everything and ignores late work.

After TSX implementation, apply the project's React review checklist and native review. Test_runner runs live UI in an ego(lite) dedicated task Space, using its installed skill/guide, with actual scoped synthetic teacher/student sessions and a fixture containing a READY answer. Provider stays disabled; exercise actual API/resource editor/render/P4/publication flow with its documented synthetic storage/scanner ports rather than claim real S3/ClamAV/provider evidence.

QA at 320/390/768/1440px, keyboard-only dialog/tab/focus restoration, zoom 200%, long Unicode and long words, reduced motion and failed loads. Prove: edit/save survives reopen; dirty text survives failed save/conflict; preparation survives reload via list; PDF link opens actual generated bytes; double click/manual replay creates one material; final confirmation makes material visible to the synthetic student in aula Biblioteca; previous private stages are invisible to the student. Cover expired session, archive, plan association change and deleted material with no resurrection. Capture actual states/screenshots; do not infer behavior from static markup or seeded PUBLISHED rows alone.

## Verification and handoff

Only source/document inspection and git status/rev-parse performed. Initial broad reads had some nonexistent paths/truncated output and Windows rg wildcard errors; concrete follow-up reads located real sources. No production file edits, test runs, database, browser, retained configuration or providers by this architect. Functional and visual evidence above remains prescribed, not observed.

Own record content/link validation exited 0: no trailing whitespace and all three relative Markdown links exist. Functional tests were unnecessary for this design-only change and remain the explicitly assigned RED/verification work.

UI-A client contract and R1 controller API/state/RED were sent to /root before this broader record completed. First next task is R1 RED/implementation, then R2 helper contracts and R3 composition with disjoint ownership; backend preview/list review must close before claiming those UI journeys. No commit by this agent. Shared roadmap remains coordinator-owned. See [service/HTTP contract](2026-10-31-foxy-architect-publication-http.md), [confirmation contract](2026-10-31-foxy-architect-publication-confirmation.md) and [feature authorization](../../odd/tasks/foxy-ai-proposal.md).
