# P3.3 C1 — Sequential owned SMTP cancellation

- Agent / role: scoped implementation writer.
- Session or task ID: mvb3yfqi-1-ssxm; parent session 01a14539-ab7b-77dc-8eee-546a8c3dd168.
- Date: 2026-10-16.
- Branch / worktree: feat/p33-registration-profile; shared worktree (observed).
- Starting commit: 3f63c58 (observed).
- Phase / specs: P3-A S1–S3; C1 S1–S2; main P3.3 S4–S7.
- Status: completed (bounded C1 implementation/component proof only; lifecycle/HTTP integration deferred).

## Request and scope

User request verbatim: "Vamos con la opción mas segura para terminar con P3". One sequential C1 unit only: public Nodemailer getSocket with owned actual socket cancellation including connect-in-progress; preserve sender validation, sanitization, ordinary send/close, existing lifecycle/runOnce and unchanged lease. No competing writer reported. No sensitive files, dependencies, root build/HTTP/Docker execution, Git mutations, native actions or tracking-document edits. Own record precedes implementation.

## Work performed

Read both injected skills completely, roadmap/protocol, requested feature specifications, old C1 record and attributed mapper; relevant functional account/authentication sections. Existing D2 changes and untracked cancellation test/lifecycle preserved. Roadmap predates actual D1 closure; source remains D2 partial, not whole T2/P3 acceptance. No CodeGraph index shown; no broad structural exploration performed, only supplied exact paths. One exact read of nonexistent mail/types.ts returned ENOENT; no writes occurred there.

Changed only authorized paths:
- apps/api/src/mail/account-mail.service.ts: public getSocket hook owns a real net.Socket before connecting; one-shot setup completion with unchanged 3000ms setup cap; terminal idempotent cancelPending destroys connecting/active sockets and rejects queued setup. Existing validateInput/submit, sanitization, methods, ordinary graceful close and fixed loopback SMTP retained. No private Nodemailer APIs/casts.
- apps/api/src/identity/mail-lifecycle.ts: existing 12000ms deadline now calls cancellation before rejection; existing stopped scheduling, send drain and runOnce with 30000ms lease retained. No separate worker or timing bypass.
- scripts/mail-smtp-fixture.mjs: opt-in incomplete DATA-response trickling, active-connection observation/idle drain; timer cleared on socket close. Original reject/stall behavior remains.
- tests/p33-mail-cancellation.test.mjs: preserve original four cases, strengthen actual synchronous socket destruction/peer teardown, add greeting and immediate setup cancellation plus closed-input validation.
- scripts/test-p33-mail-cancellation.mjs: finite serial cancellation/regression modes; unchanged P3.2 sender tests redirected to private current public mail entry through Node registerHooks; prepare separate deferred owned-DB deadline mode without root compilation.
- tests/p33-mail-deadline.test.mjs: prepared, NOT EXECUTED, real HTTP registration/lifecycle/runOnce test with 12000ms production deadline, trickling stalled DATA, responsive HTTP, socket destruction during cancellation, no overlap, bounded close and replacement lifecycle durable retry.
- docs/mail-sender.md: cancellation versus graceful close, private proof commands and deferred parent command/limits.
- This own work record. apps/api/tsconfig.p33-mail.json remains unchanged; authorized compilation emits only its private .build/p33-mail output.

## Verification

