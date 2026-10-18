# P6 inherited proxy diagnostic — attributed read-only handoff

- Agent: /root/p6_readiness_verify; coordinator persisted this report without attributing source edits to the verifier.
- Phase: P6 T3; baseline 562650cbc22305ad050da75235755369aa2c9260.
- Scope: one bounded baseline/current diagnostic of the inherited proxy failure, no product repair or policy change.
- Status: diagnostic completed; original broad required command remains 42 PASS / 1 FAIL, not globally green.

## Observed evidence

The final Wall writer command failed in `tests/p5-web-proxy.test.mjs:42`, “unknown paths/queries/methods/schema/encoding and excessive JSON never reach upstream”, with fetch ECONNRESET and no identified vector. All other 42 checks passed. No timeout, transport or assertion relaxation was applied.

The read-only worker executed exactly once against each OS-temp baseline/current copy:

`node --test --test-concurrency=1 --test-name-pattern=^unknown paths/queries/methods/schema/encoding and excessive JSON never reach upstream$ tests/p5-web-proxy.test.mjs`

Both exited0 with 1 PASS, all seven rejection vectors including the 524289-byte request yielding413; stderr empty. Other tests were excluded, not claimed passed. Normalized baseline/current test and inherited body/rejection limits were identical. New Wall route/schema branches are not selected by those vectors. Diagnostic logging in scratch only would name and rethrow a failed vector; it never fired.

No defect or environmental root cause was established. The bounded diagnostic is exhausted, not a bug fix. Scoped proof consists of the other42 successful checks plus this successful targeted group; the historical broader failure remains visible. Fresh final independent verification must run the required shared group once against the final frozen candidate. No blind retries or speculative transport repair are justified.

Owned scratch: `C:/Users/alejo/AppData/Local/Temp/foxmind-p6-proxy-diagnostic-5N5XKJ`; retained under the existing cleanup restriction. Local fixture servers closed, child exit0, workspace hashes unchanged; no workspace, service, data, remote or native-review mutation by this worker.

Risk: none for this passive attributed record. Source acceptance and whole-phase closure remain the coordinator's responsibility.
