# Foxy private asset custody — V-A1b design

- Agent / role: /root/architect_next / architect.
- Session ID: unavailable; actual task identity /root/architect_next.
- Date: 2026-11-01.
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai.
- Starting commit observed: d5d6b7a.
- Phase/spec: V-A1b; [asset design](2026-11-01-architect-private-visual-assets.md), [Foxy proposal](../../odd/tasks/foxy-ai-proposal.md).
- Status: completed (design only).
- ESTADO_DISENO: LISTO_PARA_TDD_RED for V-A1b.1 inspector; subsequent custody units use the contracts below.

## Request and scope

Design bounded private PNG/JPEG inspection, actual scanner/storage custody and restart-safe readiness after V-A1a. Write only this design record; preserve concurrent V-A1a implementation. No secrets, private data, provider call, production edit, migration execution or retained-resource access.

## Inspected evidence

Observed HEAD d5d6b7a; V-A1a domain/repository/schema/migration and tests are concurrent uncommitted work. Read the current 202611010001 migration rather than assuming the previous proposal is its implementation. Files public barrel, storage/scanner ports, bounded inspector, existing cleanup patterns and Foxy public barrel were inspected.

## Reconciliation with actual V-A1a

The observed new table already separates private storage from FileObject, fixes storage_key to `foxy-assets/<owner>/<asset>`, reserves10MiB and has composite conversation/owner identity, proof/quota/deletion checks and initial lifecycle trigger. The current repository implements reserve/usage only. There is no claim/bind/read/scan path or enabled generation yet. This is not complete byte custody.

Keep first payload immutable as implemented. In V-A1b the application must additionally ensure payload/proof binding happens only under an unexpired PROCESSING lease and current source authorization. SQL currently allows some of those changes without a live lease; harden via a new additive successor migration after V-A1a is frozen, or coordinate with its current owner before it is frozen. Do not silently edit another agent's migration. Every processing payload/proof/final transition must compare both nonce and lease_until>database clock; successful terminal transitions clear the lease. READY never restarts generation.

DB provides minimum NULL-safe JSON shape/size and descriptor/proof checks; it need not duplicate the whole domain parser's graph semantics. The first bind must call parseFoxyDiagram plus1..30nodes,<=60edges and compare title/description to the accepted structured payload. Empty IDs, duplicates and dangling edges are domain parser errors before PUT. A SQL CHECK accepting NULL for missing nodes is not a minimum-shape check; add a nodes-presence test and COALESCE(...,false) where needed. This clarification was sent to test_runner and coordinator.

## V-A1b.1 — next small executable unit: bounded private-image inspector

Files owns new `foxy-private-image-inspector.ts`, its worker entry and a small format helper if needed; expose only the factory from `files/index.ts`. Reuse installed Sharp0.35.5/file-type and the established bounded worker pattern; no SDK/provider/scanner/storage call in this first unit and no behavioral change to ordinary P4 inspection. This isolates the stricter Foxy limits from existing50MB/25Mpx material policy.

```ts
interface FoxyPrivateImageFacts {
  mimeType: 'image/png'|'image/jpeg';
  width: number; height: number; sizeBytes: number; digest: string;
}
createFoxyPrivateImageInspector(options?: {
  workerFactory?: () => WorkerPort; timeoutMs?: number;
}): {
  inspect(bytes: Uint8Array, signal: AbortSignal): Promise<FoxyPrivateImageFacts>
};
```

WorkerPort is `Pick<Worker,'postMessage'|'terminate'|'once'|'removeListener'>`, the same trusted seam as the accepted diagram renderer, not a browser-facing option. Protocol: parent posts `{bytes}` from its owned copy; worker sends `{ok:true,result:{mimeType,width,height,sizeBytes,digest}}` or `{ok:false,code:'FILE_REJECTED'}`. Unknown failure/result shapes map SERVICE_UNAVAILABLE. Require a real AbortSignal-like accepted signal; validate options as positive safe integer timeout<=15,000ms. Synchronously validate size and copy input before the first await; do not pass caller-owned or shared mutable storage into the worker. Return a fresh facts object without source bytes or raw metadata. Parent validates worker response shape, finite integer bounds and exact MIME/dimensions/length/digest against its own byte snapshot, using the same lightweight container-header helper for encoded dimensions and signature. Native decoding stays in the worker. The worker is trusted native-parser isolation, not a security boundary against arbitrary injected production code.