- `git rev-parse --show-toplevel && git status --short && git log -1 --oneline && if [ -d .codegraph ]; then printf 'codegraph index present\\n'; fi`: exit 0; root confirmed, existing unrelated tracked/untracked work preserved, base 3f63c58; no index message.
- `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.p33-mail.json` (before implementation): exit 0, no output.
- `node --test --test-concurrency=1 tests/p33-mail-cancellation.test.mjs` (before implementation): exit 1, intended RED: missing public cancellation port; 4 tests / 1 pass / 3 fail. Full tool-returned output preserved below (tool merges stdout/stderr; separate streams were not captured). Historical prior runtime failures/timeouts remain unchanged, not new passing evidence.
- `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.p33-mail.json` (after implementation, once): exit 0, no output. Strict inherited flags unchanged.
- `node --test --test-concurrency=1 tests/p33-mail-cancellation.test.mjs` (after implementation, once): exit 0, 6/6 pass, no failures/skips, duration 496.3874ms. Full returned output below.
- `node scripts/test-p33-mail-cancellation.mjs --regressions` (once): exit 0, actual 14/14 pass, no failures/skips, duration 12971.586ms. P3.2 unchanged nine cases plus P3.3 mailbox five; includes ordinary graceful stalled-send close, SMTP refusal/outage, broad/uppercase mailbox behavior, MIME and configuration. Full returned output below.
- `git branch --show-current && git diff --check -- apps/api/src/mail/account-mail.service.ts apps/api/src/identity/mail-lifecycle.ts scripts/mail-smtp-fixture.mjs scripts/test-p33-mail-cancellation.mjs tests/p33-mail-cancellation.test.mjs tests/p33-mail-deadline.test.mjs apps/api/tsconfig.p33-mail.json docs/mail-sender.md docs/work-log/2026-10-16-c1-sequential-mvb3yfqi.md && git diff --stat && git status --short`: exit 0; branch confirmed, scoped whitespace check clean before this final record update; diff/status retained unrelated dirty/untracked paths. Git stat emitted existing LF-to-CRLF warnings for unrelated tracked paths; no Git writes performed.
- Every finite command ran alone in foreground with outer timeout 30s; regression child cap 26s. No unchanged timeout replay or post-change failure occurred.
- Root build, lifecycle compile, Docker/Mailpit/HTTP integration NOT RUN per parent boundary. No base scratch differential: preserving/running unchanged P3.2 assertions against private candidate gives meaningful ordinary sender regression proof without introducing history-dependent tests or scratch writes outside the allowed surfaces. No baseline-equivalence claim beyond observed component cases.
- No separate stdout/stderr capture was available from the direct tool output; preserve merged output rather than invent empty stderr receipts.

## Original RED output (verbatim tool output)

```text
✖ cancelPending destroys actual in-flight DATA sockets, settles both purposes and permanently closes acceptance (9.68ms)
✖ cancelPending during real connect settles setup exactly once and destroys the connecting socket (4.271ms)
✖ cancellation before any send is idempotent, lazy and does not open SMTP (1.4649ms)
✔ ordinary sender close remains graceful and waits for an accepted real send (17.6434ms)
ℹ tests 4
ℹ suites 0
ℹ pass 1
ℹ fail 3
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 9218.1758

✖ failing tests:

test at tests\p33-mail-cancellation.test.mjs:23:1
✖ cancelPending destroys actual in-flight DATA sockets, settles both purposes and permanently closes acceptance (9.68ms)
  AssertionError [ERR_ASSERTION]: public cancellation port
  + actual - expected
  
  + 'undefined'
  - 'function'
  
      at file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/tests/p33-mail-cancellation.test.mjs:25:12
      at withSender (file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/tests/p33-mail-cancellation.test.mjs:19:15)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
      at async TestContext.<anonymous> (file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/tests/p33-mail-cancellation.test.mjs:24:3)
      at async Test.run (node:internal/test_runner/test:1404:7)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: 'undefined',
    expected: 'function',
    operator: 'strictEqual',
    diff: 'simple'
  }

test at tests\p33-mail-cancellation.test.mjs:38:1
✖ cancelPending during real connect settles setup exactly once and destroys the connecting socket (4.271ms)
  AssertionError [ERR_ASSERTION]: public cancellation port
  + actual - expected
  
  + 'undefined'
  - 'function'
  
      at file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/tests/p33-mail-cancellation.test.mjs:40:12
      at withSender (file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/tests/p33-mail-cancellation.test.mjs:19:15)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
      at async TestContext.<anonymous> (file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/tests/p33-mail-cancellation.test.mjs:39:3)
      at async Test.run (node:internal/test_runner/test:1404:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:969:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: 'undefined',
    expected: 'function',
    operator: 'strictEqual',
    diff: 'simple'
  }

test at tests\p33-mail-cancellation.test.mjs:62:1
✖ cancellation before any send is idempotent, lazy and does not open SMTP (1.4649ms)
  AssertionError [ERR_ASSERTION]: public cancellation port
  + actual - expected
  
  + 'undefined'
  - 'function'
  
      at file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/tests/p33-mail-cancellation.test.mjs:64:12
      at withSender (file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/tests/p33-mail-cancellation.test.mjs:19:15)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
      at async TestContext.<anonymous> (file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/tests/p33-mail-cancellation.test.mjs:63:3)
      at async Test.run (node:internal/test_runner/test:1404:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:969:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: 'undefined',
    expected: 'function',
    operator: 'strictEqual',
    diff: 'simple'
  }


Command exited with code 1
```

## Commits and outcomes

No commits; parent owns Git and review lifecycle.

## Post-change output (verbatim tool output)

Private compiler: no output, successful exit 0.

Cancellation:

