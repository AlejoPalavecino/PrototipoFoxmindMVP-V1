# P3 independent verification — PASS after one bounded correction

- Agent / role: `/root/p3_verify_final`, independent read-only verifier.
- Task identity: `/root/p3_verify_final`.
- Configured model/effort: `gpt-6.1-sol` / `xhigh`, explicitly requested by the user.
- Persisted by: parent `/root`, from returned observed progress; verifier did not edit source.
- Date: 2026-10-17.
- Branch: `feat/p33-token-flows`.
- Baseline: `0fd271cf4d2b9186b23a12525f1668efd886612f`.
- Phase/specs: full [P3 completion](../../odd/tasks/p3-completion.md),
  [token flows](../../odd/tasks/p33-token-flows.md), [web](../../odd/tasks/p34-web.md).
- Status: completed; all reported blockers resolved, full local P3 exit condition observed.

## Scope and preparation

Verify the frozen remaining P3 source independently in OS-temp state. No P4/P5
integration, publication, secret/env file reads, dependency installation,
source correction or native review lifecycle. Native review is off/global,
disabled/unmanaged; these are functional/specification checks.

Fresh scratch: `C:/Users/alejo/AppData/Local/Temp/foxmind-p3-verify-xP1Pco`.
The verifier observed251 candidate files, including1 actual declaration file,
and complete source inventory/SHA256 equality. No minimum declaration count
was invented. Root generated/build output was excluded. The first dependency
preparation used a read-only junction to installed pinned dependencies.

## Observed results

| Command/probe | Actual result |
|---|---|
| `node scripts/test-p33-t2.mjs` | exit0/246073ms;99PASS,0FAIL/skip/cancel; fresh Prisma0 and strict API TypeScript0 |
| Seven-file controls/dependency command below | exit0/34295ms;39PASS,0FAIL/skip/cancel |
| `node node_modules/typescript/bin/tsc --project apps/web/tsconfig.json --noEmit` | exit0/5350ms |
| Public `npm audit --json` via installed npm CLI | exit0; zero vulnerabilities |
| Additional SQL rejection invariants |9PASS; account/session/token/job hashes unchanged after rejection |
| Public CLI differential against baseline |7PASS; stdout/stderr/exit preserved |

Pipeline99PASS breakdown: D2registration/profile/sessions/lifecycle17,
verification16, recovery16, password change11, mail deadline1, identity21,
backend8 and offline contracts9. Actual completed fixture cleanup:16database
and13Mailpit cleanups0. Synthetic control messages such as exit7, unavailable
and cleanup1 are expected fail-closed fixture assertions, not real cleanup
failures or application acceptance.

Controls command:

```powershell
node --test --test-concurrency=1 tests/p33-test-process.test.mjs tests/p33-fixture-budget.test.mjs tests/api-build-pipeline.test.mjs tests/p33-recovery-runner.test.mjs tests/p33-verification-runner.test.mjs tests/p33-d2-runner-options.test.mjs tests/dependency-security.test.mjs
```

Parent focused dependency spot-check: `node --test
tests/dependency-security.test.mjs`,8PASS/0FAIL/skip/cancel, actualexit0.

## Retained failures and advisories

Initial browser command failed1/18741ms before any browser/fixture/subtest:
fresh Prisma0/APITypeScript0; Next strict types finished, then Turbopack rejected
`next/package.json` through the junction outside its scratch workspace root.
All9 browser subtests were UNRUN, no screenshot and no application verdict.
Source/configuration/timing were not changed to mask it.

The parent authorized a preparation-only correction under the existing full P3
scope: unlink the verified scratch junction itself and materialize installed
dependency files using local hardlinks. The same source/package/lock bytes
remain frozen. The verifier inventoried26091 files/2344directories, excluded
only `.cache`, verified all nested links stay in original node_modules, and
uses one Node process with link/inode/size/SHA256 checks. No chmod/root writes,
per-file subprocesses or preparation restart occurred. Progress15000files;
exact browser command will run once after preparation, with separate logs.

An initial audit launcher failed EINVAL before npm ran; the real npm CLI action
above then completed successfully. Both outcomes remain distinct.
Identity tests emitted a MaxListenersExceededWarning while creating multiple
test applications; the suite exited0. Baseline causality is not yet established;
it is retained as an advisory, not a claimed production defect or blocker.

