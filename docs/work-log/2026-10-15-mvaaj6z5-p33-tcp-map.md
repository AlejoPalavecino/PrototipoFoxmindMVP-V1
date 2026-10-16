# P3.3 D1 — Read-only TCP-reset diagnostic mapping

- Agent / role: gentle-ai-verify, diagnostic mapping only.
- Actual task ID supplied by parent runtime: `mvaaj6z5-q-puf3`; child reported its ID unavailable.
- Parent/session: el Gentleman / `01a13fc3-5dac-75fc-a82f-71fe21722f18`.
- Date: 2026-10-15.
- Spec: [P3.3 T2 D1 / S1–S7, L11](../../odd/tasks/p33-accounts-auth.md).
- Status: `partial`; no invocation, write, product verification or capture-budget consumption.

## Attributed final report (verbatim)

## PARTIAL — diagnostic mapping only

**Cause/path:line: unproven. Original failing request: unknown. Capture budget: UNUSED.**

Read the whole feature, including actual **L11**, and named source/evidence. No commands, invocations, writes, Git, dependency operations or native review actions performed. Structural preflight was unavailable under these restrictions; no CodeGraph initialization/fallback attempted. Parent must persist this attributed report; runtime task ID unavailable.

### Source sequence and timers

- The last main-app requests before startup checks are **successful login, then rejected login**: `tests/p33-identity-http.test.mjs:242–243`. The success checks status without consuming its body; the rejection consumes its envelope.
- Eight synchronous startup children follow (`:245–258`, each timeout1500ms), then a separate secure-app login (`:260–263`), Docker pause and four sequential outage calls (`:303–324`). Fetch timeout remains4000ms (`:42–45`).
- Anonymous session/login requests encounter SQL-backed **general admission before route-specific work**, including before login body parsing: `apps/api/src/identity/transport.ts:60–71`; `runtime.ts:22–26`.
- Transaction failures map to sanitized503: `identity/persistence.ts:19–21`; transport responds through `request.resume()` and JSON (`transport.ts:88–92`). This inspected path does not explicitly destroy the HTTP socket; that **does not exclude another server fault**.
- Prisma specifies connection/query/statement timeouts1000ms (`database/prisma.service.ts:11–12`); transactions specify maxWait1500ms/timeout2500ms (`identity/persistence.ts:20`). These are different boundaries, not additive guarantees.
- Liveness performs no SQL; readiness catches failed ping and returns503 (`health/health.controller.ts:10–21`).
- Previous capture observed keepAliveTimeout5000ms, buffer1000ms, requestTimeout300000ms—not newly verified defaults (`.test-artifacts/p33-d1-outage-diagnose.stdout.log:1`).

### Existing evidence remains separate

| Evidence | Observed content |
|---|---|
| Parent stdout `p33-d1-parent-http.stdout.log:21–46` | 20pass/1fail; fetch/read ECONNRESET; cleanup0; runner1/15810ms. No request identification. |
| Diagnostic stdout `p33-d1-outage-diagnose.stdout.log:25–57` | Session socket reused after5117ms; requests received and finished503/503/200/503; normal control200; no captured reset. |
| Targeted stdout `p33-d1-outage-recheck.stdout.log:3–28` | Same four statuses; 2pass/0fail. Result file records exit0/8257ms. |

Corresponding stderr files read as empty. Historical diagnostic driver exit0/cleanup0 is reported in the prior attributed work record, not independently rerun here.

### Material gaps in earlier capture

1. **Different precursor:** prior probe primes two concurrent anonymous sessions and consumes both bodies (`p33-d1-outage-probe.mjs:71–75`), unlike the actual final login sequence/body-consumption behavior at test`:242–243`.
2. **No TCP pairing:** client/server sockets receive independent IDs (`probe:14–16,24–43`). Equal numbers do not establish matching connections. Current test instrumentation likewise uses separate socket objects (`test:271–286`).
3. **Mutable phase attribution:** delayed errors/closes inherit whichever global phase is current (`probe:17–18`); request identity is assigned only at sendHeaders (`:29`). Pre-send failures can lack request attribution.
4. **Incomplete boundaries:** no server parser/clientError observation or complete request-abort/socket-error chain. Existing request observers attach after application creation.
5. **Timing distortion:** synchronous per-event console output and wall-clock `Date.now()` (`probe:12,17`); `idleMs` measures time since prior **send**, not response completion.
6. A client `close(hadError=true)` alone is insufficient: it also appears during successful control/shutdown (`diagnose.stdout.log:59–60`).

### Proposed materially distinct single capture — NOT RUN

A permitted worker could create one private entrypoint under `.test-artifacts/p33-d1-trace2-*/`:

- Use the existing owned-PG/compiler helpers; no generation/dependencies/environment-file loading. Missing generated prerequisites means **block**, not repair.
- Reproduce only the source-faithful suffix: arrangement-only user seeding; successful main-app login with its original body-consumption behavior; rejected login; existing eight startup checks; secure-app login; pause; four original outage assertions; finally-unpause and cleanup. No full suite, artificial waits, retries or forced faults.
- Assign immutable constant operation IDs at fetch creation; associate Undici request objects immediately. Record send, headers/body completion or sanitized failure separately.
- Pair client/server TCP endpoints **in RAM**, including connection generations; persist only opaque pair/request IDs and per-connection request order—never endpoint values.
- Buffer a bounded primitive-event ring using monotonic timestamps and sequence numbers. Flush after capture, with an explicit dropped-event count. Incomplete/dropped evidence cannot prove absence.

**Default-preservation requirement:** observe server `request`, `timeout`, `clientError` and socket/request/response emissions through narrowly scoped transparent call-through wrappers—not added timeout/clientError/error listeners. Call the original emitter with identical receiver/arguments and preserve its exact return value, listener counts and thrown behavior. Never swallow original exceptions, consume streams, alter policies or destroy sockets. Restore wrappers during teardown. Recorder failures must not alter application control flow.

Such wrappers still add overhead and change method identity; disclose that limitation. Validate preservation by inspection before spending the single invocation.

**Interpretation:** matched server receive/error/finish/close events can localize a new failure. `sendHeaders` alone does not prove peer receipt; missing server receive alone does not prove stale reuse. Even a diagnosed new reset cannot automatically establish the original occurrence’s cause.

No repair proposed or applied. Next action: parent routes this design to a permitted artifact worker for the sole ≤30second capture, then stops regardless of reproduction. **No D1 signoff or S1–S7 product-pass claim.**

## Parent disposition

Report persisted without converting partial to approval. No capture was consumed; following worker may author and invoke only the already-authorized private diagnostic. No production/test-policy changes, full-suite repetition or verification escalation authorized by this report. Original failed parent seam and later passing controls remain distinct evidence.
