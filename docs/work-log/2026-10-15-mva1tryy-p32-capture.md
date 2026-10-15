# P3.2 — Local email capture infrastructure

- Agent / role: scoped capture implementation writer.
- Session or task ID: `mva1tryy-9-dhuu`.
- Date: 2026-10-15.
- Branch / worktree: `feat/p32-mail-capture`, existing shared worktree.
- Starting commit: `71ce2931184e7c543f7272bee81d7d2902dac9c9`.
- Phase and detailed task/spec links: P3.2, [T1 / S1, S3, S4](../../odd/tasks/p32-local-email.md).
- Status: in_progress (partial handoff; required runtime check still fails).

## Request and scope

User request in specification: "Bien vamos con P3.2". Assigned capture only: independent loopback Mailpit Compose, isolated owned disposable runtime harness, actual SMTP/public API persistence tests, English operating guide. No PostgreSQL, password workaround, development inbox deletion, sender implementation, auth flow, dependency changes or Git mutation. Parallel sender writer owns other surfaces. Parent owns package/lock/shared metadata and review lifecycle.

## Work performed

Read injected work-unit skill, task/spec, AGENTS, roadmap, work-record protocol and coordinator record. Actual branch/HEAD match parent; package.json/package-lock.json modifications and untracked parent task/record pre-exist and remain untouched. Roadmap's P3.2-not-started checkpoint is historical; current authorized T1 is in progress. Created this record before source writes.

Implemented only the five allowed surfaces: independent single-service `compose.mail.yaml`; UUID-labeled fresh test container/volume harness with random loopback ports, ownership/name-checked finally cleanup, bounded public readiness and owned stop/start; actual SMTP/public API behavior tests; English operations/retention/limits guide; this record. Parent/sender files remain untouched.

S1: actual SMTP acceptance and initial public API text/HTML capture observed in the corrected run (execution reached the restart call after all preceding assertions). S3: pinned official image, loopback-only ports, no PostgreSQL dependency/password, explicit persistent 500-message development retention and no relay/version checks confirmed by the passing normalized Compose test. Restart preservation remains **unproved** because readiness after stop/start timed out. S4: separate infrastructure unit, docs/tests and attributed record prepared; no commits, publication or review disposition claimed.

## Verification

- `git rev-parse --show-toplevel && git status --short && git branch --show-current && git rev-parse HEAD`: exit 0; root/branch/HEAD as above, parent-only dirty paths observed.
- Strict test-first RED: `node --test --test-concurrency=1 tests/p32-mail-capture.test.mjs`, foreground with tool timeout 30 seconds: exit 1, 0/2 pass, intended structural ENOENT for missing Compose and ERR_MODULE_NOT_FOUND for missing harness. No DB suites authorized. GREEN pending.

