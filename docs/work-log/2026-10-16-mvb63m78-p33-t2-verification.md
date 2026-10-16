# T2 independent technical verification — PASS, scoped

- Agent / role: independent technical verifier; read-only.
- Task ID: mvb63m78-6-cres.
- Runtime session: 01a1457d-d65c-7483-8df8-60151d71ce39.
- Persisted by: coordinating parent 01a14539-ab7b-77dc-8eee-546a8c3dd168, from the verifier's final report. The verifier did not edit repository files or author coordinator changes.
- Date: 2026-10-16.
- Branch: feat/p33-registration-profile.
- Starting commit / comparison base: 3f63c58327508b31063c3ca91bce5d1f7be4c4f1.
- Candidate: frozen dirty working-tree snapshot, including untracked D2/C1/orchestration source, not HEAD alone.
- Phase/tasks: P3.3 T2 D2; T2-execution C3; build-once S1–S3; P3-completion P3-A.
- Status: completed for the independent technical-verification assignment only.
- Commits/publication: none.

## Outcome and scope

**PASS, no blocking finding.** Authentication, concurrency, mail cancellation and build orchestration passed the authorized independent verification. This is not native approval, T3 acceptance or full-P3 completion.

Read the complete main feature, execution/build/completion specifications, roadmap/protocol, relevant functional sections, account guide/OpenAPI, coordinator/worker records, production source, public assertions and parent job-2 logs. Reviewed tracked changes against 3f63c58 and new files directly. Existing D1 assertions remain preserved apart from intentional registration/profile route-status updates. T3's five endpoints, frontend and complete P3 are outside this verdict. D1-only implementation-status metadata was intentionally awaiting acceptance, not a contract defect.

No repository edits, dependency installation, environment-file access, Compose, development-data mutation or native/authority actions occurred. Missing .codegraph was not initialized under the read-only restriction; scoped files/diffs were used.

## Independent commands and observed results

Serial, once each, foreground outer timeout30s, in the runtime-owned scratch snapshot:

| # | Exact command | Result |
|---|---|---|
| 1 | `node --test --test-concurrency=1 tests/api-build-pipeline.test.mjs tests/p33-d2-runner-options.test.mjs` | exit0,15PASS,6018.2234ms |
| 2 | `node scripts/build-api.mjs` | exit0; actual Prisma7.10.0 generation0/strict TypeScript0 |
| 3 | `node scripts/test-p33-registration-profile.mjs --group=registration` | exit0,7PASS,11772ms |
| 4 | `node scripts/test-p33-registration-profile.mjs --group=account` | exit0,5PASS,7436ms |
| 5 | `node scripts/test-p33-registration-profile.mjs --group=sessions` | exit0,2PASS,9288ms |
| 6 | `node scripts/test-p33-registration-profile.mjs --group=lifecycle` | exit0,3PASS,12056ms |
| 7 | `node scripts/test-p33-mail-cancellation.mjs --deadline` | exit0,1PASS,suite14424.3143ms |

Total33PASS, zero failures/skips/cancellations. Command1's injected/synthetic stage-zero messages prove orchestration only. Command2 generated/compiled actual source. Commands3–7 independently invoked actual default compilation and reported compiler0.

Separate exact stdout/stderr were retained in verification-01..07.stdout.log/.stderr.log inside scratch. Command2 stderr contained only Prisma config/schema informational messages; every other stderr file was empty. Four Mailpit container/volume cleanups and five identity-database cleanups each reported0. No independent post-run Docker inventory was performed.

Parent evidence was separately read, not rerun: actual combined generation/compilation0, D2 17+deadline1+D1 21+backend8+contracts9=56PASS, reported cleanup0. Overall exit0/81s remains parent-attributed.

## Verdict per specification

