# Storage ownership — preserve healthy concurrency and scope uncertainty

- Agent / role: /root/architect_next / architect.
- Session ID: unavailable; actual task identity /root/architect_next.
- Date: 2026-11-01.
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai.
- Starting commit observed: 615f051.
- Phase/spec: V-A1b; correction to [initial storage ownership design](2026-11-01-architect-storage-timeout-ownership.md).
- Status: completed (diagnosis/design only; production repair belongs to worker).
- ESTADO_DISENO: LISTO_PARA_TDD_RED.

## Request and supersession

Coordinator/reviewer confirmed that the proposed single global S3 operation slot rejects healthy concurrent P4 writes, and the current close does not abort active controllers before draining. Preserve accepted P4 concurrency while retaining actual I/O ownership and scoped uncertainty fencing. Only this record and a supersession pointer in the architect's earlier record change; no production/test edits or external provider/storage credentials/data used.

The architect's initial global-slot prescription was too broad. This record supersedes its admission/slot policy and corresponding global-rejection tests. Real-promise ownership, bounded drain, actual controllers, immutable key/proof/quota and remote-cancellation limits remain valid. Do not present the earlier global gate as a required invariant or silently keep its tests as product policy.

## Fresh evidence

Initial source inspection confirmed the reviewer/coordinator diagnosis: a single owned Promise rejects any concurrent operation, and close sets closing then drains without retaining/aborting operation controllers. Those runtime failures are attributed to reviewer, not invented architect observations. During an initial inline probe the worker concurrently changed storage.ts to a Set; the probe's assumption that the second call would reject instead held both gates until timeout, producing an unhandled synthetic SERVICE_UNAVAILABLE and exit1. That probe is not accepted reproduction evidence. A corrected capture-all/gate-release probe against the updated candidate is recorded below; no source was edited by architect.

## Correct registry and admission contract

One storage-owned Set contains ALL actual active operations, each record `{key,scopeKey,kind:'PUT'|'GET'|'REMOVE',controller,done:Promise<void>,timedOut:boolean}`. A derived per-scope query/index may accelerate lookup but must not become a separate mutable source of truth. Register before invoking the SDK; remove only on actual full operation settlement. For GET, settlement includes body disposal. Every rejection is observed. Preserve immutable conditional PUT, current exact key allowlists and SDK attempts1.

ScopeKey is exactly the first TWO validated path segments:

| Storage key | Uncertainty scope |
|---|---|
| `p4/<scopeUuid>/<object>` | `p4/<scopeUuid>`; the existing classroom/draft storage scope, not uploader or whole P4 namespace |
| `foxy-assets/<ownerUuid>/<assetUuid>` | `foxy-assets/<ownerUuid>`; one teacher private quota scope |

Do not normalize arbitrary keys into a trusted scope or accept alternate traversal/segment encodings. The existing P4 key acceptance remains compatible; metadata auth still determines actual ownership, storage key shape alone does not authorize a caller.

Healthy admission: while not closing, retain baseline concurrent operations at distinct keys/scopes, including multiple healthy P4 PUTs and GETs. No new global capacity1 gate, synchronous per-scope mutex or pending queue is added. Ordinary existing same-key conditional-write semantics are not replaced by a blanket healthy lock. Buffer caps and upstream HTTP/FileService/worker/actor quotas remain in force.

Failure admission: when a mutating PUT/REMOVE has TIMED OUT publicly but its real operation is still unsettled, block NEW PUT/REMOVE in that exact scope with SERVICE_UNAVAILABLE before another SDK call/body copy. This includes its own key and any newly generated key for that same scope, preventing retry loops from accumulating more uncertain writes. Mutations already admitted before the timeout remain tracked and can settle. A different P4 scope/private owner remains independent; one Foxy timeout cannot block all P4. Derive this barrier from pending timedOut mutating records; lift it only when the last such record for that scope actually settles.

GET remains allowed for reconciliation, including the SAME key with a pending uncertain PUT. It can return NOT_FOUND or current bounded bytes; it does not prove that the pending write is canceled or authorize READY/deletion. The caller still rechecks context/digest/proof/lease. Track timed-out reads until their actual body lifecycle settles, but this correction adds no new GET admission barrier or healthy/read-only resource policy. Existing read limits remain authoritative; do not broaden the requested uncertain-write fence to unrelated reads.

No automatic retry, new key, server-side copy or concurrent remove bypasses uncertainty. This is a local client ownership barrier, not distributed write exclusion across processes. Durable source reservation/key/hash and SQL claim fences still apply; no deletion/quota release from a client timeout. A new process must reconcile persisted uncertainty under the accepted custody rules, and physical cleanup remains separately gated.