```text
✔ cancelPending destroys actual in-flight DATA sockets, settles both purposes and permanently closes acceptance (37.7102ms)
✔ cancelPending during real connect settles setup exactly once and destroys the connecting socket (3.7531ms)
✔ greeting cancellation closes the real peer promptly without waiting for SMTP timeout (3.9991ms)
✔ immediate cancellation settles sends before or during socket setup and retains input validation (3.089ms)
✔ cancellation before any send is idempotent, lazy and does not open SMTP (1.3723ms)
✔ ordinary sender close remains graceful and waits for an accepted real send (6.4823ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 496.3874
```

Existing component regressions:

```text
✔ public configuration defaults and exact trusted origins/ports (2.7011ms)
✔ module rejects invalid direct configuration before SMTP connection (6.4075ms)
✔ Nest sender sends both Spanish MIME purposes and preserves the previous purpose (39.6105ms)
✔ malformed tokens/recipients never connect or capture, including header injection (8.1827ms)
✔ uppercase domains reject before SMTP; lowercase domains preserve local spelling (8.9759ms)
✔ SMTP recipient refusal and DATA refusal are sanitized, never accepted (16.5072ms)
✔ SMTP unavailability and bounded greeting timeout cannot claim acceptance (3005.7993ms)
✔ Nest close awaits in-flight send bounded by socket timeout (5013.5224ms)
✔ Nest resolves/closes sender without SMTP startup; closed sender cannot send (5.4697ms)
✔ public mailbox helper preserves trimmed delivery spelling without provider rewrites (1.819ms)
✔ public mailbox helper rejects invalid syntax, controls, length overflow and uppercase Unicode domains (1.1386ms)
✔ both sender purposes accept quoted, international and trimmed inputs (47.1176ms)
✔ invalid inputs and uppercase domains never connect; valid ASCII keeps case/dots/plus (13.1194ms)
✔ SMTP refusal, outage and closed sender preserve sanitized failure behavior (16.7749ms)
ℹ tests 14
ℹ suites 0
ℹ pass 14
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 12971.586
Mail regressions tests: exit 0
```

## Self-review by specification

- P3-A S1: one sequential bounded C1 writer; no competing writes/delegation/review/Git mutation. S2: no P3-B/C/D work or completion claim. S3: broad mailbox/uppercase rejection retained by component proof; local SMTP unchanged; encrypted outbox untouched; sensitive files never accessed.
- C1 S1–S2: existing authorized T2 correction only, no endpoints/dependencies/new services or tracking-document edits. Source-backed public hook owns sockets before connect; setup close/error/connect completion is one-shot. Terminal cancellation precedes deadline rejection. Six component cases and fourteen existing regressions pass. No speculative historical-cause claim.
- Main S4: validateInput/submit and stable sanitized MailError behavior retained and tested; no recipient/token/raw-response logging or causes. Crypto, passwords, keys and origin policy untouched.
- Main S5: same lifecycle/runOnce and unchanged 30000ms lease; active/connecting socket destruction proved at component boundary. Real outbox/HTTP deadline and durable-retry proof is prepared but deferred; no whole S5 acceptance.
- Main S6: no account/session/token/counter persistence or concurrency changes; those invariants are not newly proven by mail component checks.
- Main S7: behavior, tests, guide and attributed record kept together; unrelated work and historical failures preserved. Parent owns independent/native disposition and terminal Git actions. No post-change bounded failure required correction.

## Handoff

First unfinished task: parent proceeds sequentially to C2, then C3 successful combined strict build before integration. Deferred exact command: `node scripts/test-p33-mail-cancellation.mjs --deadline` (foreground outer timeout <=30s; fresh owned PostgreSQL only; no root compile inside). This is a materially changed trickling-response deadline candidate, not replay of old unchanged timed-out commands. The deferred test is not syntactically/type/runtime verified by private mail compilation; parent must run it against combined output and inspect cleanup/results. Full lifecycle source closure is likewise outside private compile. Existing D2 lifecycle group checks remain parent-owned. No whole T2/P3 completion or publication claimed.

Review focus: getSocket setup close/error/connect races; queued provider after terminal cancellation versus ordinary graceful close; actual socket destruction before deadline rejection; deferred test timing/owned-fixture cleanup and replacement retry; process-local regression hook's exact public entry redirection.

## Key Learnings

- Nonpooled Nodemailer transport close does not cancel an active per-send SMTP socket.
- Public getSocket socket ownership must begin before connect to cover setup cancellation.
- Incomplete SMTP response bytes can keep inactivity timers alive without accepting a message.

