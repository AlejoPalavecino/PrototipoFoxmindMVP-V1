# Private storage timeout ownership — risk and minimum mitigation

- Agent / role: /root/architect_next / architect.
- Session ID: unavailable; actual task identity /root/architect_next.
- Date: 2026-11-01.
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai.
- Starting commit observed: fabb2ac.
- Phase/spec: V-A1b; [custody contract](2026-11-01-architect-private-asset-custody.md).
- Status: completed (design/diagnosis only; mitigation not implemented by architect).
- ESTADO_DISENO: LISTO_PARA_TDD_RED for storage-owned operation tracking/drain. No real IMAGE enablement proof yet.

**Admission correction:** the global-slot prescription and corresponding global-rejection assertions below are historical and superseded by the [accepted scoped-concurrency correction](2026-11-01-architect-storage-concurrency-correction.md). Healthy P4 concurrency is preserved; uncertainty barriers use `p4/<scopeUuid>` or `foxy-assets/<ownerUuid>`. Keep the actual-operation/controller/drain guarantee, not the earlier capacity1 policy.

## Request and scope

Assess S3Storage.bounded abandoning its real SDK operation on Promise.race timeout, and provide a provable minimum before private IMAGE runtime enablement. Only this attributed record changes; no production/test edits, credentials, real storage/provider calls or retained data. Reviewer independently reported a delayed fake SDK send that writes after timeout/facade.close; this record distinguishes that report from fresh architect verification.

## Evidence inspected

Current S3Storage creates an abort controller and returns the winning timeout while the operation promise remains untracked. Files custody lifecycle drains only its returned operation. Infrastructure.close currently calls client.destroy synchronously and exposes no drain/uncertain-operation ownership. The trusted backend key/payload binding and quota reservation remain durable; cleanup is not enabled.

## Fresh reproduction and root class

Executed an inline Node script importing the actual current S3Storage, with a fake client.send that deliberately ignores abort and waits on a controlled gate. No SDK endpoint/network/credentials are used. timeoutMs5; put of a synthetic buffer under a valid synthetic P4 key returns SERVICE_UNAVAILABLE while signal.aborted=true and write=false. Releasing the gate afterward changes write=true. Exit0, deterministic gate-controlled observation. This independently reproduces reviewer's reported mechanism; the architect did not run a full facade.close integration here.

Root class C: asynchronous I/O ownership was represented by the caller-facing Promise.race instead of the actual operation promise. Reordering abort/error callbacks or merely awaiting Files' returned promise cannot restore ownership of a hidden send. Every success/failure/shutdown boundary consuming that public promise inherits the gap.

Current protections still matter: late bytes belong to a persisted immutable owner/conversation/key/hash with retained quota; aborted/stale capability cannot commit READY; no physical cleanup/release is active. The failure does not make the object public or prove unchecked preview. It invalidates claims that facade.close alone drains every real storage send, and can permit new operations/buffers while a timed-out previous send is still pending.

## Initial repair proposal and exact API (slot policy superseded)

Fix the existing storage owner; do not add a second S3 client or a private shadow put implementation.

```ts
// Existing constructor arguments preserved; trusted bounded drain seam added:
new S3Storage(client,bucket,timeoutMs=10000,drainTimeoutMs=30000);
storage.put(key,bytes):Promise<void>; // deadline may reject before real send settles
storage.get(key,limit):Promise<Buffer>;
storage.remove(key):Promise<void>;
storage.drain():Promise<void>; // snapshot of REAL pending operation promises
storage.close():Promise<void>; // stop admission, abort, drain, destroy owned client
```

Constructor drainTimeoutMs must be safe positive integer<=30,000; shorter values are trusted tests only. Keep10s ordinary I/O default and existing max30s bounds; keep conditional writes, key allowlists, byte limits, status/error mapping and SDK attempts1. No default no-op drain is acceptable as a runtime custody guarantee.

1. Under one synchronous admission check, reject a closed instance or occupied operation slot before invoking any SDK send. One actual buffered storage operation per S3Storage instance; reject SERVICE_UNAVAILABLE rather than queue/copy unbounded bodies. This global owner slot extends the existing bounded-buffer policy across FileService clones. It is a shared Files change: run affected P4/text publication regressions, not only visual tests.
2. Register the real full operation promise and its controller BEFORE the timeout race can release its caller. For GET the operation includes send AND body consumption/destruction, not only response headers. A Promise.resolve().then operation start can avoid synchronous throws before registration. A single settlement handler owns registry/slot release and handles rejection; never release them in the public timeout finally.
3. On timeout, abort controller and return sanitized SERVICE_UNAVAILABLE promptly to caller. Keep real promise/controller/buffer ownership until actual settlement. New requests cannot create another send while it is unresolved. A late failure/success is observed and must not become an unhandled rejection or a post-timeout successful method result.
4. Drain snapshots the real pending operations and awaits settlement under the explicit drain deadline. It does not close admission by itself. If deadline expires, reject SERVICE_UNAVAILABLE and retain the registry/slot until real settlement; do not clear it to simulate completion. A later drain may retry the still-owned work. A hung/abort-ignoring backend cannot satisfy both bounded successful shutdown and proven completed I/O; failure is the truthful result.
5. Close synchronously stops admission and aborts all owned controllers, awaits drain, then destroys the owned SDK client in finally. Its promise fulfills only if drain observed settlement; timeout/error rejects explicitly. Repeated close is idempotent and shares the closing attempt. Destroying a client is an abort attempt, not proof of storage rollback or remote quiescence.
6. GET must inspect signal immediately after send returns and before/after awaited body reads; a response arriving after timeout must have its body destroyed without starting a fresh hidden unbounded read. Registering an abort listener after the signal is already aborted does not fire it automatically. This is the same failed-success-handoff class diagnosed in bounded fetch, with storage-owned cleanup added.