Observed RED stdout/stderr (combined tool stream; no separate stderr stream supplied):
```text
✖ capture Compose is independent, pinned, loopback-only and persistent (2.4096ms)
✖ isolated SMTP capture survives restart and never uses the development inbox (1.9071ms)
ℹ tests 2
ℹ suites 0
ℹ pass 0
ℹ fail 2
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 143.7552

✖ failing tests:

test at tests\p32-mail-capture.test.mjs:9:2
✖ capture Compose is independent, pinned, loopback-only and persistent (2.4096ms)
  Error: ENOENT: no such file or directory, open 'C:\Users\alejo\Documents\ProyectosAlejo\FoxMind\ProtipoFoxMind\compose.mail.yaml'
      at async open (node:internal/fs/promises:1345:25)
      at async readFile (node:internal/fs/promises:1996:14)
      at async TestContext.<anonymous> (file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/tests/p32-mail-capture.test.mjs:11:3)
      at async Test.run (node:internal/test_runner/test:1404:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    errno: -4058,
    code: 'ENOENT',
    syscall: 'open',
    path: 'C:\\Users\\alejo\\Documents\\ProyectosAlejo\\FoxMind\\ProtipoFoxMind\\compose.mail.yaml'
  }

test at tests\p32-mail-capture.test.mjs:32:1
✖ isolated SMTP capture survives restart and never uses the development inbox (1.9071ms)
  Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Users\alejo\Documents\ProyectosAlejo\FoxMind\ProtipoFoxMind\scripts\mailpit-test-runtime.mjs' imported from C:\Users\alejo\Documents\ProyectosAlejo\FoxMind\ProtipoFoxMind\tests\p32-mail-capture.test.mjs
      at finalizeResolution (node:internal/modules/esm/resolve:272:11)
      at moduleResolve (node:internal/modules/esm/resolve:879:10)
      at defaultResolve (node:internal/modules/esm/resolve:1006:11)
      at #cachedDefaultResolve (node:internal/modules/esm/loader:705:20)
      at #resolveAndMaybeBlockOnLoaderThread (node:internal/modules/esm/loader:725:38)
      at ModuleLoader.resolveSync (node:internal/modules/esm/loader:763:56)
      at #resolve (node:internal/modules/esm/loader:687:17)
      at ModuleLoader.getOrCreateModuleJob (node:internal/modules/esm/loader:607:35)
      at node:internal/modules/esm/loader:636:32
      at TracingChannel.tracePromise (node:diagnostics_channel:361:14) {
    code: 'ERR_MODULE_NOT_FOUND',
    url: 'file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/scripts/mailpit-test-runtime.mjs'
  }
Command exited with code 1
```

### First implementation check and bounded correction

`node --test --test-concurrency=1 tests/p32-mail-capture.test.mjs`, foreground timeout 30 seconds: exit 1. Compose contract passed; Docker volume creation exceeded the harness's initial 4-second per-process timeout before SMTP could run. This is not runtime capture/persistence proof. One correction: increase bounded Docker operation timeout to 8 seconds; retain the unchanged 24-second runtime-test/30-second tool bounds. No fallback, mock or DB change.

Observed combined stdout/stderr:
```text
✔ capture Compose is independent, pinned, loopback-only and persistent (377.5982ms)
✖ isolated SMTP capture survives restart and never uses the development inbox (4155.4431ms)
ℹ tests 2
ℹ suites 0
ℹ pass 1
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4665.7186

✖ failing tests:

test at tests\p32-mail-capture.test.mjs:32:1
✖ isolated SMTP capture survives restart and never uses the development inbox (4155.4431ms)
  Error: Command failed: docker volume create --label com.foxmind.mailpit-test=85716adb-41e3-488a-ae25-06380f3fc2dd foxmind-mail-test-85716adb-41e3-488a-ae25-06380f3fc2dd-data

      at genericNodeError (node:internal/errors:986:15)
      at wrappedFn (node:internal/errors:540:14)
      at ChildProcess.exithandler (node:child_process:417:12)
      at ChildProcess.emit (node:events:514:28)
      at maybeClose (node:internal/child_process:1141:16)
      at ChildProcess._handle.onexit (node:internal/child_process:306:5) {
    code: null,
    killed: true,
    signal: 'SIGTERM',
    cmd: 'docker volume create --label com.foxmind.mailpit-test=85716adb-41e3-488a-ae25-06380f3fc2dd foxmind-mail-test-85716adb-41e3-488a-ae25-06380f3fc2dd-data',
    stdout: '',
    stderr: ''
  }
Command exited with code 1
```

### Corrected check: partial result, correction budget exhausted

`node --test --test-concurrency=1 tests/p32-mail-capture.test.mjs`, foreground timeout 30 seconds: exit 1, 1/2 pass, total 9707.2123ms. The volume timeout did not recur. Actual SMTP acceptance, initial readiness, empty-inbox assertion and message API text/HTML assertions passed before the stop/start call. Post-restart readiness failed. No persistence or second-call isolation success is claimed. This is a different failure, so no second correction/rerun was made under the parent's bounded correction policy.

