# P4 native local-runtime / review-reliability

- Agent / role: /root/native_runtime_reliability; independent native reviewer, read-only.
- Session or task ID: /root/native_runtime_reliability; registered runtime session unavailable.
- Persisted by: P4 coordinator from the exact reviewer JSON; reviewer wrote no files.
- Date: 2026-10-16.
- Branch / worktree: codex/p4-private-files / C:/Users/alejo/.codex/worktrees/foxmind-p4-files/ProtipoFoxMind.
- Starting/final frozen implementation: 46611f2815f087487d675342769031382505ed0e.
- Phase: P4 / native acceptance unit local-runtime.
- Status: completed (bounded static native review); not integrated phase acceptance.

## Scope, evidence and outcome

Provider-issued immutable review-reliability context only; 7 changed paths and 342 lines against base tree 1fe63a148dedd5fc4ca090ee646767fad4801f86. Entire candidate transferred in bounded reads; no working-tree evidence, test execution, build, other file reads or source writes after bootstrap. Subject: sha256:ee5c53a07c82ba09064bd1046b86bc499eea35164334914a8cfefa35e72b73d4.

- Inspected: .gitignore
- Inspected: compose.p4.yaml
- Inspected: config/p4-clamd.conf
- Inspected: scripts/p4-local.mjs
- Inspected: scripts/p4-services.mjs
- Inspected: scripts/test-p4.mjs
- Inspected: tests/p4-persistence.test.mjs

Native capture-result admitted the unchanged schema JSON; approved acknowledgement observed for lineage review-b60abc5239c7bbeb. Target sha256:6c2596af0764c3ca490e744ff6933e0d34a2c89849ed64e5902d1158ce98335e; consumed revision sha256:8a813f6b417b107fafc583f6d24b3795ed1d3e2a7e39c90d07d1f987a02ec00f. No delivery/publication authority inferred.

- R3-stale-fixture-signatures (WARNING): The isolated scanner bypasses the image entrypoint and starts only clamd, while its configuration rejects databases older than seven days. Because the image digest is fixed and this fixture never runs freshclam, its bundled signatures inevitably become unacceptable and otherwise unchanged service tests fail readiness. Refresh signatures through an owned fixture resource or provide an explicit reproducible signature provisioning step. Evidence: scripts/p4-services.mjs:12 pins the scanner image digest.; scripts/p4-services.mjs:29 enables FailIfCvdOlderThan 7.; scripts/p4-services.mjs:53-55 starts clamd directly without a signature updater.; scripts/p4-services.mjs:79 rejects the fixture when scanner readiness is unavailable.
- R3-independent-probe-cleanup (WARNING): A database cleanup failure skips deletion of the independently owned storage object. For example, if PostgreSQL remains unavailable after restart while storage recovers, the readiness assertion fails, reconnecting during table cleanup throws, and the object removal is never attempted before services stop. Attempt both cleanup operations independently and preserve their failures so an available storage service can still release its probe. Evidence: tests/p4-persistence.test.mjs:25 creates the owned storage object.; tests/p4-persistence.test.mjs:27-32 permits a failed restart-readiness outcome.; tests/p4-persistence.test.mjs:38-40 places object deletion after the potentially throwing database cleanup in the same try block.

## Handoff

Coordinator owns fixes, regressions and changed-candidate review; original warnings remain recorded and are not called resolved by approval alone.
