# P3 verification runtime

The P3 suites use real isolated PostgreSQL, native Argon2 and captured SMTP. No auth bypass, fake credential hasher, source receipt or persisted build approval is available. The coordinator builds once per invocation and provides its existing in-process preparation callback only after actual Prisma generation and strict TypeScript succeed. Standalone commands still compile.

## Separate startup from assertions

Observed Windows runs spent the former fixture deadline loading the compiled application before any test hook or HTTP request. Separate diagnostics also observed Docker launch/cleanup exceeding their old operational limits. These failures remain recorded as unavailable proof, not application failures or successful tests.

The local verification infrastructure now has explicit bounds:

| Phase | Bound |
|---|---|
| Actual API generation and strict build | Existing 30 seconds in `build-api.mjs` |
| PostgreSQL provisioning | 90 seconds total; Docker run30s, other setup operations15s, each clamped to remaining setup time |
| Standalone strict compiler | 30 seconds; no compiler-skipping CLI/environment option |
| Test module initialization | 30 seconds to a trusted IPC readiness message |
| Functional test work | 26 seconds after module initialization, including normal test hooks |
| HTTP/query/KDF policies | Existing HTTP4s, query2s and real bounded Argon2 remain unchanged |
| Owned database cleanup | Inspect/unpause10s, removal15s; failure stays a failure |
| Coordinator stage | 180s safety ceiling including setup, startup, work and awaited cleanup; no later stage after failure |

`p33-test-process.mjs` owns one child with Node's test isolation disabled, rather than an additional test-runner grandchild. The readiness message is emitted only by test modules after static imports; it cannot grant a session, consume a token, replace an assertion or change production configuration. Missing readiness, startup expiry, work expiry and nonzero child exits all reject verification. Child close and captured streams are awaited before caller-owned resource cleanup. There is no retry or case subdivision in the public runners.

The previous 26s total fixture/30s total stage accounting included module loading and could interrupt asynchronous cleanup. The new setup/startup allowances are test infrastructure changes under the user's full P3 completion authorization; they do not relax product security rules, token/session lifetimes or any test's expected public effects. Historical S10 launch-only allowances remain historical evidence for their original candidate.

## Focused controls

`node --test tests/p33-fixture-budget.test.mjs tests/p33-test-process.test.mjs` checks setup caps, remaining-time clamping, readiness, separate startup/work expiry, child exit and error streams. These controls use synthetic processes and do not prove the application or real resource cleanup. The identity, verification, recovery and password-change suites supply that separate public-interface proof.

Run `node scripts/test-p33-t2.mjs` for the sequential build-once identity regression. Run `node scripts/test-p3-browser.mjs` for real production-Next browser journeys with disposable SQL and captured email. Browser journeys use actual registration/session/token routes; their longer end-to-end runtime does not alter the backend group deadlines above. Test resources are uniquely labelled and cannot authorize deletion of the development inbox or other worktrees' services.
