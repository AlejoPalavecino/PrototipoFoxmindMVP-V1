# Foxy R2B — publication history and serial inspection

- Agent / role: /root/foxy_architect / architect
- Session or task ID: /root/foxy_architect (R2B history/poll contract)
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: c6d14f0; clean working-tree status observed at first inspection
- Phase: Foxy text resource frontend R2B
- Status: completed (design only; no behavioral verification performed here)

## Scope and evidence

Read actual R1/R2A/client at c6d14f0, selected existing tests, domain response types, list/inspect repository and service, existing chat polling and prior R2A/UI design. R2A's actual result is FoxyPublicationSummary|null, not the earlier proposed {created,publication} wrapper; this contract consumes the actual public getter. Only this record was written. No production/test edits, DB, secrets, browser or provider calls.

## Decision and exact API

New read-only companion createFoxyPublicationHistoryController. R1 owns the saved resource/draft; R2A owns destination metadata and prepare intent. Neither imports or is modified by this controller. Actual client dependencies allow GET list/inspect only, with no confirmation, preparation, file read or UUID generation.

```ts
createFoxyPublicationHistoryController({
  client: Pick<WebFoxyClient, 'listPublications' | 'inspectPublication'>,
  resource: Pick<ReturnType<typeof createFoxyResourceController>, 'getState'>,
  preparation: { getState(): { result: FoxyPublicationSummary | null } },
  onChange: (state: PublicationHistoryState) => void,
  setTimeout?: typeof globalThis.setTimeout,
  clearTimeout?: typeof globalThis.clearTimeout,
}) -> {
  getState(): PublicationHistoryState;
  syncResource(): void;
  loadMore(): Promise<void>;
  refreshList(): Promise<void>;
  select(id: string): Promise<void>;
  refreshSelected(): Promise<void>;
  syncPreparation(): void;
  dispose(): void;
}
```

```ts
type PublicationHistoryState = {
  resourceId: string | null;
  items: FoxyPublicationSummary[];
  loaded: boolean;
  nextAfterId: string | null;
  loading: boolean;
  selectedId: string | null;
  inspection: FoxyPublicationInspection | null;
  inspecting: boolean;
  polling: boolean;
  staleResource: boolean;
  listErrorCode: string | null;
  listError: string | null;
  inspectionErrorCode: string | null;
  inspectionError: string | null;
};
```

Initial state is empty/null/false. Constructor and syncResource do no I/O. All public snapshots, including nested summary/inspection objects, are defensive copies. Do not store or send resource markdown/title to any new service. Errors use safe known codes with SERVICE_UNAVAILABLE fallback and fixed user messages, never raw error diagnostics.

## Resource and lane lifetime

Bind only to the current editing R1 resource. syncResource reads the real getter. A different resource ID, closed/loading/unavailable editor or dispose increments the resource epoch, aborts list/selection requests, clears the timer, caches/consumed-preparation stamps, items, selected metadata and errors. Account identity loss additionally latches unavailable until a fresh composition; a stale R1 getter cannot revive private rows. UUID comparisons are case-insensitive/canonical.

Same-resource dirty text, a SAVE pending or a conflict does not forbid reading existing private history. It does not by itself prove that an older preparation is stale. A known saved resource revision different from the selected publication.resourceRevision sets staleResource=true, stops the recurring timer and aborts an in-flight selected read, keeping prior inspection as a clearly older observation. This never fabricates FAILED/STALE in the server summary. A manual refresh of an older item is allowed, but cannot restart its recurring polling while revisions differ. Selection of a matching current-version item clears staleResource after validation. R1/R2A remain untouched.

Use separate list and selection epochs/controllers under the resource lifetime. A list refresh must not cancel the selected read and a publication selection must not discard loaded history. Resource switch/dispose cancels both. Every resolve, reject and finally checks the captured resource/selection epoch and original signal, so even a noncooperative port cannot emit late data or clear another request's loading flag.

## List and cursor lane

loadMore first calls listPublications(resourceId,{limit:20,afterId:null},signal). After loaded=true it uses exactly nextAfterId; if null, it does nothing. Concurrent list requests share one active promise and never overlap. refreshList during an active list also shares that promise; the caller may explicitly refresh afterward, not queue an unbounded refresh loop.

For loadMore, append server-returned IDs in server order, dedupe IDs already seen, and use the server nextAfterId even when the page is short or all items were already known. Never derive end-of-list from items.length. Validate returned IDs/resource scope/canonical bigint revisions and cursor UUID; reject a cursor that repeats the requested cursor or otherwise causes a local no-progress loop. No timestamp conversion or client sorting: the API already orders created_at DESC,id DESC and resolves exact TIMESTAMPTZ precision in SQL.

