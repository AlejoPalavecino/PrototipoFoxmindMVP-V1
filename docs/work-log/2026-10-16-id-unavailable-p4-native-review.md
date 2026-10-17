# P4 native review — baseline approved, corrections in progress

- Agent / role: P4 coordinator, native orchestration and fix writer.
- Session or task ID: unavailable; not invented.
- Date: 2026-10-16.
- Branch / worktree: codex/p4-private-files / C:/Users/alejo/.codex/worktrees/foxmind-p4-files/ProtipoFoxMind.
- Starting candidate: 46611f2815f087487d675342769031382505ed0e.
- Phase: P4-E, following odd/tasks/p4-private-files.md.
- Status: in_progress.

## Request and native scope

User requested the native review of P4 and previously authorized independent read-only agents. Full48-path/4002-line START failed with lens_context_budget_exceeded before creating authority. One path-based decomposition restores each unit baseline into an isolated temporary Git index/base tree while keeping the exact final frozen candidate unchanged; native manifests cover each of48paths exactly once. No original branch/history was rewritten or evidence truncated. Native admitted each reduced scope. Upload454 authored lines and generated dependency1326 lines are the best cohesive one-pass split; recommend size:exception before any later publication, no publication requested here.

## Observed native dispositions

| Unit | Paths / lines | Tier / lenses | Lineage | Result |
|---|---|---|---|---|
| policy | 4 / 182 | medium / 1 | review-76b7729a6c016a75 | acknowledged |
| adapters | 5 / 252 | medium / 1 | review-2beaa9ab1b661687 | acknowledged |
| content | 4 / 273 | medium / 1 | review-218fb275eab1b3a1 | acknowledged |
| record-access | 7 / 357 | medium / 1 | review-2e36f6f0cf257225 | acknowledged |
| upload | 2 / 454 | medium / 1 | review-e452ad977ecfb1dc | acknowledged |
| custody-lifecycle | 6 / 240 | medium / 1 | review-4e0d11904af71028 | acknowledged |
| http | 4 / 207 | medium / 1 | review-2d494b7607646780 | acknowledged |
| local-runtime | 7 / 342 | high / 4 | review-b60abc5239c7bbeb | acknowledged |
| dependencies | 2 / 1326 | medium / 1 | review-92c5e9c8fac8533a | acknowledged |
| evidence | 7 / 369 | low / 0 | review-d15a39a405990147 | acknowledged |

All ten approved acknowledgements were observed against the frozen46611f2 tree. Eight medium units each used the selected reliability lens; high local-runtime used risk/resilience/readability/reliability; low documentation evidence closed through native low-risk verification with no reviewer lens. Twelve fresh reviewers inspected only complete provider-produced immutable contexts and returned exact schema JSON; coordinator admitted those raw JSON objects through capture-result and consumed the exact acknowledge-approved transitions. No surrogate session ID or memory writes.

## Attributed reviewer records

- [native_policy: policy/review-reliability](2026-10-16-native_policy-p4.md)
- [native_adapters: adapters/review-reliability](2026-10-16-native_adapters-p4.md)
- [native_content: content/review-reliability](2026-10-16-native_content-p4.md)
- [native_record_access: record-access/review-reliability](2026-10-16-native_record_access-p4.md)
- [native_upload: upload/review-reliability](2026-10-16-native_upload-p4.md)
- [native_custody: custody-lifecycle/review-reliability](2026-10-16-native_custody-p4.md)
- [native_http: http/review-reliability](2026-10-16-native_http-p4.md)
- [native_runtime_risk: local-runtime/review-risk](2026-10-16-native_runtime_risk-p4.md)
- [native_runtime_resilience: local-runtime/review-resilience](2026-10-16-native_runtime_resilience-p4.md)
- [native_runtime_readability: local-runtime/review-readability](2026-10-16-native_runtime_readability-p4.md)
- [native_runtime_reliability: local-runtime/review-reliability](2026-10-16-native_runtime_reliability-p4.md)
- [native_dependencies: dependencies/review-reliability](2026-10-16-native_dependencies-p4.md)

## Findings and current corrective unit

No BLOCKER/CRITICAL findings; four WARNING findings remain explicit until correction re-review: R3-content-text-rejection, R3-early-response-close, R3-stale-fixture-signatures and R3-independent-probe-cleanup. Native approval did not erase warnings. Coordinator is adding meaningful regressions/fixes for each, then freezes a separate corrected candidate for native review.

Observed initial corrective RED: parser/HTTP8PASS2FAIL (harmless prose rejected; closed response retained slot); cleanup/scanner startup2PASS3FAIL (first cleanup failure skipped object; second failure lost; stale fixture lacked update). Parser/HTTP focused GREEN10PASS and cleanup/scanner5PASS after correction. Scanner startup tests use contained substitute commands to prove update/expiry control flow, not aged real CVD proof. Full real PostgreSQL/S3/ClamAV + persistent runner is in progress.

Corrected-candidate full `node scripts/test-p4.mjs --persistent` now exit0: strict build0, component/lifecycle/output/cleanup/startup40PASS, actual service27PASS, persistent restart1PASS =68checks. Exact six migrations/drift0, disposable owned cleanup0 and persistent stop0. Signature update is attempted with bounded connect/receive/retry settings; unavailable update never disables ClamAV's seven-day freshness guard. An offline scanner can start only if its existing database still satisfies that guard. The independent cleanup helper reports both failed stages with sanitized messages. No unrelated source/dependency change.

## Boundaries and exact handoff

P3 source and integration remain untouched; no push/merge/PR/deployment. Functional61PASS at46611f2 remains prior evidence, separate from native static proof. Complete corrected-candidate runner, record actual failures/outcomes, commit reviewable corrective code with tests, and obtain native disposition for those changed paths. Native result files/context/capability tokens stay in ignored local runtime storage; logs preserve hashes and lineages, no acknowledgement tokens.
