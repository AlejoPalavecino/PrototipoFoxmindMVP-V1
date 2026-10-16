# P3.3 T3-D — One-shot fixture setup diagnosis completed

- Agent / role: read-only technical diagnostic verifier; scratch instrumentation only.
- Task: mvbj715b-a-zw2c.
- Parent/persisted by: coordinator01a14539-ab7b-77dc-8eee-546a8c3dd168, from final child report. Child wrote no repository record/source.
- Date: 2026-10-16.
- Branch / observed HEAD: feat/p33-token-flows /33fd80f62b9735e43124dc2df1a4d12c81f01c8a; existing uncommitted candidate preserved.
- Phase/spec: P3.3 T3-D/S9, odd/tasks/p33-token-flows.md.
- Status: completed for bounded diagnosis only; fixture setup failed; T3 acceptance pending.
- Changes/commits: runtime-owned scratch only; no repository writes/commits. No post-run Git comparison.

## Scope and observation

User authorized one distinct setup-only diagnosis, not an auth fix, larger limits or suite/RED replay. Agent read helper, parent record, feature, roadmap/protocol, package metadata and both original parent logs. Exactly one instrumented withIdentityDatabase invocation.

**Current observed failure: container-run exceeded its unchanged4000ms Docker timeout.** Health polling, port inspection, PostgreSQL connection, migrations and callback were not reached. Owned removal returned0. Why Docker exceeded its budget and historical parent causality remain unproven.

## Exact command/results

From original project cwd: `node /tmp/p33-fixture-diagnostic.ZTyws4/outer.mjs`.

Preparation `node "$S/prepare.mjs" && node --check "$S/probe.mjs"`: exit0, no correction. Probe exit1/4305ms; foreground supervisor exit1/4362ms, no supervisor timeout/signal, configured29500ms cap. No retry, sweep, compiler, HTTP, account state or suite.

Exact captured stdout:

```jsonl
{"stage":"container-run","elapsedms":4015,"timeoutms":4000,"status":null,"signal":"SIGTERM","errorcode":"ETIMEDOUT","stdoutbytes":0,"stderrbytes":0}
{"stage":"cleanup-inspect","elapsedms":201,"timeoutms":1000,"status":1,"signal":null,"errorcode":null,"stdoutbytes":1,"stderrbytes":57}
{"stage":"cleanup-remove","elapsedms":48,"timeoutms":2000,"status":0,"signal":null,"errorcode":null,"stdoutbytes":0,"stderrbytes":0}
Owned identity database cleanup: exit 0
{"probe":"DOCKER_UNAVAILABLE","exit":1,"elapsedms":4305,"ready":false,"firstFailure":"container-run","cleanup":{"stage":"cleanup-remove","elapsedms":48,"timeoutms":2000,"status":0,"signal":null,"errorcode":null,"stdoutbytes":0,"stderrbytes":0}}
```

Captured stderr empty. Supervisor exact result:

```json
{"status":1,"signal":null,"errorcode":null,"elapsedms":4362,"timeoutms":29500}
```

Cleanup inspection failed separately; raw error was not recorded/printed. Removal then returned0, which is the observed cleanup result, not an independent inventory sweep.

## Identity and instrumentation

Original scripts/p33-identity-test-env.mjs. Only two substitutions in scratch helper: from 'node:child_process' to './spawn.mjs', and from 'pg' to './pg.mjs'. All other helper bytes/body/arguments/options/loop/migration order/cleanup retained. Budgets unchanged: Docker4s/work26s/query2s/cleanup1s+2s. Installed pg resolved read-only through createRequire rooted at project package.json; no dependency copy/install.

Reported SHA-256 identities:

| File | SHA-256 |
|---|---|
| original helper | a3a403b6ad7d22f4b66f949660a4fc3e822d719e0b5e179a119eab58414c81a0 |
| helper.mjs | 86e680750b60d2c4b6330235eb0dc29d239bc5cb6f2abce1cb63b6302dbda76a |
| probe.mjs | 78667db459aced63c6bfdc2babe350d237ce41f3ba45b16797497d151e5d3b3a |
| spawn.mjs | 329ccb120cefb53ac0f3024072daae2af45f2f3b454ada46d01ae2fdf6687fa8 |
| pg.mjs | 84f67eb2001979c495f0ca4f834536692b71d84171cb4f84a9bbcaf4ca4b9e50 |
| trace.mjs | 61e89c88f9d4e86da7c09556a52072a552a563d36942f1d21ae4b626f967de48 |
| outer.mjs | 747b9c8414fbc800dae7ce82234a7f0042f0f8ea1b43c192fd314c3282519b7f |
| prepare.mjs | 6db12297c7587dcef36fd5f9481e43f6e4dbd8e094965c2d6dff50b8673cde14 |

Scratch reported: /tmp/p33-fixture-diagnostic.ZTyws4; native C:/Users/alejo/AppData/Local/Temp/gp6ujMrn/gamkqTx6/p33-fixture-diagnostic.ZTyws4/. It contains instrumentation, identity.json, stdout.log/stderr.log/result.json. Parent persisted returned trace, did not read external scratch or assert durable retention.

## Conclusion and exact handoff

Observed current synchronous Docker launch returned ETIMEDOUT at4015ms with no captured stream bytes; this is fixture launch failure, not observed app/auth failure. Why it exceeded4000ms, whether original parent failed at this same stage and historical causality remain unknown. No code fix or higher limit is justified by this trace alone.

Retain setup blocker and original evidence. Further Docker-level diagnosis or fixture/suite invocation requires separately bounded disposition; none ran in this assignment. No functional/security/T3/P3/P4/native approval or source change. Current accepted API status remains seven.

## Key Learnings

- Current fixture launch timed out before health checks or PostgreSQL connection.
- Failed cleanup inspection and successful removal are distinct observed results.
- A new instrumented failure does not establish historical causality.
