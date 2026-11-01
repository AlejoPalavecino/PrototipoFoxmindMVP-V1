# Foxy bounded-fetch abort — circuit-breaker diagnosis

- Agent / role: /root/architect_next / architect.
- Session ID: unavailable; actual task identity /root/architect_next.
- Date: 2026-11-01.
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai.
- Starting commit observed: fabb2ac.
- Phase/spec: V-I1a; [provider contract](2026-11-01-architect-image-provider-budget.md).
- Status: completed (diagnosis/design only; source fix not applied by architect).
- ESTADO_DISENO: LISTO_PARA_TDD_RED for the existing regression plus abort-edge checks.

## Request and scope

Diagnose two repeated failures of stalled-stream abort and define one systemic repair before another implementation attempt. Inspect only the current wrapper/tests and controlled synthetic reproduction. Write this attributed record only; preserve concurrent workers' code, tests and records. No production/test edits, provider/network call, credentials, private data or database.

## Evidence inspected

Current wrapper races reader.read against an abort rejection, cancels reader on abort and returns on done without rechecking signal. It also returns a null-body response without an abort check. Coordinator/test_runner reported Missing expected rejection at the stalled-stream test. Fresh reproduction confirmed it unchanged; root class C, cancellation-versus-success handoff race (one systemic fix, not separate EOF/headers patches).

## Exact cause and event sequence

1. baseFetch resolves its Response; the response race can already have selected it while the async continuation has not entered consume.
2. Caller aborts. The earlier headers abort race no longer guarantees rejection after its successful resolution.
3. consume starts with an already-aborted signal. Its Promise constructor rejects `aborted` and cancels reader, synchronously closing its read state.
4. The later `Promise.race([reader.read(),aborted])` receives two already-settled promises. reader.read is already fulfilled with done:true and appears first, so its race reaction can win.
5. consume treats this canceled EOF as successful completion and returns an empty Response. Reject-before-cancel inside the earlier event handler cannot change the order in which these already-settled promises are later observed by the newly constructed race.

The race result is a wake-up mechanism, not proof that the operation remained authorized to succeed. The authoritative final fact is signal.aborted at the success boundary. Switching race-array/cancel/reject order alone leaves other abort handoffs (including null body and late headers) uncovered.

## Correction sequence — no production edits here

Keep the existing16MiB actual-byte cap, one request, redirect prohibition, fixed sanitized error and controlled stream cleanup. No new public API/state/flag is needed.

1. Before calling baseFetch, reject a pre-aborted effective signal; do not dispatch at all. Register abort/deadline ownership before waiting for headers.
2. Immediately after the headers await/race, check the effective signal again; if canceled, cancel the obtained body and reject. Late obtained responses remain owned and canceled through the existing pending.then cleanup.
3. On entry to consume check signal before any success path, especially response.body===null. A canceled existing body must be canceled/cleaned up, never leaked.
4. Around the reader loop, check active signal before read and **immediately after every awaited race**, before inspecting item.done or appending chunks. Canceled EOF must throw the fixed error.
5. Recheck signal before constructing/returning the successful buffered Response. A later abort after the complete Response was already handed off need not retroactively revoke that returned promise; success is allowed only if active at handoff.
6. Cleanup removes listeners/timer, cancels the owned reader/body on failures, and releases reader lock. Ensure any eagerly rejected abort promise always has a rejection observer if an early guard can throw before its race is attached; do not introduce unhandled-rejection failures while adding checks. Cancellation cleanup must not replace the primary abort/limit error.

Do not loosen the existing stalled-stream test, turn cancel into successful EOF, add a retry, drop overflow rejection or change timeout merely to satisfy fixture ordering. The minimal implementation is a small shared abort assertion used at these existing awaited/success boundaries.

## RED and GREEN evidence required

- Existing `aborting a stalled stream cancels it and rejects without a second request` must reject, call baseFetch once and invoke the underlying stream cancellation.
- Pre-aborted input signal causes zero fetch calls; aborted Request.signal is covered when init.signal is absent.
- Controlled headers-resolved/consume-not-started abort, simultaneous EOF/abort and null-body abort all reject. A normally completed empty/short body still succeeds.
- Headers pending and late-response cases preserve one call and cancellation without unhandled rejection. Error/cancel cleanup does not mask the primary fixed error.
- Full existing seven transport tests, parser/quote tests, strict build/boundaries and installed SDK synthetic fetch seam remain unchanged. No real SDK/provider dispatch is required for this race.

## Observed verification

`node --experimental-transform-types --test --test-reporter=spec --test-name-pattern='aborting a stalled stream' apps/api/src/ai/foxy-image-bounded-fetch.test.mjs`: exit1;1test/0pass/1fail, Missing expected rejection at line31, about46ms. This is fresh failure proof, not a claim of fixed behavior.

A controlled inline Node ReadableStream reproduction uses an already-aborted signal, rejects abort promise, cancels reader, then races read-first as production does. Without a post-read signal guard it fulfills done:true; with the guard it rejects, both invoking cancellation. This proves the ordering mechanism without editing source/test files or making network calls. The production repair still requires worker/test_runner verification; its successful tests are not attributed to architect.

## Handoff

Diagnosis and exact boundary guards were sent to coordinator and test_runner. Worker may make one coherent abort-handoff correction then run named regression/full focused suite; do not continue blind reorder attempts. Factory file paths remain `apps/api/src/ai/foxy-image-bounded-fetch.ts` and `foxy-image-budget.ts`, as confirmed to test_runner. No production changes or commit by architect. Structural validation follows after execution.