Observed combined stdout/stderr:
```text
✔ capture Compose is independent, pinned, loopback-only and persistent (145.1626ms)
✖ isolated SMTP capture survives restart and never uses the development inbox (9423.8926ms)
ℹ tests 2
ℹ suites 0
ℹ pass 1
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 9707.2123

✖ failing tests:

test at tests\p32-mail-capture.test.mjs:32:1
✖ isolated SMTP capture survives restart and never uses the development inbox (9423.8926ms)
  Error: Mailpit public readiness timed out
      at ready (file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/scripts/mailpit-test-runtime.mjs:37:9)
      at async restart (file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/scripts/mailpit-test-runtime.mjs:83:9)
      at async file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/tests/p32-mail-capture.test.mjs:71:5
      at async withMailpit (file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/scripts/mailpit-test-runtime.mjs:76:14)
      at async TestContext.<anonymous> (file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/tests/p32-mail-capture.test.mjs:36:3)
      at async Test.run (node:internal/test_runner/test:1404:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:969:7)
Command exited with code 1
```

- `git status --short && git diff --stat`: exit 0 (10-second bound). Only the five assigned new files were authored by this writer; parent package changes and parallel sender/map records/source/tests observed, preserved. Tracked diff: package-lock.json 10 insertions and package.json 1 insertion (not this writer). Git warned LF will be replaced by CRLF when Git next touches those two parent-owned files. No source/Git mutations outside assigned surfaces.
- No broad suites, DB suites, install, format, native review or Git mutation ran.

## Self-review and limits

- S1/S3/S4 examples/tests/docs cross-checked against task. S1 initial actual SMTP capture is observed, but the requested complete restart scenario remains red. S3 structural Compose rule initially passed with an empty env-file device and blank PostgreSQL password; the explicit parent follow-up supersedes that configuration with dotenv disabled and no env-file argument. Neither is a database test or permission to start PostgreSQL.
- The harness caches initial dynamic port bindings and reuses them after stop/start. Docker may reassign randomly published ports; this is a concrete candidate explanation for the post-restart readiness failure, **not diagnosed by an observed inspect**. Parent should first inspect/re-resolve ports after restart and preserve message/storage identity. Do not replace actual runtime checks with static assertions.
- Security guard risk: exact UUID ownership label and name are checked immediately before cleanup and before restart, but adversarial ownership-change/label-collision and forced-process-termination paths are not behavior-tested. A check/remove race remains possible against a hostile Docker administrator. Finally returned without cleanup errors in the observed failed run; absence of residual resources was not separately enumerated.
- Default retention intentionally caps at 500 and is not permanent archival. No external delivery/authentication/web-flow/encrypted-outbox proof exists. The parent's requested "Risk: item 5" has no enumerated item-5 definition in the supplied task; no corresponding risk is silently marked resolved.
- Persistent memory was not written: no validated project name was supplied to this scoped writer; the repository record is the durable handoff.

### Explicit parent follow-up: no sensitive-file access

Parent forwarded the user's explicit choice «Sí, usar documentación sin archivos sensibles — recomendado». No `.env` or `.env.example` reads/edits or alternate access are permitted. This writer did not read either file. Public Compose configuration checks force `COMPOSE_DISABLE_ENV_FILE=1` and remove inherited `COMPOSE_ENV_FILES`, matching the parent-owned operations wrapper; direct dotenv-dependent Compose commands were removed from the guide. Added custom `MAIL_SMTP_PORT`/`MAIL_HTTP_PORT` contract assertions before changing Compose, then implemented interpolated host ports with defaults 1025/8025. Project is consistently `foxmind-mail-local`; service stays `mailpit`. Guide documents the parent-owned wrapper/npm commands and shell-only port configuration. The earlier runtime correction budget remains exhausted and its failure was not disguised or independently corrected.

