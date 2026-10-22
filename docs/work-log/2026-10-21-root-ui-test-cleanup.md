# UI test-loader repair and owned cleanup

- Agent / role: /root, coordinator and test implementer.
- Session or task ID: registered session identity unavailable.
- Date: 2026-10-21 (client timezone).
- Branch / worktree: codex/foxmind-entry-glass, isolated glass worktree.
- Starting commit: c6a4c08c94040ca6b115ce8b4899d532fcc82a6f; prior presentation changes preserved uncommitted.
- Scope: repair the two inherited client-test loaders; clean the identified baseline scratch and auxiliary read-only QA runtime/cache; reverify without touching user data.
- Status: blocked only on policy-denied temporary deletion; repair and safe reverification completed.

## Request and boundaries

User explicitly requested fixing both inherited failures, completing pending cleanup without touching data, then reverification. Do not change application logic, backend, fixtures/databases, retained web/API/Mailpit resources, credentials, prior presentation work or unrelated files. No commit or publication requested. Preserve screenshot/QA evidence.

## Reproduction and plan

node --test tests/p6-wall-client.test.mjs tests/p9-home-client.test.mjs: exit1,3PASS2FAIL. Muro loader attempts to read extensionless dialog-focus; Home loader handles only .tsx and sends the .ts helper to native CommonJS resolution. One root class: inconsistent in-memory TypeScript module resolution. Consolidate these two loaders into one test-only helper, retaining original renderer/security assertions.

Owned pending cleanup is limited to the exact baseline scratch foxmind-platform-verify-baseline-12c67498b6e84eaa83137e38e7544f1a, its two dependency/artifact junctions, auxiliary QA server51930 and QA cache. Verify actual paths/process identity and remove junctions themselves before recursive scratch deletion. Never run original stop-request or retained-data cleanup. Previous combined cleanup rejection remains historical evidence; new explicit authorization permits a bounded retry, not a bypass if denied again.

## Verification

## Implemented repair

Added tests/helpers/load-ts-module.mjs and migrated only the two failing test loaders. One canonical per-load cache resolves explicit/extensionless .ts/.tsx source imports; each source uses its own native require for packages. Transpilation stays in memory. Original Muro escaping/removal, Home identity/content and navigation/security assertions are unchanged. No application logic or prior presentation source changed.

## Observed verification

- Targeted node --test tests/p6-wall-client.test.mjs tests/p9-home-client.test.mjs: RED3PASS2FAIL → GREEN5PASS0FAIL (645ms).
- Exact prior22-file UI client/proxy command from [independent verification](2026-10-21-platform-verify.md), with FOXMIND_WEB_TEST_ORIGIN blanked only in the child shell:84total,80PASS,0FAIL,4SKIP,exit0/10.503s. The four optional browser-origin tests remain omitted, not passed. No retained-data integration or root npm test invoked.
- npm --prefix apps/web run typecheck:exit0.
- npm run web:build:exit0, including strict TypeScript, optimized compilation and static-page generation. Stopped/restarted only verified replacement frontend through its own flag; original API host13880/listener51923 preserved. Final frontend owner35544/child2260 on51920. No original stop-request or fixture/database cleanup.
- git diff --check:exit0, existing line-ending warning only. Prior platform CSS/test hashes retained. Read-only browser smoke after rebuild confirms authenticated Inicio remains available; no account or academic writes performed. No commit/publication.

## Cleanup outcome and remaining blocker

- Re-inspected exact scratch directory and its two junction targets. User-authorized bounded native removal of junctions was rejected by tool policy before execution. No alternate API/shell/deletion method or further removal attempted. Scratch and QA cache deletion remain pending, not completed.
- Verified QA PID31128 command line and its exact51930 listener, then Stop-Process -Id31128 succeeded.51930 is no longer listening. Actual web51920 and API51923 remain running. This was a separate process-stop operation, not an alternative filesystem-deletion attempt.
- Still retained: C:/Users/alejo/AppData/Local/Temp/foxmind-platform-verify-baseline-12c67498b6e84eaa83137e38e7544f1a, with node_modules and .build junctions to real worktree dependencies/artifacts. Never recursively traverse those targets. Owned QA cache remains under the external platform-ui/qa/.vite-cache directory; source and screenshots preserved as evidence.
- No user data or retained service volume was read, altered or removed by cleanup. Manual or policy-authorized removal is the only remaining cleanup action; do not claim complete cleanup until observed.

## Commits and handoff

None. Code repair and data-preserving reverification are finished; only temporary filesystem cleanup remains policy-blocked. Historical failure/cleanup records remain attributed rather than rewritten as prior passes. No application source changes were needed for these test-harness defects.