Bounds:1..10,485,760bytes; width/height1..4096; product<=4,000,000; at most4decoded channels; one still PNG/JPEG image. These are raster encoded dimensions, no implicit EXIF rotation/re-encoding. PNG supports normal alpha/palette; JPEG supports ordinary baseline/progressive still images. The native decoder must fully decode accepted pixels, not just read metadata. Reject SVG/GIF/WebP/AVIF/TIFF/PDF, mismatched signatures, truncation, unsupported animation/multipicture, decompression limits and invalid headers/content. Native metadata/EXIF/ICC/comments are never returned or logged.

Format gate is structural, not a substring regex over pixel data: PNG signature and bounded chunk walk, require IHDR/IEND shape, no trailing data and reject animation chunks acTL/fcTL/fdAT. Reject JPEG MPF/multipicture markers/extra top-level codestreams and trailing payload, using a bounded marker walk with correct entropy-byte escaping/restart handling; do not match arbitrary marker bytes inside scan data. If a valid but unsupported container cannot be established as one still image, reject it. Do not broaden the format list to make a test fixture pass.

Sharp must receive Buffer input only, never a path/URL, with failOn:'warning',limitInputPixels:4,000,000,limitInputChannels:4,unlimited:false; native concurrency1/cachefalse inside that worker, single complete decode with its own<=8s libvips timeout. Worker128MiB old heap/16MiB young/4MiB stack and absolute15s deadline; terminate/drain on success/failure/timeout/abort, discard late output. No network/filesystem loader or generated markup. Native allocations are additionally bounded by byte/pixel/channel limits; V8 heap limits alone are not a full native-memory guarantee.

Errors: INVALID_INPUT for malformed invocation/oversized or empty input; FILE_REJECTED for disallowed/malformed/animated/multipicture image or dimensions exceeding content policy; SERVICE_UNAVAILABLE for native worker error/exit/timeout/invalid result. signal abort preserves the caller's abort outcome after cleanup. Fixed public code/message only; no native diagnostic or image-derived string. Later custody maps FILE_REJECTED to durable INVALID_CONTENT; scanner's definitive malware failure maps INFECTED, not a parser finding.

