# Foxy R2C — explicit publication confirmation companion

- Agent / role: /root/foxy_architect / architect
- Session or task ID: /root/foxy_architect (R2C confirmation contract)
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: a8c13e8; clean status observed at first inspection
- Phase: Foxy text resource frontend R2C
- Status: completed (design only; no behavioral verification by this architect)

## Scope and inspected evidence

Inspected actual R1, R2A, R2B getters/ports, current WebFoxyClient/domain DTOs, backend confirmation/replay semantics, real Detail/classroom-client route and prior broad UI contract. R2B actually exposes inspectionLoading/inspectionError and R2A.result is a summary; this contract uses those real shapes. Only this record was written. No production/test edits, retained DB/data, secrets, browser or provider work.

## Decision and exact API

Create a companion createFoxyPublicationConfirmationController. Existing controllers are read-only inputs; this slice does not patch them or orchestrate their mutations. Reuse the actual CSRF-aware WebFoxyClient and existing E2 confirmation request/result.

```ts
createFoxyPublicationConfirmationController({
  client: Pick<WebFoxyClient, 'getResource' | 'inspectPublication' | 'confirmPublication'>,
  resource: Pick<ReturnType<typeof createFoxyResourceController>, 'getState'>,
  preparation: Pick<ReturnType<typeof createFoxyPreparationController>, 'getState'>,
  history: Pick<ReturnType<typeof createFoxyPublicationHistoryController>, 'getState'>,
  loadClassroom: (id: string, signal: AbortSignal) => Promise<Detail>,
  onChange: (state: ConfirmationState) => void,
  uuid?: () => string,
}) -> {
  getState(): ConfirmationState;
  syncContext(): void;
  review(): Promise<'ready' | 'blocked' | 'changed' | 'unavailable' | 'failed'>;
  setReviewed(value: boolean): void;
  confirm(): Promise<'published' | 'blocked' | 'conflict' | 'invalid' | 'uncertain' | 'unavailable'>;
  retry(): Promise<'published' | 'blocked' | 'conflict' | 'invalid' | 'uncertain' | 'unavailable'>;
  reset(): boolean;
  dispose(): void;
}
```

```ts
type Review = {
  publication: FoxyPublicationSummary;
  classroomName: string;
  unitName: string | null;
  topicName: string | null;
  publicationRevision: string;
  classroomRevision: string;
};
type ConfirmationState = {
  review: Review | null;
  reviewed: boolean;
  reviewing: boolean;
  busy: boolean;
  pending: 'CONFIRM' | null;
  canReview: boolean;
  canConfirm: boolean;
  receipt: FoxyPublicationConfirmation | null;
  errorCode: string | null;
  error: string | null;
};
```

Initial state has null/false values and no network. getState/onChange are defensive snapshots. The request UUID, captured body and resource/publication context are private. busy means an actual confirmation POST; reviewing means the GET review batch; pending remains CONFIRM after uncertainty. No timer, automatic POST, prepare, save, renderer or file upload is available through these ports.

## Candidate and context lifetime

New review requires R1 status editing, an actual resource, clean draft, !busy, no SAVE pending, no conflict snapshot and errorCode != CONFLICT even when dirty=false/conflict=null. R2A must have no prepare busy/pending. R2B must have the selected ID matching a READY inspection of this resource, !inspectionLoading, no inspectionError and !staleResource. A list pagination error alone does not invalidate a valid selected inspection.

If a matching item in R2B.items or R2A.result already knows a greater revision or PUBLISHED state than the READY inspection, block new review until its status is refreshed. Do not use stale READY merely because its detail panel is still present. New review is also blocked after this controller has accepted a receipt for the same current publication, preventing another new confirmation intent before history catches up.

Composition forwards R1/R2A/R2B changes through syncContext. Read the getters again at every public action and before applying async responses; correctness must not depend solely on a forgotten notification. Track resource identity, selected publication identity, saved resource revision, R1 dirty/conflict/mutation state and preparation form metadata/selection. Actual changes to draft, resource revision, selected publication or preparation metadata invalidate an unchecked/checked review and its old CAS; do not silently update a checked snapshot. A transient history read may temporarily block final action; newer contradictory/revision data invalidates the snapshot.

During a pending confirmation, preserve its original intent/review despite same-resource revision changes, later destination archive or current publication PUBLISHED. This is required to replay a lost successful response. Forced different resource/selected publication, editor close or dispose aborts/increments epoch and clears old private confirmation state; R3 must guard such navigation while uncertain. AUTH/verification loss latches unavailable until fresh composition so stale getters cannot restore it. No callback may revive a disposed context.

## Review is reads only

