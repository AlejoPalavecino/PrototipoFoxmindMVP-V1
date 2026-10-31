# Foxy R2A — destination, metadata and private preparation

- Agent / role: /root/foxy_architect / architect
- Session or task ID: /root/foxy_architect (R2A contract)
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 0275d3a; later 470bee5 observed during concurrent work
- Phase: Foxy text resource frontend R2A
- Status: completed (design only; RED/GREEN not executed here)

## Scope and evidence

Define the first small preparation cut without editing R1 under review. Inspected actual R1 controller/client and selected tests, resource/publication contracts and P1 repository, classroom API Detail and actual client route, session composition and prior broad UI design. Only this record was written. No production changes, retained DB/data, secrets, browser or provider calls.

## Decision and ownership

Create a companion createFoxyPreparationController rather than extending or patching createFoxyResourceController. R1 keeps its exact dependency/API/state surface and independent review. This supersedes the broad R2 description's suggestion of directly extending R1 for this first executable unit. R2A covers actual destination loading, metadata selection and one idempotent prepare POST only. History/list, polling, preview, confirmation, UI and runtime/session composition are later cuts.

test_runner owns a new foxy-preparation-controller.test.mjs and its RED evidence. slice_worker owns only new foxy-preparation-controller.ts and, if needed to keep files below 200 lines, one new pure state/validation helper. Neither edits R1, its tests, shared client or TSX. Coordinator/reviewer owns acceptance and later composition; no migration or backend change is required. API below and test cases were sent to /root while this record was prepared.

## Exact API

```ts
createFoxyPreparationController({
  client: Pick<WebFoxyClient, 'preparePublication'>,
  resource: Pick<ReturnType<typeof createFoxyResourceController>, 'getState'>,
  loadClassroom: (id: string, signal: AbortSignal) => Promise<Detail>,
  onChange: (state: PreparationState) => void,
  uuid?: () => string,
}) -> {
  getState(): PreparationState;
  syncResource(): void;
  selectDestination(id: string): Promise<'selected' | 'blocked' | 'unavailable' | 'invalid'>;
  setTitle(value: string): void;
  selectUnit(id: string | null): boolean;
  selectTopic(id: string | null): boolean;
  prepare(): Promise<'accepted' | 'blocked' | 'invalid' | 'conflict' | 'uncertain' | 'unavailable'>;
  retry(): Promise<'accepted' | 'blocked' | 'invalid' | 'conflict' | 'uncertain' | 'unavailable'>;
  reset(): boolean;
  dispose(): void;
}
```

```ts
type PreparationState = {
  resourceId: string | null;
  destination: Detail | null;
  loadingDestination: boolean;
  metadata: { title: string; unitId: string | null; topicId: string | null };
  busy: boolean;
  pending: 'PREPARE' | null;
  canPrepare: boolean;
  result: { created: boolean; publication: FoxyPublicationSummary } | null;
  errorCode: string | null;
  error: string | null;
};
```

busy means prepare POST in flight, not durable job progress. pending remains PREPARE after an uncertain response. getState and onChange provide defensive copies, including nested destination units/topics/plans and result. The immutable request UUID/body are private and not included in state. No timer or background network work is created by the constructor.

## Real destination port

Reuse Detail from apps/classrooms-ui/api.ts; no copied backend schema or invented destination catalogue. Detail extends Classroom: id, name, subject, division, academicYear:number, timezone, coverKey, archived:boolean, teacher:string, role:'teacher'|'student', revision:string. It adds units:Unit[], plans:{id,fileId,version:number}[] and optional aiGradingEnabled/aiGradingAvailable. Unit is {id?:string,name:string,topics:Topic[]}; Topic is {id?:string,name:string,status?:string}.

Production composition will supply loadClassroom(id,signal) using createWebClassroomClient(fetch,identityCallback).call<Detail>('/'+id,'GET',undefined,signal). The actual resulting URL is GET /api/v1/classrooms/:id: createClassroomClient prefixes /classrooms and createWebClassroomClient sets /api/v1. This is not the Foxy conversation curriculum endpoint, which only represents the conversation's original classroom.

Use a complete synthetic Detail fixture in tests: a real UUID id, name/subject 'Biología', division 'A', academicYear 2026, timezone 'America/Argentina/Buenos_Aires', coverKey 'biology', archived false, teacher 'Docente sintético', role teacher, revision '1000000000000000000', a UUID unit with one UUID topic/PENDING and plans:[].