| Specification | Scoped verdict / evidence |
|---|---|
| Main S1 | PASS: exactly seven T2 operations, no T3/frontend expansion. apps/api/src/identity/transport.ts:8; tests/p33-registration-profile.test.mjs:227–234. |
| Main S2 | PASS: exact input/Unicode boundaries, generic duplicates, verified profile gate, whitelist, Origin/CSRF, body/security responses, idle/absolute policy. tests/p33-registration-profile.test.mjs:96–144,189–247; transport.ts:54–101. |
| Main S3 | PASS: quoted/international registration reaches actual SMTP; preserved spelling and uppercase-domain rejection. tests/p33-registration-profile.test.mjs:114–130; identity/runtime.ts:70–74. |
| Main S4 | PASS, scoped preservation: existing password/configuration reused; purpose-digested token, encrypted enqueue and sanitized errors. runtime.ts:79–99; identity/identity.module.ts:15–17. Foundational crypto/native approval not re-performed. |
| Main S5 | PASS: rollback/durable retry/shutdown/outages and production deadline socket destruction before rejection, stopped overlap and replacement-lifecycle retry. tests/p33-registration-profile.test.mjs:179–187,266–307; tests/p33-mail-deadline.test.mjs:47–78; identity/mail-lifecycle.ts:30–64. |
| Main S6 | PASS, bounded concurrency: conflict-safe canonical registration, shared admission, persisted-session recheck under user lock. runtime.ts:82–89,114–127; tests/p33-registration-profile.test.mjs:145–177,249–264; identity/persistence.ts:38–39,56–99. |
| Main S7 | PASS for this assignment: preserved regressions reviewed, parent proof inspected, independent proof without Git/native actions. No publication/phase-completion authority. |
| Execution C3 S1–S2 | PASS technical portion: finite groups/security boundaries retained; all prescribed independent checks observed. Parent owns acceptance/disposition. |
| Build-once S1 | PASS: direct generation then strict compilation, no cache/receipt authorization. scripts/build-api.mjs:6–24. |
| Build-once S2 | PASS: all17 grouped cases/actual deadline retained and executed; parent regression proof read. scripts/test-p33-registration-profile.mjs:6–10,22–32. |
| Build-once S3 | PASS: success-only preparation, ordered checks/fail-fast; standalone compilation preserved. scripts/test-p33-t2.mjs:44–64; scripts/p33-identity-test-env.mjs:20–28. |
| P3-A | PASS only for the independent-verification dependency; broader sequential completion belongs to coordinator. |

## Advisories and coverage limits

- No blocking finding. Dedicated profile-update IP/user-budget exhaustion is not explicitly exercised by these17 cases; source reuses established shared admission (runtime.ts:109–112). No extra probe ran.
- Duplicate token/cooldown preservation is supported by the conflict early return (runtime.ts:85–89) and public credential/profile/mail observations. T3 token-consumption/resend interactions remain out of scope and unproven.
- Inbox absence assertions are bounded observations, not proof against arbitrarily delayed mail (tests/p33-registration-profile.test.mjs:91–94).
- Windows signal shutdown, real timeout/hard-kill cleanup timing and production deployment remain unverified. The outer timer is a scheduling/failure boundary, not guaranteed immediate cancellation (scripts/test-p33-t2.mjs:20–33).
- Historical compiler timeouts/ECONNRESET causation remain unknown; successful checks do not establish their cause.
- Two guessed source reads returned ENOENT. An optional final snapshot recomparison inspection failed before execution with a shell-escaped JavaScript SyntaxError; no writes/retry followed, so final hash recomparison remains unverified. These do not invalidate the seven successful prescribed commands.

Risk conclusion: no blocking authentication/concurrency/environment finding within this slice. Public tests demonstrated rejected-state protection, shared registration admission, duplicate preservation, rollback, revocation-race rejection, actual outages and actual SMTP cancellation. No exhaustive security/broader-regression claim.

## Snapshot/evidence identity

- Scratch reported by verifier: C:/Users/alejo/AppData/Local/Temp/gp6ujMrn/gaMxWAve/foxmind-mvb63m78-qNQokH.
- snapshot-manifest.json: task mvb63m78-6-cres, full base above, original project root,161 copied files with individual SHA-256s. Aggregate manifest digest not captured.
- Copied: apps/api/src, API tsconfig, scripts, tests, docs, prisma, prisma.config.ts, package.json/package-lock.json; empty marker directory as needed.
- Sensitive/environment/credential names and dependency/generated/cache/Git directories filtered before copy/read. Installed dependencies reused through read-only junction; generated client/build outputs belonged to scratch.
- Exact streams: scratch/verification-01.stdout.log/.stderr.log through verification-07.stdout.log/.stderr.log. Scratch retained as reported by verifier; coordinator did not independently read this external runtime-owned path or assert durable external-log retention.

## Handoff

Parent persists this attributed report and reconciles T2/P3-A acceptance/metadata, retaining advisories. No further test, source correction or native action requested by this verdict. Native disposition remains separate; no T3/full-P3 completion.

## Key Learnings

- Standalone runners retain actual compilation despite combined-build orchestration.
- Actual SMTP socket ownership makes deadline cancellation observable and enforceable.
- Conflict-safe registration preserves generic responses across concurrent case variants.