review captures the current candidate IDs/semantic context and uses one AbortSignal for three independent reads: client.getResource(resourceId), client.inspectPublication(publicationId), and loadClassroom(selectedPublication.classroomId). Use the destination stored in the selected historical publication, not the current R2A form destination. A teacher may inspect an older preparation targeting a different owned aula; its actual destination must be explicit in the final summary.

The real loader is createWebClassroomClient(...).call<Detail>('/'+id,'GET',undefined,signal), resulting in GET /api/v1/classrooms/:id. Reuse Detail from classrooms-ui/api.ts. Do not build a fake unit/topic catalogue or use the conversation source curriculum for another destination.

Require all responses and current getters still describe the same resource/publication context. Fresh resource ID/conversation/source-turn must match R1; its revision must equal R1's current saved revision and the publication's pinned resourceRevision. Fresh publication must be READY, immutable metadata must agree with the candidate, and its revision cannot be lower than known R2B/R2A observations. The destination ID must match, role=teacher, archived=false; inspection.classroomArchived must also be false. Validate actual unit/topic IDs and correct hierarchy without changing associations. Deleted/moved associations require a changed/unavailable result, not conversion to extra material.

Inspection and Detail must report the SAME canonical int64 classroom revision, not lower than already known selected-classroom observations. Both publication/classroom revisions must be incrementable (<9223372036854775807). Different read snapshots produce changed with no review staged; require another explicit review, never spin or choose whichever revision is convenient. Use BigInt, never Number. Metadata/body mismatches or malformed responses are failed/SERVICE_UNAVAILABLE; genuine newer/stale states are changed/CONFLICT.

On success freeze the exact publication and its title, actual classroom name, actual matching unit/topic names or null, publicationRevision and classroomRevision; reviewed=false. Do not create a request UUID or send POST. Parallel reads do not form a DB transaction; final CAS remains authoritative. Newer history observations that exceed this frozen snapshot invalidate it. A history observation merely catching up to the same already-reviewed revisions must not downgrade or rewrite the snapshot or silently recheck the checkbox.

Concurrent review calls share one active batch. Context changes abort/ignore its late results. A read failure never silently reuses an earlier checked review: clear the stage/check and show a safe message. The teacher must explicitly review again. No controller may mark a link click, iframe event or GET success as human review.

## Checkbox and final write

setReviewed(true) is effective only for a current valid frozen review with no read/write/pending operation; false unchecks it. The visible label must explicitly say the teacher reviewed the resource and wants to share it with students. canConfirm additionally requires the same clean/stable candidate, no unresolved R1/R2A mutation/conflict and no accepted receipt of this same publication. Checking does not send a request.

First confirm captures one private UUID and exactly {requestId,publicationRevision,classroomRevision,confirm:true}, targeted at the reviewed publication ID, before any await/CSRF. Validate using parseConfirmFoxyPublication. There are no caller material/file IDs, title, destination override or proof fields. Concurrent confirm calls share one promise and one POST. A new confirm call while a previous response is uncertain returns uncertain without another UUID or request; only explicit retry sends the recorded attempt.

On success validate receipt publicationId equals the captured publication, materialId is a UUID, and canonical result publication/classroom revisions each equal the original requested revision plus1. This remains true for a replay even if current classroom revision is much newer. Expose only the four accepted receipt fields. Keep the frozen review as a description of the reviewed version if useful, but do not rewrite its READY snapshot into a synthetic PUBLISHED inspection; the receipt is the commit evidence and R2B refresh supplies current status. Clear pending/busy and disable repeated new confirmation for that accepted publication. Never mutate/reduce a sibling controller's newer classroom revision to this historical receipt.

R3 may refresh R2B selection/list once after a new receipt, through composition, without POST or inferring a material ID from list state. No background metadata response can clear a pending confirmation UUID simply because it now sees PUBLISHED: only the actual matching response/replay resolves that intent. No success is fabricated from generic getters.

## Uncertain retry and failures

503, timeout, transport failure or malformed200 after possible commit retains the exact intent and frozen review/check; return uncertain with pending=CONFIRM and disable new inputs/mutations. retry sends the original publication ID/UUID/body with fresh CSRF through the same client, without review GETs, current CAS substitution or new UUID. It is allowed for the same resource/publication even if R1's revision changed, destination is now archived or inspection is PUBLISHED. Server replay reauthorizes and decides; client must not block legitimate recovery by reapplying new-operation preconditions.

400/INVALID_INPUT and CSRF_INVALID/ORIGIN_NOT_ALLOWED are definitive rejections: clear intent/stage/check and retain the underlying resource text in R1; return invalid. 409/CONFLICT likewise clears intent/review/check, returns conflict and requires explicit fresh review plus checkbox before a NEW UUID/CAS attempt. Do not auto-review, auto-save R1, adopt new revisions or POST again. R3 can refresh the read-only history to explain the change. Rate limiting may retain the exact intent for later manual retry, never an automatic loop. Unexpected error codes/messages are sanitized.

