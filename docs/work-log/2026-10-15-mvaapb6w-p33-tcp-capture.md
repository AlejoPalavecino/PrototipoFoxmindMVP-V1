# P3.3 T2 D1 — sole correlated observational capture

- Writer/task: package implementation writer, actual task `mvaapb6w-r-blf6`.
- Starting branch/commit: `feat/p33-identity-http`, `37ab57911c6f4cab1b3559b6394adbbbfc7684e5`.
- Date: 2026-10-15. Scope: private diagnostic artifacts only, S1–S7/L11 context, not product implementation or acceptance.
- Authorization supplied by parent: verbatim `autorizo`, one additional bounded investigation. Existing dirty product/docs/tests remain readonly. Parent persists attributed repository record.
- Design implemented by reference: `docs/work-log/2026-10-15-mvaaj6z5-p33-tcp-map.md`, whole feature read. No mapper replay, CodeGraph initialization, environment-file reads, dependency changes or production repair.
- Strict TDD not activated; no pre/post Node validation runs authorized. Syntax/type/default-preservation checks are inspection only.

## Pre-invocation static inspection

- Source suffix: tests `:242–263`, outage `:303–324`. Arrange original three users and two password hashes, seed Race with already-replaced password; no prior HTTP traffic. Successful Race login's body stays unconsumed; rejected login consumes original sanitized error envelope. All eight original synchronous startup scenarios preserve exact child args/env handling/1500ms timeout/assertions. Separate secure app login stays unconsumed. Pause then original four status/body/security assertions, finally unpause. No retries, priming, artificial waits, policy/timeout changes or full suite.
- `send` uses the source's default global fetch, original body/headers and AbortSignal.timeout(4000). No dispatcher/pool/keepalive modifications. Frozen operation IDs exist before fetch; AsyncLocalStorage associates Undici request:create before sendHeaders. Each request identity is frozen. Missing association sets observerFault; it cannot establish absence.
- Pairing uses client local/remote endpoint tuple versus reversed server tuple IN RAM. Fresh pair instances handle tuple generations. Only opaque pair/socket/request IDs and per-pair order persist. Server/client request order joins are explicit; no identity inferred from equal independently assigned numbers. Delayed socket events contain socket/pair, not a mutable phase/current operation.
- Narrow per-object emit wrappers observe server connection/request/timeout/clientError/error plus socket/request/response events. They add ZERO EventEmitter listeners. Each invokes original via Reflect.apply(original, this, args) outside observer catch and returns exactly its result. Original exceptions are neither swallowed nor replaced. Original argument objects and receiver pass unchanged. Default timeout/clientError/error listener counts are unmodified; parser defaults still see zero added clientError listeners. Exact original own descriptor or inheritance is restored during teardown. Own observer exceptions set observerFault only.
- Diagnostics subscribers observe create/send/bodySent/headers/trailers/error and connection events; no body reading added. Existing source response consumption only. Bounded primitive events (4096 cap, monotonic microseconds/sequence) flush once after app/DB-client teardown; explicit drop/fault summary. No event args, errors/messages, URLs, headers, payloads, credentials or endpoint tuples serialized.
- Generated prerequisite `.generated/prisma/client.ts` was read and exists (actual generator location). An earlier narrow search at `node_modules/.prisma/client` returned not-a-directory; no generation or execution occurred. Driver also checks actual client/internal class presence before helper work.
- Driver uses unchanged `withIdentityDatabase` and `compileIdentityApi`: cached image, fresh owned PostgreSQL/tmpfs/migrations; helper's existing 26s deadline, bounded child and owned cleanup. Compiler writes only `.build/api/**`. No own repository work record authorized.

## Sole invocation — CONSUMED

`node .test-artifacts/p33-d1-trace2-mvaapb6w-r-blf6/driver.mjs > .test-artifacts/p33-d1-trace2-mvaapb6w-r-blf6/stdout.log 2> .test-artifacts/p33-d1-trace2-mvaapb6w-r-blf6/stderr.log`

Foreground tool limit: 30 seconds. Observed driver exit0/child exit0, no signal/timeout, elapsed12391ms (`result.json:1`). Compiler exit0 (`stdout.log:1`); owned database cleanup exit0 (`stdout.log:150`); stderr empty. Capture budget CONSUMED. No other Node/test command executed before or after this invocation. No second invocation, repairs or extra checks will be performed.

## Observed chronological sanitized evidence

Times below are monotonic seconds from child recorder initialization; event numbers are `n` in stdout (file line = n+1).