Validate returned id matches the requested UUID, role is teacher and archived is false. Names/arrays must be usable, revision a canonical int64 decimal, and units/topics used as choices must have actual UUIDs, no duplicates or cross-unit duplicate topic identities. Missing/invalid IDs make the destination unavailable; do not substitute indexes or sample values. Preserve actual order/names. Status NEXT does not mean a current topic and never triggers automatic association.

## Binding and metadata rules

Composition calls syncResource whenever R1's state changes; R1 never imports or calls R2. New resource ID, closed/unavailable R1 or identity teardown aborts/increments the preparation epoch and clears destination, metadata, pending/result and old private intent. A valid editing resource seeds title from the SAVED resource.title, not the unsaved draft. A later force-reset does not claim to undo a possibly committed POST; backend list recovery belongs to the later cut.

For the same resource ID, revision changes do not rewrite a pending intent or lose chosen associations/custom title. Track whether title was explicitly edited; only an untouched form with no pending request or accepted result may follow a newer saved title. An accepted preparation's metadata stays frozen until an explicit reset/new form. canPrepare is computed against the latest R1 getState, so stale cached eligibility cannot dispatch a new operation.

New preparation requires R1 status editing, a current matching resource, !dirty, !busy, no SAVE pending, no conflict snapshot and no CONFLICT error/latch indication; R1's existing public errorCode covers its failed-conflict-reload case. Also require a loaded active teacher destination, no destination load, no prepare in flight/uncertain and valid metadata. Do not gate on text-generation capabilities or classroom AI settings.

selectDestination validates its argument before network, is blocked by a prepare pending/in flight and by unavailable R1. During a new load it clears old destination/unit/topic immediately and preserves the form title. A second destination load aborts the first and uses a separate selection epoch; late/noncooperative A cannot replace B or clear B's loading state. The load captures the current resource ID and rejects results for a changed/closed resource. A superseded/disposed call resolves blocked without emitting an error into the newer state.

Only real known units/topics may be selected. selectUnit changes unit and clears topic when the unit actually changes; null clears both. selectTopic requires null or a topic belonging to the selected unit; unknown/foreign choices return false without mutation. setTitle preserves the typed string, including invalid text for correction, but is ignored while prepare is active/uncertain. Metadata selectors are also blocked then. Validate title nonblank and <=200 Unicode code points and no C0/C1 controls, consistent with Library's display-title rule; never silently truncate. Unit/topic must match the loaded hierarchy and nullable constraints. Build the final request with the existing parsePrepareFoxyPublication and exact int64 resource revision.

## Prepare, replay and failures

First eligible prepare captures resourceId, a new UUID and the exact saved resourceRevision/classroomId/title/unitId/topicId before awaiting anything. Store a private copy and pass another copy to the client, preventing a fake/mutating client or state consumer from altering retry data. Concurrent prepare calls return the same in-flight promise and cause one POST. prepare with an unresolved uncertain intent returns uncertain without a new UUID/call. retry with no intent returns blocked; retry during a call shares the active promise.

On acceptance, validate the response's resource/version/destination/metadata identities against the captured intent, known publication state and safe revision/UUID shape, then expose a defensive copy of {created,publication}; clear busy/pending. Matching replay can legitimately return READY, FAILED or PUBLISHED. Do not overwrite its real state with PREPARING, create a fake READY result or infer student visibility. There is no inspect/confirm/readFile/list call in R2A.

503, timeout, unknown transport or malformed success after possible server commit keeps the exact private intent and returns uncertain. Metadata changes remain blocked; retry uses the same UUID and payload even if the same resource's current revision or dirty state has changed. It must still belong to the current resource ID/session epoch. Destination archive since the first call does not locally block replay: P1 determines whether a matching request already exists or a new request is now denied.

400/INVALID_INPUT and 409/CONFLICT are definitive: clear pending/busy, keep the form and display the safe reason; do not auto-save/reload R1 or POST another request. A user may explicitly refresh a clean R1 by reopening its canonical conversation/turn; the next new preparation captures the actual updated revision with another UUID. CSRF/Origin rejection is likewise definitive and retains form content for correction. The companion never mutates R1 to fabricate a newer resource. Any foreign/missing R1 identity before retry or a forced resource close clears the old intent rather than dispatching it against a new resource.

