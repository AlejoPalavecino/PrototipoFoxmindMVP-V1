# P4 native http / review-reliability

- Agent / role: /root/native_http; independent native reviewer, read-only.
- Session or task ID: /root/native_http; registered runtime session unavailable.
- Persisted by: P4 coordinator from the exact reviewer JSON; reviewer wrote no files.
- Date: 2026-10-16.
- Branch / worktree: codex/p4-private-files / C:/Users/alejo/.codex/worktrees/foxmind-p4-files/ProtipoFoxMind.
- Starting/final frozen implementation: 46611f2815f087487d675342769031382505ed0e.
- Phase: P4 / native acceptance unit http.
- Status: completed (bounded static native review); not integrated phase acceptance.

## Scope, evidence and outcome

Provider-issued immutable review-reliability context only; 4 changed paths and 207 lines against base tree c97c30a1984e31037055af15f0375e04d6de2050. Entire candidate transferred in bounded reads; no working-tree evidence, test execution, build, other file reads or source writes after bootstrap. Subject: sha256:49ab724e9916bf786166670feef4aa7adea083d458ad26ec54d5fe8fcfd6f1d6.

- Inspected: apps/api/src/files/http.ts
- Inspected: apps/api/src/files/index.ts
- Inspected: docs/api/files.md
- Inspected: tests/p4-http-output.test.mjs

Native capture-result admitted the unchanged schema JSON; approved acknowledgement observed for lineage review-2d494b7607646780. Target sha256:4e280641b7c94ea723648c9c1cac8f653b545b06fc92d030efe916cfcca95bc0; consumed revision sha256:5bfc11ab6d85cabff5c3646f5c510058fdda9192baf9cb5ebbe3acfdc2fe2b6f. No delivery/publication authority inferred.

- R3-early-response-close (WARNING): A client disconnect during the awaited service.read is missed because response close/error listeners are installed only afterward. When the read resolves, ending an already destroyed response does not replay its earlier close event, so the shared transfer slot remains occupied until the additional 30-second send timeout. Subsequent uploads and downloads receive 503 despite the disconnected response having no delivery work left. Check response.destroyed after the read and before sending, and cover a disconnect while read is pending. Evidence: apps/api/src/files/http.ts:42-53; apps/api/src/files/http.ts:105-109; apps/api/src/files/http.ts:120; tests/p4-http-output.test.mjs:16-29

## Handoff

Coordinator owns fixes, regressions and changed-candidate review; original warnings remain recorded and are not called resolved by approval alone.

Subsequent coordinator update: this warning was corrected in2ea8523 and independently inspected by /root/native_corrections. Its [approved native corrective record](2026-10-16-native_corrections-p4.md) closes the warning for that source; the original reviewer did not author or re-review the fix.