| Time / events | Observation |
|---|---|
|0.212 /1|Main server reports keepAlive5000ms, buffer1000ms, request300000ms, headers60000ms, timeout0; timeout/clientError/error listeners each0. Secure server later reports the same (/49).|
|0.221–0.373 /2–18|op01 successful main login, cr1/sr1 paired via p1 (client s2/server s1), order1; received, server finished200, client transport body completed, assertion passed. Application body remained unconsumed.|
|0.373–0.406 /19–35|op02 rejected main login, cr2/sr2 paired p2 (s4/s3), order1; received, finished401, client body complete; original error-envelope assertions consumed body and passed.|
|0.962–4.743 /36–43|All eight original synchronous startup child checks passed, each original exit/stdout/stderr asserted.|
|4.754–4.756 /44–48|Completed op01 connection p1: client socket-error OTHER, peer server end/finish/close(false), client close(true). This is not an identified ECONNRESET or failed request; no cause/message was retained.|
|4.772–4.825 /50–66|op03 separate secure login, cr3/sr3 paired p3 (s6/s5), received and finished200; cookie assertion passed, application body unconsumed.|
|4.825–4.906 /67–68|Owned database pause completed.|
|4.906–5.928 /69–85|op04 outage session: NEW p4 (s8/s7), cr4/sr4 order1. Client send4.907790, server receive4.908107, server finish503 at5.926548, client headers/body complete5.927027/5.927173. Original error-envelope assertions passed.|
|5.928–6.938 /86–99|op05 outage login: REUSED p2 (s4/s3), cr5/sr5 order2. Send5.929136, server receive5.929749, server finish503 at6.937457, client body complete6.937871; original assertions passed. Prior p2 client transport completion was0.404487: reuse after5.524649s, measured completion-to-send (not a causal claim).|
|6.938–6.954 /100–113|op06 liveness on p4 order2, cr6/sr6: server received, finished200, client body complete; original no-store/body assertions passed.|
|6.954–7.977 /114–132|op07 readiness on p2 order3, cr7/sr7: received6.966715, finished503 at7.976686, client body complete7.976953; original no-store/body assertions passed. During this call, already-completed secure connection p3 closed with client OTHER/close(true), server close(false) (/120–124), not an active-request reset.|
|7.977–8.039 /133–134|Unpause completed.|
|8.042–8.048 /135–147|Both applications and fixture SQL client closed. Completed p2/p4 client sockets emitted UND_ERR_SOCKET and close(true) only after app shutdown; no request-error/fetch-error was recorded. These are not original-failure evidence.|

`stdout.log:149`: 147 buffered events, dropped0, observerFault=false, 24 wrappers restored via teardown path; child exit0. Every one of the seven operations has an early request:create identity, matched TCP endpoints, per-connection request order and server receive/finish plus client body-completion evidence. No unmapped/unassociated event occurred. No server timeout/clientError/error/request-abort or active-request error was recorded in this capture. This describes this capture only, not historical absence.

## Causal interpretation — partial, not signoff

**Original cause/path:line remains UNPROVEN. Original failed request remains UNKNOWN. No ECONNRESET reproduced; none of op04–op07 failed.** The fresh capture identifies successful wire requests only. It cannot decide whether the original reset arose from a stale pool connection, parser/socket/server failure, client timer or another source. No production repair is justified by this result and none is proposed/applied.

- Observed wire path: op04/cr4 → p4/order1 → sr4 → finish503 → client503; op05/cr5 → p2/order2 → sr5 → finish503 → client503. This is directly supported by paired events above, not by matching coincidental socket numbers.
- Inspected source path (not an executed internal stack trace): `apps/api/src/identity/transport.ts:60–71` performs general admission before route-specific/body work; `runtime.ts:22–26` delegates to SQL admission; `persistence.ts:19–21` maps failed transactions to SERVICE_UNAVAILABLE; `transport.ts:88–92` resumes request and writes sanitized response. The ~1s delays agree with configured database limits at `database/prisma.service.ts:11–12`, but the recorder does not trace SQL internals or establish the exact rejection origin. This explains a plausible/inspected503 path, **not ECONNRESET**.
- Health source: `health/health.controller.ts:10–11` performs no SQL for liveness; `:16–21` catches failed readiness ping. Wire200/503 is observed; exact underlying driver exception was intentionally not captured.
- Instrumentation references: `capture.mjs:60–90` pairs endpoint tuples/generations only in RAM; `:148–155` associates immutable request identity at request:create; `:203–208` retains source fetch defaults; `:248–269` implements precursor/startup/secure sequence; `:272–290` retains pause/four assertions/finally unpause. `:46` is uncaught original emit call-through; `:308` restores original descriptors. No listener addition or timeout/policy write exists.
- All source-faithful diagnostic assertions passed, not the full21 suite or independent product verification. Earlier parent20/21 ECONNRESET and later targeted2/2pass remain separate historical facts. No D1/S1–S7 product PASS, native HTTP approval or P3.3 completion.

## Handoff

Status `partial`: artifacts and sole bounded capture delivered; original-cause objective not achieved. Parent must persist this task-attributed report and report missing causal proof, with capture budget exhausted. No automatic next probe, full suite, adversarial sweep, generic-error reinterpretation or production fix is authorized. Private files: `capture.mjs`, `driver.mjs`, `report.md`, `stdout.log`, empty `stderr.log`, `result.json` under this directory; API compile outputs only under `.build/api/**`. Repository records/product/tests/helpers unchanged by writer.

## Limits

Method identity and timing overhead necessarily change; synchronous startup children block event-loop delivery as in source. This is the mapper-authorized suffix, not a reproduction of all earlier sessions/counters/pool history. Missing/dropped/faulted evidence cannot prove absence. Even a new localized reset does not establish the historical parent reset's cause. No D1/S1–S7 PASS, independent/native approval or P3.3 completion is implied.


## Parent disposition after readback

Primary coordinator read the actual report, result.json and empty stderr. Driver/child exit0, compiler0, owned cleanup0,12391ms,147events/dropped0/observerFaultfalse are observed capture evidence only. The single authorized capture is consumed; the original failing request and ECONNRESET cause remain unknown. No repair or additional execution is justified by this capture. D1 acceptance remains blocked, T2 not complete, D2/T3 pending. Human disposition is required before changing this investigation's scope; no automatic new probe, full-suite repeat or speculative production edit. This is not full independent verification or native review approval.
