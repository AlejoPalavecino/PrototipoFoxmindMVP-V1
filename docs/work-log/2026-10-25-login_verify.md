# Login Inicio — independent verification

- Agent / role: test_runner
- Session or task ID: /root/login_verify
- Persisted by: /root (tester role cannot write documentation)
- Date: 2026-10-25
- Branch / worktree: codex/login-inicio, canonical repository
- Starting commit: 577445c
- Phase/spec: P3 authentication and P9 Inicio
- Status: completed

## Request and scope

Verify default login to Inicio, preserved safe explicit destinations and unverified-email gate. Own test changes only; no product edits or commits.

## Work performed

Added tests/login-inicio-integration.test.mjs using real disposable P4 services with classrooms and public account/SMTP helper. Updated P3, P9 Home and P9 recovery default-login expectations; profile checks navigate explicitly to profile. Replaced obsolete profile heading locator with the actual Nombre field without removing persistence assertions. Product implementation owned by /root/login_fix; builds owned by coordinator.

## Verification

`FOXMIND_LOGIN_EGO=1 node --test --test-reporter=dot --test-isolation=none --test-concurrency=1 tests/login-inicio-integration.test.mjs` (PowerShell environment assignment): five functional children PASS. Covers real unverified login and session continuation, confirmed-verification Inicio link, ordinary verified login to real Inicio, existing-session continuation plus explicit classrooms, exact invitation/Inicio/classrooms continuations and rejected remote next fallback. Disposable services ready, migration deploy/diff exit0; cleanup process0/owned0.

Combined opt-in run FAIL: sixth optional ego child timed out45s, no capture; parent consequently FAIL. Five functional passes remain observed, not a whole-suite PASS claim. Subsequent diagnosis found ego CLI waits for stdin EOF; test wrapper now ends child.stdin and preserves both output streams (CLI prints to stderr). Isolated console.log12345 wrapper probe PASS immediately/exit0. Updated test syntax and git diff --check PASS; full fixture was not repeated after wrapper correction. Space qa-login-inicio id5 had only New Tab, no authenticated screen; finish keep[] confirmed. No screenshot/visual acceptance claimed.

## Commits and outcomes

None yet.

## Handoff

Functional verification complete; no product defect observed. Optional capture unavailable. Coordinator reviewed wrapper EOF/streams correction; no replay of passed journeys required. Entire updated P3/P9 historical suites were not rerun; focused real browser groups cover this navigation delta.