refreshList requests the first page and, on success only, replaces its visible ID order and cursor. Do not keep old tail rows as though they belonged to the fresh pagination chain. Existing selected inspection may remain separately if still authorized even when its older item is outside the refreshed first page; absence from one bounded page does not mean deletion. Generic list failure keeps the last successful rows/cursor and sets list error; an explicit refresh can retry. No automatic page draining or retries.

Keep a private summary cache for the current resource. Merging an older page never replaces a higher revision already learned through inspection or preparation. The array order follows page IDs; cached newer summary fields fill that identity without moving it. Validate immutable metadata for a given publication ID: resource ID/revision, destination, title and unit/topic cannot change in the current protocol. Contradictory metadata or equal-revision different state is an invalid response, not a reason to merge arbitrary fields.

## Selection and recurring inspection

select validates/canonicalizes the UUID, cancels the previous selection timer/request, clears the previous inspection/errors and fetches inspectPublication immediately. A valid direct ID need not already be loaded in the bounded list: the server authorizes it, and the response must match both requested ID and currently bound resource ID before any display. A direct selection never invents a list position. Selecting the current ID while its read is active shares that promise; refreshSelected does likewise. A different selection starts a new logical lane after aborting the old signal; only one non-aborted selection read is current.

Accept only valid FoxyPublicationInspection: requested ID and resource identity, known state, valid nullable association IDs, canonical nonnegative int64 revisions, actual boolean classroomArchived and safe job error code. Merge the valid summary into cache/items without lowering known revision. Track classroom revision high-water separately per classroom ID, never globally across classrooms; classroom B revision1 must remain valid after classroom A revision100.

An inspection with publication revision below the highest known for that ID, or classroom revision below the highest observed for that classroom, is discarded, never shown as newer and never resumes polling. Preserve any still-current prior inspection; if a newer summary has superseded its publication revision, invalidate the old inspection rather than relabel it with synthetic fields. Set a safe local CONFLICT/error requiring explicit refresh, and stop the recurring loop. Do not combine a new summary with an old classroom revision to manufacture a fresh inspection. Generic malformed responses use SERVICE_UNAVAILABLE.

Terminal publication states cannot regress: PREPARING may become READY, FAILED or already PUBLISHED when intermediate observations were missed; READY may become PUBLISHED; FAILED and PUBLISHED remain terminal. Higher revision of the same state is harmless, but a higher numeric revision alone cannot justify an illegal backward state transition or changed immutable metadata. List snapshots may be older and simply retain the newer cache; selected inspections must satisfy the coherence checks above.

After an accepted inspection, schedule exactly one timeout for 2000ms only if its effective latest summary is PREPARING, it is not a known older resource version, destination is not archived, and the current lane has no error/active read. The timeout launches one GET; no next timer is scheduled until that GET has settled successfully. Do not use setInterval. polling=true means this recurring lane has a scheduled tick or active polling read; inspecting=true marks an actual GET. READY/FAILED/PUBLISHED, archive, resource mismatch, auth/object denial, error, explicit selection change and dispose stop it.

Manual refreshSelected cancels any scheduled tick and performs one read. A current successful PREPARING inspection may resume the serial timer; terminal/archived/older/error stays stopped. A lower revision never triggers an automatic retry storm. A generic error keeps last data as a previous observation with visible error and stops. An aborted superseded read does not show an error on the replacement selection.

## Consuming an R2A preparation result

syncPreparation reads the current actual R2A result. Null does not clear history. Validate matching resource and summary identity, then consume each normalized ID/revision/state stamp at most once per resource lifetime; repeated cloned getter results cause no duplicate requests or selection jumps. Ignore/retain newer cache over an older result. Do not infer a new state or use a PREPARE response to clear R2A's uncertain intent; that remains R2A's responsibility.

A newly consumed result is selected/inspected through the same selection lane and triggers a coalesced first-page refresh. It is NOT blindly prepended: replay may refer to an old publication and the summary exposes no created_at. Its selected panel can be shown separately until the real server page establishes position. All these calls are GET. If a known higher result supersedes an in-flight lower inspection, the lower response is discarded under the high-water rule; manual refresh can recover a coherent inspection. There is no additional recurring timer for the preparation controller.

## Authentication and inaccessible objects