AUTH_REQUIRED/EMAIL_VERIFICATION_REQUIRED from either loadClassroom or prepare abort/invalidate this controller and clear resourceId, destination, metadata, pending, private intent and result; canPrepare=false. Keep an auth-unavailable latch so syncResource cannot rebind the stale R1 after that error; a fresh session composition creates a fresh controller. The actual WebFoxyClient and classroom loader already invoke the shared identity callback. Disposing R1 and R2 together, clearing rendered content and proving that integration is mandatory R3 work before mounting this companion, not proof claimed by this isolated helper. Do not add a callback that blindly destroys R1 for every destination failure.

FORBIDDEN/NOT_FOUND from destination loading or preparation clears destination/associations/result/pending and disables preparation, but may preserve local display-title text and does not mutate R1: the error may mean only a lost destination, while the saved resource and unsaved draft are still authorized. R3 must verify resource access when the source of a prepare denial is ambiguous before discarding R1. Distinguish these object-level denials from actual authentication/verification failure; callback-based whole-session teardown is not justified merely by an inaccessible aula.

reset returns false if busy or pending. Otherwise abort destination work and reset to the current saved resource's clean initial form, with no destination/associations/result. dispose aborts both lanes, clears all private/public preparation state and suppresses later callbacks. There is no background retry, retention, browser persistence or automatic publication.

## RED cases

1. syncResource uses the actual saved title/id and emits no POST; unsaved draft is never copied as the prepared resource. Closing/changing R1 clears preparation and late work.
2. Real loadClassroom receives the exact UUID and AbortSignal; destination B aborts A and wins when A resolves late. Snapshots/client-returned arrays cannot mutate internal choices or requests.
3. Archived, student-role, wrong-id, malformed hierarchy and failed destination loads produce no prepare call or invented options. General context has no automatic destination.
4. Unit/topic/null transitions use only the loaded hierarchy; unit change clears topic and unknown/cross-unit IDs fail. No status-derived topic default.
5. Every R1 ineligible condition blocks prepare and generates no UUID/POST, including errorCode CONFLICT when conflict=null and dirty=false after a failed conflict reload plus reverting the draft to its old base. Reverting text does not resolve the unknown newer server revision/latch.
6. Invalid/blank/201-code-point/control title stays editable and sends nothing; a valid 200-code-point title is not rejected by UTF-16 length. Server validation still applies.
7. Exact UUID, metadata, nullable fields and a 19-digit int64 revision come from the saved resource. Double prepare shares one promise/call.
8. Definite acceptance/replay retains the actual response state and fields, including replay READY/PUBLISHED; no confirm/inspect/list/render/scanner/provider operation occurs.
9. Deferred 503 leaves pending, blocks metadata/destination/new preparation and retries with identical UUID/body. Same-resource revision changes do not rebuild that body. Mutation of getState/onChange copies or client argument cannot change retry.
10. 400/409 clear pending without writing/refreshing R1 or auto-requesting again; a subsequent explicit valid new request uses a fresh UUID. Bad success/foreign metadata remains uncertain rather than trusting a mismatched artifact.
11. reset guards uncertainty; resource ID change/dispose aborts and prevents late updates/private result resurrection. Retry does not dispatch an old intent against another resource. AUTH/EMAIL from either port clears this controller and stale R1 sync cannot resurrect it; destination FORBIDDEN/NOT_FOUND never mutates the read-only R1 port or loses its draft.

## Verification and handoff

Only Get-Content/rg and git status/rev-parse were used for inspection; broad initial output was truncated and followed by concrete source/type/route reads. No R1 or other production/test files edited. Tests and UI QA remain owned by their assigned agents, not observed PASS claims here. Shared roadmap and commits remain coordinator-owned.

Own document content/link check exited 0: no trailing whitespace and both relative Markdown links exist. Functional tests were unnecessary for the design-only change; the RED cases are prescribed execution, not results observed by this architect.

First exact action: test_runner writes the new R2A tests against this API before implementation; slice_worker implements only the companion/new helper. R1 review proceeds independently. Later composition forwards R1 state changes through syncResource and checks BOTH controllers' dirty/pending states before navigation. Later history/polling/review/confirm and TSX cuts follow the [broader UI contract](2026-10-31-foxy-architect-resource-ui.md), reusing the accepted [service/HTTP contract](2026-10-31-foxy-architect-publication-http.md).