## Original candidate finding (resolved by the bounded batch)

Verifier-owned `probe-aborted-body.mjs` exited1/361ms with a real erroring
ReadableStream: proxy returned503 and forwarded0, but emitted an unhandled
rejection. `apps/web/src/lib/account-proxy.ts` has three discarded
`reader.cancel()` promises (timeout, overflow, finally); cancellation of an
errored stream rejects with its stored error. The proxy is new, so this is
candidate-caused. Source was not changed by the verifier or parent. The parent
is holding the frozen candidate until dependency preparation and first real
browser execution finish, then will fix the reported blockers in one bounded
batch and commit meaningful regression coverage. This probe is genuine RED;
it is separate from the earlier Turbopack preparation failure. Exact scratch
probe/output paths will be retained in the final handoff.

## Bounded coordinator correction

The full original sweep returned PARTIAL with two application defects and one
helper defect. Actual production Next partial-body abort emitted an unhandled
ECONNRESET rejection but the process survived and subsequent GET returned200;
no process crash is claimed. Real API/captured-mail proof reopening returned no
new HTTP response, retained its fragment and left confirmation hidden, with
confirmation POST count1→1. The browser helper's unconditional `.headers()`
call caused the two primary reuse failures and four subsequent state cascades.
Prepared browser run:10total/3PASS/7FAIL, exit1/161538ms; all9children entered;
no screenshots. Fresh API/Next builds passed. All original251files remained
unchanged at sweep end (digest61f68ee3e4e05ad21d47b3ed1cbd0333b34f34dff3d3bfc32f08ac367ae69c0c).

Coordinator observed two meaningful root RED regressions (exit1/384ms):
same-document fragment persisted and strict subprocess aborted on discarded
stream-cancellation rejection. Then one correction batch changed only:

- `apps/web/src/lib/account-proxy.ts`: handle rejected cancellation at all three sites, preserving original HTTP status/deadline/body limit.
- `apps/web/src/lib/token-capture.ts`: clear/capture hash navigations and notify without putting proof data in events; retain one-use and purpose binding.
- `apps/web/src/components/account-screen.tsx`: receive same-view proof notifications and re-arm explicit confirmation, guarding the current path/purpose.
- `tests/p3-web-proxy.test.mjs`: commit hash-navigation and actual errored/overflow/10-second-timeout cancellation regressions, including strict rejection handling.
- `tests/p3-browser.test.mjs`: inspect HTTP headers only when a new response exists, retain all fragment/storage/explicit-consumption assertions, and wait for the actual form before responsive capture.

Root focused result:16total,14PASS/0FAIL/2explicit live-origin skips, exit0/10571ms.
The cancellation regression covers all three actual failures with the existing
10-second deadline and zero forwarding; no fake timers or product policy
changes. Full live-origin checks, actual browser journey and verifier's narrow
blocker probes remain pending. This is the single candidate correction batch;
the earlier dependency arrangement correction changed preparation only.

## Accepted bounded recheck

Verifier verdict: **PASS**, no unresolved reported blocker or additional finding.
The same requested gpt-6.1-sol/xhigh actor rechecked the five corrected files;
original copies and all failed evidence remained separate. No new full review
sweep or second source correction was performed.

| Recheck | Observed result |
|---|---|
| Original erroring-body probe | exit0/361ms;503, zero forwarding, no unhandled rejection |
| `node scripts/test-p3-browser.mjs` | exit0/61244ms; fresh Prisma/API/production Next builds0;10PASS/0FAIL/skip/cancel, all9children complete |
| Actual Next raw abort plus live-origin focused two-file suite | exit0/20952ms; no unhandled error, process alive/subsequent GET200;16PASS/0FAIL/skip |
| Real API/captured-mail proof reopening | exit0/18765ms; same-document response null, fragment cleared, confirmation re-armed, POSTcount1→1 until explicit action |
| Strict web TypeScript | exit0/5517ms |

The browser checks cover actual registration/verification/sign-in/profile/
sign-out/recovery, captured mail, rejected/reused/expired proof, API restart
persistence, current/other-session revocation, quoted and international mailboxes,
responsive forms, keyboard focus, failure retry, no external requests and no
browser exceptions. Supplementary live Next navigation mocks only its transport;
it is not counted as the real-backend proof. The unchanged99backend/39controls,
9rejection invariants/7baseline comparisons and audit0 were not rerun.