## Bounds and honest limits

The storage registry adds only fixed bookkeeping per already-admitted operation and does not retain another byte copy. Existing per-call50MB/P4 and10MiB/private bounds and trusted upstream concurrency limits remain unchanged. After a timeout, no additional same-scope work of the blocked class is admitted; the maximum retained work in that scope is what upstream limits had already admitted before the first timeout. Drains are bounded by existing30s maximum configuration; no unbounded pending queue is introduced.

S3Storage by itself does NOT newly promise an absolute global healthy-operation cap. Direct trusted callers still must supply the established bounded-transfer/concurrency policy. Do not claim per-scope uncertainty fencing is a global memory proof, or reinstate capacity1 to manufacture that claim. A different global resource-cap change would require its own compatible admission contract and acceptance tests; it is not part of this correction.

## Close/drain correction

API remains constructor `(client,bucket,timeoutMs=10000,drainTimeoutMs=30000)`, `drain():Promise<void>`, `close():Promise<void>`.

1. close marks closing synchronously BEFORE its first await, so no subsequent send starts.
2. Abort EVERY controller in the actual-operation registry before snapshot/drain. A client honoring abort can settle promptly instead of waiting for operation timeout. Retain controllers after request-level timeout too.
3. Drain waits the snapshot of ALL real done promises with existing deadline; it does not abort or close admission by itself and never erases pending records on timeout.
4. Destroy SDK client exactly once in close finally, including drain failure. Successful close means actual client work settled; rejected close explicitly does not claim it drained. AbortError/client.destroy still do not prove remote rollback.
5. Concurrent/repeated close shares the same stored Promise; prevent unhandled late rejections, use one owner for timer/controller/registry cleanup. facade.close uses shared drain without destroying a shared client; infrastructure/host close still await the global owner.

## CRITERIOS_DE_TEST_DOT / changed RED

- Two healthy distinct P4 keys, including SAME P4 scope and different scopes, both reach controlled SDK sends concurrently. GET/PUT mixed healthy calls preserve baseline. No first-operation false503.
- Uncertain PUT at `p4/A/x`: same-key PUT/REMOVE and new-key PUT/REMOVE at `p4/A/y` fail without SDK call. `p4/B/z` and `foxy-assets/C/a` remain allowed. Mirror for private owner A versus owner B and P4. Nothing blocks an entire namespace merely because one owner/classroom failed.
- GET `p4/A/x` while write pending remains permitted, bounded and incapable of completing custody without actual proof. Reads remain tracked and retain existing admission limits; healthy reads elsewhere work.
- Release gate or reject actual send: pending record disappears only then; scope barrier remains while another same-scope uncertain record exists. No queue, duplicate send, extra byte copy or unhandled rejection. No stale promise settlement clears another operation's record.
- close with long operation timeout/short drain timeout and abort-honoring SDK: controller aborted immediately, operation settles, close succeeds and destroys client once. Abort-ignoring SDK: close remains pending until gate settlement or rejects drain deadline honestly; registry retained on failure. Multiple active controllers ALL aborted, not only last one.
- Drain snapshots every pending operation and body lifecycle, not one global promise. Repeated close identity/idempotence, late GET headers cleanup and infrastructure/facade awaited ordering remain covered.
- Actual P4/FileService/text publication concurrent journeys plus private custody synthetic/real storage/scanner acceptance remain required. Reopen only global-slot-specific assertions introduced by the initial proposal; do not remove original P4 success tests or weaken timeout/proof behavior.

## Verification and handoff

Corrected inline Node probe against the concurrent updated S3Storage candidate, exit0: two healthy distinct-scope P4 sends both admitted (SDK calls2), both fulfilled after gate release; abort-honoring SDK with operation timeout1000ms/drain100ms observed signal aborted by close, put rejected sanitized SERVICE_UNAVAILABLE, close fulfilled and destroy called once. This is bounded candidate smoke proof, not the full acceptance suite or reproduction of the prior code. It used synthetic data/ports only, no network or credential.

No production changes, test edits, DB/provider/real storage operation or credential read. Coordinator/test_runner/reviewer received the exact two-segment scope and same-key GET policy. Worker can implement registry/scoped uncertainty/controller ownership and run named RED plus broader P4 checks. No commit by architect. Node filesystem structural checks passed exit0: this record1local target and updated prior record2targets,0missing,0trailing-whitespace lines.