AUTH_REQUIRED/EMAIL_VERIFICATION_REQUIRED during any review read or confirmation aborts/clears all own private review/receipt/intent, latches identity loss and returns unavailable. The real shared clients notify the common identity callback; R3 must dispose all controllers and clear rendered private content once, bypassing unsaved-navigation prompts. This companion itself has only read-only sibling ports and does not erase them.

FORBIDDEN/NOT_FOUND can mean a lost destination, unavailable publication, deleted material on replay or lost resource. Clear own intent/review/check/receipt, stop its requests and return unavailable; do not blindly destroy R1/R2A/R2B or prepare a replacement. R3 may verify resource access to distinguish a whole-source revocation before closing the editor. A matching replay after material/blob deletion legitimately returns NOT_FOUND and must never resurrect or republish. Generic unavailable UI hides obsolete action links for this selected attempt; server still authorizes any independent preview link.

reset returns false while a confirmation is busy/pending. Otherwise cancel the review batch, increment epoch and clear own review/check/receipt/errors without touching siblings or undoing any published material. dispose always clears and aborts, makes later methods no-ops and suppresses late callbacks. No localStorage/sessionStorage persistence of prompts/review/intent is added. Page reload recovers actual publication history; it cannot fabricate a lost UUID or receipt.

## RED and work partition

test_runner owns new foxy-publication-confirmation-controller.test.mjs and focused review-helper tests if needed. Worker owns only new foxy-publication-confirmation-controller.ts and cohesive context/review-validation helper(s), each below200 lines. Do not edit R1/R2A/R2B/client/TSX. First cut may be R2C1 read review/context/checkbox, followed by R2C2 write/retry/receipt/errors; both must pass before UI wiring or claiming the whole contract. No production provider or DB is required for these deferred-client tests.

RED criteria:

1. Constructor/sync/checkbox send no write. Ready review sends only the three expected GET/loader calls, same AbortSignal, destination from selected publication (even when R2A form points elsewhere), frozen actual names/CAS, unchecked.
2. R1 dirty/busy/SAVE/conflict or errorCONFLICT with conflict=null, R2A busy/PREPARE, nonREADY/stale/loading/error history or newer known PUBLISHED summary block. A pagination-only error does not invalidate selected ready data.
3. ID/context mismatch, resource revision change, archived/student destination, missing/moved unit/topic, mismatched classroom read revisions, lower known revisions and non-incrementable bigint block staging with no POST/UUID. A 19-digit valid int64 remains exact.
4. Dirty/metadata/selection/resource changes during gated reads abort/ignore results. Checked review invalidates on substantive changes; a history read catching up to its same frozen revisions cannot rewrite it or auto-check.
5. Unchecked confirm sends nothing. Double confirm shares one promise/UUID and exact E2 body; no extra metadata/proof/destination fields. Observer/client argument mutation cannot change retry.
6. A 200 result validates bound publication/material IDs and exact +1 revisions, including int64 boundary and historical replay. Unknown extra receipt fields never enter state. A malformed 200 is uncertain and retains the original intent.
7. Lost-response503 plus same-publication PUBLISHED/archived/newer saved revision still retries identical UUID/body without GET. It does not reapply clean/READY preconditions or downgrade sibling observations. No second new intent while pending; retry after accepted receipt sends nothing.
8. A 409 or 400 clears pending/check/stage, preserves R1 text and emits no automatic reads/writes; a new successful explicit review/check uses a fresh UUID. Newer association/version requires a new preparation, never silent reassociation.
9. Auth/verification from each read phase and POST clears/latches own state and stale getter sync cannot resurrect it. Object403/404 does not call mutating sibling methods or auto-create a resource/material. Deleted replay produces no publication success.
10. Reset guards an uncertain intent; forced context switch/dispose cancels and late receipt/review cannot populate another selection. Existing R1/R2A/R2B tests remain unchanged; later R3 proves joint teardown, UI disabled states and student visibility.

## Verification and handoff

Read-only source/document/Git inspection; no functional tests, DB, browser or provider execution. No production code changed. Initial API/state and RED cases were sent to /root before closing this record. Coordinator owns shared roadmap and eventual commits.

Own document content/link check exited 0: no trailing whitespace and all three relative Markdown links exist. Functional tests were unnecessary for the design-only change; the cases above are prescribed RED/verification, not results observed here.

First next action: test_runner writes the R2C1 review/checkbox tests, then the R2C2 request/retry cases; worker implements new disjoint modules. This refines the [broad resource UI contract](2026-10-31-foxy-architect-resource-ui.md) and consumes [R2B history](2026-10-31-foxy-architect-history-r2b.md) plus [backend confirmation](2026-10-31-foxy-architect-publication-confirmation.md) without modifying them.