Official versioned [Sharp constructor](https://github.com/lovell/sharp/blob/v0.35.5/docs/src/content/docs/api-constructor.md) and [input metadata](https://github.com/lovell/sharp/blob/v0.35.5/docs/src/content/docs/api-input.md) were checked through Context7. metadata reads headers without pixel decoding, and documented pages support does not establish APNG detection. The [output timeout](https://github.com/lovell/sharp/blob/v0.35.5/docs/src/content/docs/api-output.md) excludes libuv queue wait, hence the separate wall deadline. No live provider research or spend was needed.

## V-A1b.2 — persistent claims, immutable payload and Files facade

Do not compress this into inspector unit. Foxy owns lease/authorization/SQL, Files owns byte inspection, actual scanner and object I/O. Public domain contracts first, then narrow `foxy-ai/public/index.ts` authority types for Files consumption, following existing publication adapter. No cross-slice deep import, new provider client, synthetic FileObject or permissive auth adapter.

```ts
interface FoxyPrivateAssetLease {
  assetId:string; ownerId:string; conversationId:string; leaseNonce:string;
}
interface FoxyPrivateAssetPayload {
  bytes:Uint8Array; title:string; description:string;
  producerVersion:'foxy-diagram-png-v1'|'foxy-image-original-v1';
  diagram:FoxyDiagram|null;
}
// Files public factory; authority is the durable capability implementation:
createFoxyPrivateAssetFiles({files, authority, inspector}): {
  receive(capability:object,payload:FoxyPrivateAssetPayload,signal:AbortSignal)
    :Promise<FoxyPrivateImageFacts>;
  recover(capability:object,signal:AbortSignal):Promise<FoxyPrivateImageFacts>;
};
```

`files` is the existing FileService instance; reuse storage/scanner through it. The production authority exposes `open(lease,signal)` -> scope{capability}, `authorize(capability,signal,tx?)` -> defensive persisted grant, `bind(capability,metadata,signal)` -> bound grant, `complete(capability,proof,signal)` and `reject(capability,code,signal)`, plus `close(scope)`. Its WeakMap capability is invalid after close/abort, cannot be fabricated from scalar IDs, and never crosses HTTP. authorize returns only the exact immutable asset descriptor, same input identity and live nonce; storage_key is an internal grant field only. bind/complete/reject each run short own transaction with a real repeatable authority check after locks; no object I/O inside SQL transactions. Metadata contains inspected facts/title/description/version/diagram, never arbitrary proof booleans from a public request.

A trusted claim repository acquires user -> source classroom -> conversation -> asset locks, verifies current verified teacher, owner+nondeleted conversation and source ownership/active classroom, then changes RESERVED to PROCESSING under a fresh nonce. Current conversation revision need not remain equal after reservation; unrelated chat messages do not change the immutable request snapshot. A future generation-job authority must also bind the original job/request/source fingerprint, and revalidate selected-source changes. V-A1b alone enables no write HTTP route and does not substitute for that generation authority.

Processing lease90s with renewal every30s and an absolute operation120s wall limit. Every renewal checks the same nonce and current authorization. Failure to renew aborts; shutdown stops new claims, aborts owned work, awaits bounded in-flight I/O/worker termination before shared storage closes. Existing storage normally bounds calls at10s and scanner supports at most30s; wrapper may discard late completion after abort but must await underlying bounded work on shutdown. One buffered custody operation per facade instance, no unbounded pending queue; additional concurrent invocation fails SERVICE_UNAVAILABLE. Multi-instance row claims fence mutation independently of this memory cap.

Before PUT: synchronous byte+metadata defensive snapshot; inspect actual bytes; validate kind/version/diagram fields and fixed diagram ratio dimensions from renderer; IMAGE diagram must be null. Bind inspected digest/size/MIME/dimensions and accepted text exactly once in the same live claim. A retry may bind only deep-equal metadata; changed bytes, title/diagram/version or dimensions CONFLICT. No trust in provider MIME, client hash or filename.

Extend S3Storage's key gate narrowly to the exact new Foxy namespace while keeping its P4 accepted namespace unchanged. The Files facade accepts no storage key argument; derive/check against owner/asset grant. Keep If-None-Match:* and one SDK attempt. On UPLOAD_CONFLICT, GET that exact key bounded by bound size and require exact digest/length; never overwrite or delete a conflicting object. Before each put/get/scan, reauthorize; after each await, check abort plus fresh authority before proceeding.

Then actual ClamAV scans the frozen byte snapshot; storage GET verifies stored length/digest against the same snapshot. If an existing object is recovered, inspect/scan those actual readback bytes rather than assuming previous in-memory work succeeded. Complete READY only after all facts, actual validation+scan and readback proofs match bound payload and current owner/context/nonce. Store validated/scanned digest/timestamps and charge actual bytes together in one transaction; clear lease and increment revision. No browser preview before that transaction.

Permanent malformed content -> REJECTED/INVALID_CONTENT; definitive malware -> REJECTED/INFECTED, retaining reservation. Storage/scanner exception or timeout leaves inaccessible bound PROCESSING for exact-byte recovery after lease expiry; never labels failure as clean. A binding or proof failure caused by stale/revoked authority makes no terminal mutation. A NEW provider request is never performed by this code.

## Crash and retry contract

| Crash point | Recovery |
|---|---|
| Before payload bind | RESERVED/PROCESSING remains private/reserved; original producer may retry identical bound command; no automatic provider dispatch |
| Bound metadata, before PUT | If caller still has bytes, exact-byte receive may continue; if missing, recover GET can only fail safely; it cannot regenerate bytes |
| PUT accepted, no response/DB finish | New claim after expiry reads known key, validates bound hash/length, reinspects/rescans, then completes; no new key/provider call |
| After scan, before proof transaction | Same recovery repeats checks; no READY assumption based on lost memory |
| READY committed, response lost | Authenticated descriptor/read returns durable success; byte receive may be an explicit verified no-op for exact payload only, never a new charge |
| Old expired worker resumes | Every mutation is nonce fenced; its only possible conditional PUT is the already-bound immutable bytes, never replacement; no old completion/proof accepted |

Physical asset deletion/quota release is deliberately not enabled in this custody unit. A stale PUT versus deletion needs stronger ordering than a process-local busy flag or merely marking a SQL tombstone. READY/private reads remain safe because digest+proof+authority are mandatory; all retained/uncertain bytes remain charged. V-A1b.4 must establish and prove distributed write/delete serialization before enabling removal/release. Do not report cleanup complete because a delayed-worker mock could not finalize SQL.

## V-A1b.3 — authorized private read, then separately cleanup

Next read service uses real Foxy UoW/session before and after GET, resolves asset through actual owner conversation/current source ownership, and accepts only READY with no discard/blob deletion plus all matching digest/proofs. Archived-source reads may remain available; generation/publication requires active source. Mode preview/download is an enum. It serves inspected allowlisted MIME and private no-store/nosniff/same-origin/sandbox headers, exact bounded length and digest; no key/provider URL/raw XML/metadata. Private bytes remain invisible to students and other teachers even after a separate classroom copy exists. No quota check blocks already-authorized reads.

Reading/custody do not publish material. V-P1 keeps explicit destination and confirmation; common typed source/artifact integration remains in the previous design. Private discard revokes read immediately, but destination Library copies preserve their own conservation policy. A future bounded cleanup uses durable operations/actual successful remove before one-time charge release and must solve late-writer races; do not use automatic expiration of READY assets.

## ESTRATEGIA_EQUIPO_Y_SUPUESTOS

Serial handoff: V-A1b.1 inspector -> V-A1b.2 SQL/authority/custody -> V-A1b.3 private read -> V-A1b.4 discard/cleanup -> typed publication. test_runner alone owns tests; worker owns new Files inspector/helper files and later new custody/authority modules, coordinator serializes barrel/Prisma/migration edits. Existing V-A1a implementation and diagram renderer retain their owners. Each cohesive source file<200lines where practical; split approximately<=400line review units instead of minifying tests. No whole-phase completion or roadmap write from this child.

## CRITERIOS_DE_TEST_DOT / RED

V-A1b.1 (dispatch now):

1. Actual still PNG alpha/palette and baseline/progressive JPEG return exact MIME/dimensions/size/hash; input mutation after call cannot change inspected bytes. No output bytes/raw EXIF leak.
2. Empty/oversize/malformed invocation; GIF/WebP/SVG/PDF and disguised extension/MIME; bad CRC/truncated encoded image; width/height/pixel/channel limits; animation/APNG chunks and multipicture JPEG/trailing codestream rejected. Container parser must not false-match marker-like compressed bytes.
3. Malformed/oversize/unknown worker result rejected; fake digest/size/MIME/dimensions cannot become facts. Worker error/exit/timeout/abort-before and abort-during terminate/drain once, no late result; injectable short timeout proves cleanup without15s wait.
4. One meaningful real decoded fixture for every allowed format; source worker never executes SVG/URL/path or logs native data. Strict API build and boundaries.

V-A1b.2 integration RED:

- PostgreSQL `_test` state/nonce/expiry/owner/context/verified/archived/deleted checks; first bind only PROCESSING live lease; no proof without matching descriptor/nonce; renew/reclaim races; changed metadata no overwrite; quota shrinks exactly once only on READY.
- Real owned S3/ClamAV plus synthetic PNG/JPEG: successful bind/put/scan/readback/READY; unavailable scanner/storage, invalid content and EICAR injected directly at scanner-port unit boundary. A generic nonimage EICAR rejection by parser alone does not prove actual image malware scanning.
- Crash/restart at each table point, same-key same/different bytes, uncertain PUT, stored replacement, revocation/discard between every external await; no provider redispatch or readable quarantined bytes. Multi-instance stale worker cannot finalize.
- Default storage P4 keys continue to pass and all prior traversal/foreign prefix cases fail; new prefix exact owner/asset only. No public storage key or model MIME accepted as proof.
- Shutdown while inspection/scan/PUT/GET in flight drains before shared storage close; concurrent rejected call does not enqueue/copy unbounded bytes. Unit mocks prove orchestration only; actual scanner/storage proof remains mandatory before capability enablement.

V-A1b.3/4 later: teacher-only private preview/read and post-I/O revocation; actual browser GENERAL/classroom/reload states; explicit discard/deletion crash recovery, stale delayed PUT versus cleanup and exactly-once quota release. No UI proof required for inspector-only cut; no visual-generation completeness from its passing tests.

## Verification, risks and handoff

This task inspected code and designed contracts only; no functional tests or external infrastructure operations were needed. Context7 Sharp0.35.5 official documentation succeeded. Biggest residual risk is write/delete concurrency: custody safely retains quota, deletion remains unimplemented until stronger distributed fence proof. V-A1a configuration wiring/generation budget/publication are not supplied by this design.

Memory writes were not attempted under unavailable runtime registration. No production files changed, credentials/private data read or provider request sent. Coordinator may dispatch V-A1b.1 RED immediately using the factory/signature/bounds/error contract above, after reconciling current barrel ownership. A Node filesystem structural check passed exit0:2local Markdown targets,0missing,0trailing-whitespace lines. The definitive inspector contract, worker protocol, error taxonomy and metadata-only response were sent directly to coordinator and test_runner. No commit was created by this design task.