Specs: full P3 completion S1–S4 and web S1–S3 now PASS; user-requested Verify
model/effort satisfied. Backend functional token/password S2–S6 and public proof
S7 PASS. Historical scoped allowances/exceptions remain historical rather than
retroactive acceptance. Scope boundary respected: no P4/P5 integration, remote
publication, retained data mutation, secret-file access or native review.

All251 corrected snapshot inputs matched root and scratch; other246 and both
manifests were unchanged before passive closure. Corrected inventory SHA256:
`1718e85d5db5e13f635f0d1a61535bbe3c2c2d67fea4a214ec44201845508a5e`.

| Corrected file | SHA256 |
|---|---|
| account-proxy.ts | ed4f1da75a42fc8c5744a3f02751bff32ef5a182c89abaf612cb4f9e64305c33 |
| token-capture.ts | 14703abadefc9367f4434ba147e2798fcd60edbc404524a18b05b05d4148ad0c |
| account-screen.tsx | fc8e0b7c065a8ef4fcd17c752cb53346e0b4d4ea53f16bbe46a207f17982b1e8 |
| p3-web-proxy.test.mjs | 59a65b3ea3975343e69fcb1dbd0a9def805c07a4982b50d7d1a2a1bf1d8c208d |
| p3-browser.test.mjs | a8c475a0f721e7af50c7136ddec060f854277c581678a04a7f7272d275feedc5 |

Package SHA2563cf4045bdbe3ac378dda0e1aad4f3dad90b9355b89986a5cd6347121487f283b;
lockfd9eb3f61406d41c4144f1565b693b7fcc9e5cc9efe31ad4f2c046a2ba62c678.
Dependency hardlink inventory digest8a2bb0cc1ea1c146850b6026e1926b5816d05a254bf41316a830974fd61aa075;
26091files/704764209logicalbytes, no byte copies/chmod/content writes. Hardlinks
naturally change link-count metadata; no stronger attributes-unchanged claim is made.

Two new recheck databases/two Mailpit fixtures and the separate Next/observer
process cleaned successfully. Final readback found zero matching test containers;
the foreign October15Mailpit volume remains untouched. All owned processes closed.

## Coordinator spot-check, evidence and handoff

Parent reran the exact strict web TypeScript command after correction: exit0.
The parent visually inspected all three settled registration screenshots:
320×947,375×923,1280×900. Complete legible forms, no horizontal overflow; the
focused skip-link intentionally overlays the topbar during keyboard proof.
No broader visual or production-readiness claim is inferred.

Independent top-level logs/probes/inventories and three PNGs were preserved in
ignored `.test-artifacts/p3-final-verification/` before owned-temp cleanup.
Functional commands and summaries above are durable without that scratch.
The later coordinator closure changes only passive checkpoint docs/OpenAPI
implementation markers and their existing offline assertion:9PASS after marking
all12 implemented, unchanged schemas/security policies. Verified application,
proxy and runtime bytes remain unchanged.

No commit/publication by this verifier. Parent owns local work-unit commits and
roadmap closure. Stop after P3; no P4/P5 integration. Native review remains
off/global, disabled/unmanaged, not approved or waived.

Risk: items2/4/5 — credentials/session/token/proxy security, concurrent mutations,
and dependency/test-runtime infrastructure; applicable independent checks passed.

## Filesystem cleanup limitation

After preserving evidence, parent verified the two exact OS-temp scratch paths
resolve under the system temp root and enumerated their four dependency
junctions. Automatic approval rejected the proposed owned-scratch deletion
before process creation with `blocked by policy`. No deletion or junction
unlink ran; no alternative deletion method was attempted. The safe outcome is
to retain these inactive verification copies and record the limitation. This
does not change the separately observed database/Mailpit/process cleanup0.

Retained paths:

- `C:/Users/alejo/AppData/Local/Temp/foxmind-p3-verify-xP1Pco`
- `C:/Users/alejo/AppData/Local/Temp/foxmind-p3-recovery-recheck-uGmiIJ`

The old snapshot junction still targets the project's installed dependencies;
do not recursively delete through it. Any future cleanup must first unlink only
the verified junction itself and honor the active tool policy. The October15
foreign verification directory and development Mailpit volume remain untouched.