Follow-up RED, exact `node --test --test-concurrency=1 tests/p32-mail-capture.test.mjs`, foreground 30-second bound, exit 1. Intended new failure: custom ports remained 1025/8025 instead of 11025/18025; known post-restart failure also remained. Observed combined stdout/stderr:
```text
✖ capture Compose is independent, pinned, loopback-only and persistent (275.1006ms)
✖ isolated SMTP capture survives restart and never uses the development inbox (9161.6709ms)
ℹ tests 2
ℹ suites 0
ℹ pass 0
ℹ fail 2
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 9564.8657

✖ failing tests:

test at tests\p32-mail-capture.test.mjs:20:1
✖ capture Compose is independent, pinned, loopback-only and persistent (275.1006ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected

    [
      [
        '127.0.0.1',
        1025,
  +     '1025'
  -     '11025'
      ],
      [
        '127.0.0.1',
        8025,
  +     '8025'
  -     '18025'
      ]
    ]

      at TestContext.<anonymous> (file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/tests/p32-mail-capture.test.mjs:39:10)
      at async Test.run (node:internal/test_runner/test:1404:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: [ [ '127.0.0.1', 1025, '1025' ], [ '127.0.0.1', 8025, '8025' ] ],
    expected: [ [ '127.0.0.1', 1025, '11025' ], [ '127.0.0.1', 8025, '18025' ] ],
    operator: 'deepStrictEqual',
    diff: 'simple'
  }

test at tests\p32-mail-capture.test.mjs:44:1
✖ isolated SMTP capture survives restart and never uses the development inbox (9161.6709ms)
  Error: Mailpit public readiness timed out
      at ready (file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/scripts/mailpit-test-runtime.mjs:37:9)
      at async restart (file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/scripts/mailpit-test-runtime.mjs:83:9)
      at async file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/tests/p32-mail-capture.test.mjs:83:5
      at async withMailpit (file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/scripts/mailpit-test-runtime.mjs:76:14)
      at async TestContext.<anonymous> (file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/tests/p32-mail-capture.test.mjs:48:3)
      at async Test.run (node:internal/test_runner/test:1404:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:969:7)
Command exited with code 1
```

Follow-up check after implementation, same exact command and foreground 30-second bound: exit 1, new port contract GREEN but overall runtime still failing. Observed combined stdout/stderr:
```text
✔ capture Compose is independent, pinned, loopback-only and persistent (294.0428ms)
✖ isolated SMTP capture survives restart and never uses the development inbox (9465.8371ms)
ℹ tests 2
ℹ suites 0
ℹ pass 1
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 9900.1519

✖ failing tests:

test at tests\p32-mail-capture.test.mjs:44:1
✖ isolated SMTP capture survives restart and never uses the development inbox (9465.8371ms)
  Error: Mailpit public readiness timed out
      at ready (file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/scripts/mailpit-test-runtime.mjs:37:9)
      at async restart (file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/scripts/mailpit-test-runtime.mjs:83:9)
      at async file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/tests/p32-mail-capture.test.mjs:83:5
      at async withMailpit (file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/scripts/mailpit-test-runtime.mjs:76:14)
      at async TestContext.<anonymous> (file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/tests/p32-mail-capture.test.mjs:48:3)
      at async Test.run (node:internal/test_runner/test:1404:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:969:7)
Command exited with code 1
```

## Commits and outcomes

No commits: parent owns Git actions. RED observed; GREEN not achieved. This is a partial implementation, not T1/P3.2 completion. No review lifecycle action performed.

## Handoff

First unfinished task: parent investigates the post-restart public readiness failure (initial dynamic-port cache is the first suspect), completes preservation/isolation evidence, then integrates sender→SMTP→capture. No further worker corrections authorized by the present per-check budget.

Rollback boundary: only compose.mail.yaml, scripts/mailpit-test-runtime.mjs, tests/p32-mail-capture.test.mjs, docs/local-email.md and this attributed record; never delete the development volume or parent/sender files. Stop any development mail service rather than removing retained inbox data. Separate infrastructure unit depends only on Docker and parent-installed Nodemailer for tests; sender has no source dependency on this infrastructure until parent seam integration.