The registry is actual in-flight work ownership, not a second database usage counter or new asset business state. Persisted PROCESSING/quota/hash remains the source of truth for uncertain retained bytes. No changes to owner/context/proof/lease security gates.

## Lifecycle wiring and clarified guarantee

Extend the trusted private-storage port with drain; actual enabled visual composition must supply the real S3Storage drain, never a permissive fallback. Test-only storage ports can implement drain according to their own real operation lifetime; a mock no-op cannot establish S3 acceptance.

Files private facade.close first stops its own admission/revokes capability, awaits lifecycle work/heartbeat, then awaits shared storage.drain WITHOUT closing shared storage. Its own canceled/timed-out send is still in that snapshot, so facade close cannot truthfully fulfill while that send remains unsettled. Other users of the shared storage remain independent; new unrelated work after snapshot is not claimed as facade-owned. Failure to drain propagates sanitized failure rather than being swallowed as successful close.

Global FileInfrastructure.close becomes async and delegates to storage.close; no separate immediate client.destroy path should bypass its tracking. FileHostLifecycle awaits it after workers are stopped, and the application construction-failure path awaits infrastructure.close too. Keep cleanup attempts for all other resources even when one drain fails, and report observed failure. Root shutdown must drain producer/custody/publication/cleanup work before closing shared storage, then Prisma. Do not have facade.close destroy a shared client that other modules still need.

## Limits: client settlement is not remote cancellation

Even a settled SDK send with AbortError does not prove the server never accepted/will never finish a PUT. AbortSignal is cancellation of client observation, not a distributed transaction rollback. A successful local drain proves no owned client promise remains pending; it cannot prove the remote system rolled back bytes.

Therefore timeout/abort retains the private reservation, persisted key/hash and inaccessible non-READY state. Exact-key readback/reinspection/real scan can later reconcile the object under a new valid claim without redispatching the provider. A late same-payload conditional PUT cannot replace a differently bound artifact. Do not physically remove/release quota on the basis of timeout, AbortError or client.destroy. The separate deletion cut still needs distributed write/delete ordering and late-writer tests; metadata fencing alone prevents READY, not an in-flight remote write.

Before a real IMAGE path is enabled: observe storage registry/slot/drain tests and actual owned storage/scanner custody/recovery proof; keep all deletion/release disabled until separately proven. A synthetic test can demonstrate this ownership repair but cannot prove a real storage service's remote abort semantics. This design does not authorize a paid provider call, deployment or retained-data experiment.

## Initial CRITERIOS_DE_TEST_DOT / RED (global-slot cases superseded)

1. Fake send waits on gate/ignores abort: put rejects at short deadline; real-send count remains1 and slot occupied. Another put/get/remove fails fast without calling SDK or allocating another transfer. No queue/retry.
2. storage.drain and facade.close do not fulfill while gate remains held; release gate, actual send settles, then drain may fulfill and slot becomes usable if not closing. Confirm no unhandled rejection for late reject and no post-timeout READY.
3. storage.close rejects admission synchronously, aborts current signal, waits for gate settlement before successful close, destroys client once and returns same closing attempt on repeat. If drain deadline expires it rejects fixed error, retains registry, does not claim clean close; late settlement remains observed.
4. GET headers/body delayed independently, already-aborted/timeout response body, body iterator throw and close during read: cancel/destroy and actual operation lifetime remain owned. Returned data must obey existing length/digest checks; no body memory escapes the cap.
5. Actual S3Storage inside FileService/private facade, not only a stub with already-bounded methods: uncertain PUT retains asset PROCESSING/charge; close awaits real registry; recovery after gate release uses same key/hash/bytes and real scan. Context/lease revocation still blocks proof.
6. Infrastructure/host/application lifecycle tests assert awaited ordering on normal and construction-error paths, all resource cleanup attempted after failures, no early synchronous destroy bypass. Existing P4/read/conditional-write/text publication/concurrency tests remain meaningful; source changes are not visual-only.
7. Owned disposable actual S3/ClamAV journey: successful still images, scanner outage, connection loss/delayed response, shutdown/restart/reconciliation and no quota release on unknown outcome. Preserve historical unavailable checks; no retained P4 helper/configuration. This proof is separate from fake send timing.

## Verification and handoff

Read actual storage, configuration, host shutdown, application construction cleanup, private custody lifecycle and relevant attributed records. Controlled S3Storage reproduction passed exit0 and demonstrated late side effect after public timeout, not repaired behavior. No source/test edit, SDK endpoint, key/private data or database used.

Exact drain/close/slot/timeout semantics were sent to coordinator/test_runner; reviewer received fresh reproduction and the remote-cancellation limitation. Coordinator can dispatch one storage-owned lifecycle repair after RED, keeping old source slices disjoint and broadening verification to shared Files consumers. Architect creates no commit. Node filesystem structural check passed exit0:1local Markdown target,0missing,0trailing-whitespace lines.
