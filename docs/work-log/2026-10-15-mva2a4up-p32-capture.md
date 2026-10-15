# P3.2 — Bounded capture restart correction continuation

- Agent / role: scoped capture implementation writer, resumed by coordinator.
- Session or task ID: `mva2a4up-b-nag0` (continuation; not the original run).
- Date: 2026-10-15.
- Branch / worktree: `feat/p32-mail-capture`, existing shared worktree.
- Starting commit: `71ce2931184e7c543f7272bee81d7d2902dac9c9`.
- Phase and detailed task/spec links: P3.2, [T1 / S1, S3, S4 and L12](../../odd/tasks/p32-local-email.md).
- Prior evidence: [original task mva1tryy-9-dhuu](2026-10-15-mva1tryy-p32-capture.md), retained unchanged.
- Status: completed (scoped capture continuation; not whole P3.2).

## Request and scope

User explicitly authorized «Autorizar diagnóstico y una corrección acotada». One additional owned-container port-binding diagnostic (foreground 30-second bound), one cohesive correction batch, then exactly one `node --test --test-concurrency=1 tests/p32-mail-capture.test.mjs` foreground check (30-second bound). No repeat after any timeout/new failure. Diagnose before/after stop/start, preserve ownership/volume/message identity, refresh endpoint values, verify persistence and separate invocation isolation. Unchanged Compose development ports, no DB/dev inbox modification, no sensitive environment-file access, native review or Git mutations. Parent handles sender policy separately. Risk item 5 is environment/container configuration; item 2 is ownership/isolation guards.

## Work performed

Read updated task/spec through L12 and current assigned harness/tests/guide. Prior injected work-unit skill remains loaded. `git status --short && git branch --show-current && git rev-parse HEAD` exited 0 (10-second bound): same branch/HEAD; coordinator changes to AGENTS/roadmap/work-record protocol/packages and parent/sender untracked source/docs/tests exist and remain untouched. This separate record precedes continuation diagnostic/source changes. Re-read current AGENTS, work-record protocol and roadmap. The roadmap still retains the prior blocked checkpoint; L12 and this explicitly authorized continuation supersede that checkpoint for this bounded task only. Shared status reconciliation remains the coordinator's responsibility.

## Verification

Prior RED and failures remain attributed only to the original record; this continuation does not turn them into historical passes.

### Bounded diagnosis — observed root cause

One foreground `node --input-type=module <<'NODE' ... NODE` diagnostic (exact script below), tool timeout 30 seconds, subprocess timeouts 4 seconds, exited 0. It used the existing `withMailpit` helper for fresh resource creation/initial readiness/finally cleanup; discovered its container from the unique SMTP publication; checked exact UUID owner labels/names and owned mount; inspected bindings before and after stop/start. Actual result: SMTP 58737→58745 and HTTP 58738→58747, all on 127.0.0.1. Container ID, volume name and volume creation timestamp stayed identical. Thus cached endpoint staleness is now diagnosed, not merely suspected. No sensitive-file reads, development resources or DB were involved. Cleanup returned without errors. Verified discovery saved to project `protipofoxmind` (memory observation 5265).

Exact diagnostic command:
```sh
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { withMailpit } from './scripts/mailpit-test-runtime.mjs';
const execute = promisify(execFile);
const docker = async (...args) => (await execute('docker', args, { timeout: 4000 })).stdout.trim();
await withMailpit(async ({ smtpPort }) => {
  const listed = await docker('container', 'ls', '--filter', 'label=com.foxmind.mailpit-test', '--format', '{{.Names}}\t{{.Ports}}');
  const matches = listed.split('\n').filter(line => line.includes(`127.0.0.1:${smtpPort}->1025/tcp`));
  assert.equal(matches.length, 1);
  const name = matches[0].split('\t')[0];
  assert.match(name, /^foxmind-mail-test-[0-9a-f-]+$/);
  const owner = name.slice('foxmind-mail-test-'.length);
  const volume = `${name}-data`;
  const readOwned = async () => {
    const container = JSON.parse(await docker('container', 'inspect', name))[0];
    const storage = JSON.parse(await docker('volume', 'inspect', volume))[0];
    assert.equal(container.Name, `/${name}`);
    assert.equal(container.Config.Labels['com.foxmind.mailpit-test'], owner);
    assert.equal(storage.Name, volume);
    assert.equal(storage.Labels['com.foxmind.mailpit-test'], owner);
    assert.ok(container.Mounts.some(mount => mount.Name === volume && mount.Destination === '/data'));
    for (const target of ['1025/tcp', '8025/tcp']) {
      assert.equal(container.NetworkSettings.Ports[target].length, 1);
      assert.equal(container.NetworkSettings.Ports[target][0].HostIp, '127.0.0.1');
    }
    return { id: container.Id, volume: storage.Name, created: storage.CreatedAt, ports: container.NetworkSettings.Ports };
  };
  const before = await readOwned();
  console.log('before stop/start:', JSON.stringify(before));
  await docker('container', 'stop', '--time', '2', name);
  await docker('container', 'start', name);
  const after = await readOwned();
  console.log('after stop/start:', JSON.stringify(after));
  assert.equal(after.id, before.id);
  assert.equal(after.volume, before.volume);
  assert.equal(after.created, before.created);
  console.log('same owned container/volume; bindings changed:', JSON.stringify(after.ports) !== JSON.stringify(before.ports));
});
console.log('diagnostic complete; owned finally cleanup returned without errors');
NODE
```