AUTH_REQUIRED/EMAIL_VERIFICATION_REQUIRED from either list or inspection clears history, all metadata/caches/selected state and timers, aborts both lanes and latches unavailable so stale R1/R2A sync cannot restore it. The actual shared WebFoxyClient identity callback must dispose all companions and clear the rendered workspace in R3; isolated R2B is not claimed to prove that wiring.

FORBIDDEN/NOT_FOUND may indicate one destination, selected object or cursor became inaccessible while the R1 resource/draft remains authorized. Cancel both history lanes/timers and clear the private history/selection/cursors for a conservative fresh read, but retain the bound resource identity and do not mutate R1 or R2A. Leave the relevant safe error visible and permit an explicit refreshList from the beginning. R3 verifies resource access separately if a whole-resource denial must close its editor. Generic 400/cursor or transport errors do not destructively change R1; keep prior authorized observations and never automatically regenerate or publish.

## RED and slicing

First executable R2B1: private summary/cursor merge helper plus list and selected-read lifecycle, with one request per lane, resource/selection cancellation, DTO/coherence checks and auth teardown. Then R2B2 adds injected serial timer and syncPreparation adoption using those lanes. Do not mark the whole R2B contract complete until both cuts pass; do not wire an incomplete controller into UI. Keep new files below200 lines and reviewed work units small.

test_runner owns new foxy-publication-history-controller.test.mjs and, if needed, a focused pure-cache test. Worker owns only the new controller/helper files, e.g. foxy-publication-history-controller.ts, foxy-publication-history-cache.ts and a small polling helper if needed. Do not edit R1/R2A/client/TSX or their tests during this slice. Coordinator later wires R1 onChange to syncResource and explicit resource-open success to initial loadMore; do not call loadMore after every keystroke. R2A onChange forwards syncPreparation, whose stamp guard prevents repeated adoption.

RED cases:

1. Constructor/sync have no network; first list uses limit20/null, next list exact cursor, end only cursor null. Short/duplicate-cross-page pages still follow the valid advancing cursor. Refresh replaces first-page order only after success; errors preserve prior data.
2. List callers coalesce; snapshots cannot mutate cache/cursor. Resource change aborts both lanes and late success/failure/finally produces no newer-state corruption.
3. Selecting A then B aborts A; B alone is displayed/polled. Wrong response ID/resource, invalid state/revisions or immutable metadata do not enter state. Current-ID refresh coalesces; pending poll and manual refresh never create two current reads.
4. Fake timer proves one2000ms tick after PREPARING success, zero ticks started before the active read resolves, and no second GET/timer while it is pending. Terminal READY/FAILED/PUBLISHED and archived destination stop.
5. Known resource revision change stops/aborts poll and marks the view older without inventing a server state. Dirty text alone does not claim stale. Manual refresh may read an old preparation but does not resume its loop.
6. Bigint revisions above2^53 merge exactly. Old list cannot overwrite READY/PUBLISHED; lower inspection is discarded/stops, same-classroom revision cannot decrease, and another classroom's smaller revision is accepted.
7. Generic inspection failure retains only a prior observation with error, stops scheduling, and manual successful refresh resumes only current PREPARING. Late abort does not show an error on a replacement selection.
8. Repeated R2A summary clones are adopted once; new result selects and refreshes, without prepend, POST or fabricated progress. A replay of an older item preserves real page order; stale R2A revisions cannot downgrade newer history.
9. Auth/verification during list/poll clears everything, cancels timers and latches against stale getter resurrection. Object403/404 clears history but never calls a mutating R1/R2A method; explicit beginning refresh can recover remaining accessible objects.
10. Dispose aborts requests, clears timer/cache/private state, suppresses callbacks and makes later methods no-ops. Existing R1/R2A regression stays unchanged. No confirm/file/provider call is available through the type-level client port.

## Verification and handoff

Only source and document inspection plus git status/rev-parse. Some broad output was truncated and the actual relevant APIs/types were read in the available output; no functional, browser or DB tests by this architect. Shared roadmap and commits remain coordinator-owned. API/state/initial RED cases were sent to /root while preparing this record.

Own record structural check exited 0: no trailing whitespace and both relative Markdown links resolve. Functional tests were unnecessary for this design-only change; all RED/verification cases above remain prescribed work rather than observed PASS.

First next action: test_runner starts R2B1 against these new ports, then timer/adoption RED; worker implements only its disjoint files. Later review/confirmation remains a separate contract, not part of R2B. See [R2A companion contract](2026-10-31-foxy-architect-preparation-r2a.md) and [broader resource UI contract](2026-10-31-foxy-architect-resource-ui.md).
