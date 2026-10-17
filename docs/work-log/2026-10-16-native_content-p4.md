# P4 native content / review-reliability

- Agent / role: /root/native_content; independent native reviewer, read-only.
- Session or task ID: /root/native_content; registered runtime session unavailable.
- Persisted by: P4 coordinator from the exact reviewer JSON; reviewer wrote no files.
- Date: 2026-10-16.
- Branch / worktree: codex/p4-private-files / C:/Users/alejo/.codex/worktrees/foxmind-p4-files/ProtipoFoxMind.
- Starting/final frozen implementation: 46611f2815f087487d675342769031382505ed0e.
- Phase: P4 / native acceptance unit content.
- Status: completed (bounded static native review); not integrated phase acceptance.

## Scope, evidence and outcome

Provider-issued immutable review-reliability context only; 4 changed paths and 273 lines against base tree 404a450fce1064c6643647fcc5838722a6657a8f. Entire candidate transferred in bounded reads; no working-tree evidence, test execution, build, other file reads or source writes after bootstrap. Subject: sha256:f8312f53fbd7e49f39cca094b34221a1e00bf688dffad3c79eab322cf8256d9d.

- Inspected: apps/api/src/files/content-worker.ts
- Inspected: apps/api/src/files/content.ts
- Inspected: tests/p4-content.test.mjs
- Inspected: tests/p4-fixtures.mjs

Native capture-result admitted the unchanged schema JSON; approved acknowledgement observed for lineage review-218fb275eab1b3a1. Target sha256:96ff058279255a33dd9e10ddcb82ae3835ee327f18fa10e0c13e5757d69aa9cf; consumed revision sha256:c61859d1b55e2f53f1153358fbd915921205e884c0a476b8a7a753e39b19ee53. No delivery/publication authority inferred.

- R3-content-text-rejection (WARNING): The macro check scans all XML text, including ordinary document text and metadata. A valid macro-free Office document containing the literal word macroEnabled or vbaProject is therefore rejected as FILE_REJECTED. Restrict these checks to package content types, relationships and executable parts so document prose does not determine acceptance. Evidence: apps/api/src/files/content-worker.ts:40-46 applies the case-insensitive macro-name expression to the entire decoded XML document.; apps/api/src/files/content-worker.ts:95-98 sends every XML and relationship entry through that check.; apps/api/src/files/content.ts:15-17 converts the resulting worker rejection into FILE_REJECTED.; tests/p4-content.test.mjs:37-42 covers actual macro filenames and XML entities but does not cover harmless document text containing either macro-name token.

## Handoff

Coordinator owns fixes, regressions and changed-candidate review; original warnings remain recorded and are not called resolved by approval alone.

Subsequent coordinator update: this warning was corrected in2ea8523 and independently inspected by /root/native_corrections. Its [approved native corrective record](2026-10-16-native_corrections-p4.md) closes the warning for that source; the original reviewer did not author or re-review the fix.