Observed stdout (stderr empty, exit 0):
```text
before stop/start: {"id":"c75d19dd558636ebe2997864537894630a00e62ddb41696cf55fcc451a3bbe1a","volume":"foxmind-mail-test-814e9380-29f2-4efe-8838-6af9b2e752d0-data","created":"2026-10-15T21:40:37Z","ports":{"1025/tcp":[{"HostIp":"127.0.0.1","HostPort":"58737"}],"8025/tcp":[{"HostIp":"127.0.0.1","HostPort":"58738"}]}}
after stop/start: {"id":"c75d19dd558636ebe2997864537894630a00e62ddb41696cf55fcc451a3bbe1a","volume":"foxmind-mail-test-814e9380-29f2-4efe-8838-6af9b2e752d0-data","created":"2026-10-15T21:40:37Z","ports":{"1025/tcp":[{"HostIp":"127.0.0.1","HostPort":"58745"}],"8025/tcp":[{"HostIp":"127.0.0.1","HostPort":"58747"}]}}
same owned container/volume; bindings changed: true
diagnostic complete; owned finally cleanup returned without errors
```

### One cohesive correction batch

- `scripts/mailpit-test-runtime.mjs`: inspect current bindings after every start; retain the same owned container ID and mounted volume; compare volume creation identity across restart; validate each published port is single-bound to 127.0.0.1. `restart()` waits for refreshed readiness, updates the shared runtime properties and returns fresh `{smtpPort,httpOrigin}`. UUID-label/name checks before restart and finally cleanup remain intact.
- `tests/p32-mail-capture.test.mjs`: consume returned fresh endpoints, assert runtime properties match them, log before/after bindings, exercise the refreshed SMTP listener with real `verify()` handshake and HTTP readiness/API, assert the same message ID/text/HTML remains, and finish the second fresh empty-inbox invocation plus closed-endpoint cleanup check.
- `docs/local-email.md`: document updated restart return values, mutable runtime endpoint properties and why callers must not retain destructured pre-restart ports. No change to development Compose port bindings or dotenv protections.
- No source changes beyond this single cohesive batch; prior original record and shared parent/sender files were not edited.

### Exactly one focused check — PASS

`node --test --test-concurrency=1 tests/p32-mail-capture.test.mjs`, foreground with a 30-second tool timeout and existing 24-second runtime-test timeout: exit 0, 2/2 pass, 0 failures/skips, total 3755.1934ms. This was the only continuation focused-check invocation; no repeat or additional suite was run. Observed stdout (stderr empty):
```text
✔ capture Compose is independent, pinned, loopback-only and persistent (259.1896ms)
✔ isolated SMTP capture survives restart and never uses the development inbox (3357.565ms)
ℹ stop/start endpoints: {"before":{"smtpPort":65160,"httpOrigin":"http://127.0.0.1:65161"},"after":{"smtpPort":65168,"httpOrigin":"http://127.0.0.1:65167"}}
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3755.1934
```

Strict TDD evidence: RED is the actually observed original post-restart readiness failure retained in the prior task record (latest original invocation exit 1, 1/2 pass). This continuation did not rerun RED: the explicit grant allowed one diagnostic, one batch and one focused check only. GREEN is this newly observed 2/2 pass. TRIANGULATE: both refreshed listeners, same message ID/text/HTML after restart, same storage/container identity and second independent empty inbox passed. Bugfix and verified result saved to project `protipofoxmind` (updated observation 5265).

## Self-review: assigned S1/S3/S4 only

- S1: real SMTP acceptance and public capture/persistence now pass. No mocked/HTTP-send shortcut and no account/authentication, token issuance/consumption, encrypted-outbox or remote delivery claim.
- S3: original independent pinned Mailpit Compose/default/custom-port and dotenv-disabled checks still pass. Runtime refreshes only its isolated loopback endpoints; actual diagnostic proves same owned storage and changing ports. Public message inspection proves persistence without SQLite internals. Second call is fresh/empty. No PostgreSQL, development inbox, fixed development Compose ports or sensitive environment files changed.
- S4: correction stays in infrastructure harness/test/guide plus this separately attributed continuation record. Parent owns shared task/roadmap, sender policy, integration, verification/review and Git actions. No native review requested/invoked.
- Risk item 5 (environment/container configuration): requires Docker daemon and cached pinned image; environment/config tests explicitly disable implicit dotenv and remove inherited COMPOSE_ENV_FILES. Random test ports may change after each restart; callers must use refreshed endpoint values. Production exposure/security and platform variants are not proved by this local run.
- Risk item 2 (ownership/isolation guards): exact UUID labels/names, container/mount/storage identity and loopback checks are retained. Test success/closed endpoint checks cover ordinary finally cleanup, not hostile Docker-administrator races, adversarial label substitution or forced termination. No global prune/development volume removal is performed.

## Commits and outcomes

No commits or publication; parent owns Git and review lifecycle. Scoped continuation PASS is newly observed evidence only; previous failures remain unchanged and attributed to their original run. Whole T1/P3.2 completion is not claimed.

## Handoff

Scoped correction is complete. First unfinished product task is parent-owned sender→SMTP→capture integration and independent acceptance/review, followed by shared checkpoint reconciliation. Read this record alongside original task history; do not attribute new proof to the original run.

Rollback boundary: continuation changes in scripts/mailpit-test-runtime.mjs, tests/p32-mail-capture.test.mjs and docs/local-email.md plus this record; revert only this correction if necessary. The complete original capture slice additionally owns compose.mail.yaml and its original record. Never remove retained development inbox data or alter parent/sender/shared files as rollback. No development service was started by this continuation.
