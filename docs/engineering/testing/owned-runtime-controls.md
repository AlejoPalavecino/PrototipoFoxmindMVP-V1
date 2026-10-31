# Owned integration runtime controls

The P9 fixture can pause only the exact disposable services it created. Use this for local failure/recovery evidence; it neither configures production quotas nor authorizes running against retained data.

## Quick path

The existing API and production Next builds, Docker engine and locally available pinned fixture images must already be ready. This unit does not build, install or pull images.

```sh
node --test tests/p9-runtime-controls.test.mjs
node --test --test-isolation=none --test-concurrency=1 tests/p9-runtime-controls-integration.test.mjs
```

The actual test keeps its existing 330-second test / 360-second child execution budgets. It creates one owned PostgreSQL/S3-compatible storage/ClamAV/Mailpit fixture, checks real pause flags and stable endpoints, deliberately throws, and verifies actual unpause-before-destroy events plus exact owned cleanup. A fixture preparation failure is not an application failure or a passed journey. Do not automatically repeat an unavailable execution or enlarge its budget.

## Optional classroom quota

```js
await withP4IntegrationRuntime(async runtime => {
  // Configuration readback is bigint, as in the existing application policy.
  assert.equal(runtime.classroomQuotaBytes, 100000001n);
}, { classrooms: true, classroomQuotaBytes: 100000001 });
```

- Omitting the option retains the integration fixture's exact `100000000` default; classrooms remain disabled unless explicitly enabled.
- An explicit quota requires `classrooms: true` and a positive safe integer number of bytes. Strings, bigint, fractions, zero, unsafe numbers, unknown options and options that would be ignored are rejected before Docker/filesystem allocation.
- The normal application `readConfiguration` policy still admits the resulting configuration. Production configuration and numerical production quotas are unchanged.
- This control test uses `100000001`, not a 250 MB workload. Five exact maximum attachments are `5 × 50_000_000 = 250_000_000` bytes; a later joined journey must explicitly provide sufficient quota **plus existing plan/material/attempt/draft usage**, then prove actual validation, real scanning and submission. Configuration readback or mocked control tests are not that capacity proof.

## Public fixture hooks

| Hook | Result and boundary |
|---|---|
| `inspectServices()` | Synchronous sanitized `{ database, storage, scanner }` snapshots: `{ name, id, paused, host, port }`; no credentials. |
| `inspectServiceBindings()` / `inspectMailBindings()` | Synchronous service / async Mailpit diagnostic shapes: admission, pause state, expected port and live/configured binding presence with loopback classification; no owner labels or secrets. |
| `pauseDatabase()` / `resumeDatabase()` | Synchronous exact owned PostgreSQL pause/resume. Do not query a deliberately paused database. |
| `pauseStorage()` / `resumeStorage()` | Synchronous exact owned storage pause/resume. |
| `pauseScanner()` / `resumeScanner()` | Synchronous exact owned scanner pause/resume; scanner resume never resumes database/storage. A resume with no recorded pause remains a no-op. |
| `inspectMail()` | Async SMTP fixture snapshot: `{ container, volume, containerId, volumeCreatedAt, smtpPort, httpOrigin, paused }`. |
| `pauseMail()` / `resumeMail()` | Async exact Mailpit pause/resume, returning the same sanitized snapshot with current pause state. Container, volume and both loopback ports remain stable. |
| `classroomQuotaBytes` | Application-admitted bigint quota, or `undefined` if classrooms are disabled. |

All control hooks accept **no arguments**. They are not arbitrary Docker command/target adapters. Every service operation checks exact expected fixture name, runtime membership, owner label and loopback binding before mutation. Mailpit reuses its UUID label, exact name, container identity, data-volume mount/creation identity and loopback-port checks. No global prune, Compose change, shared service restart, remote context inspection or retained resource mutation is used.

Fresh admission requires live loopback bindings and an unpaused target. If an engine omits live port mappings while paused, the control may reuse only a previously admitted endpoint with the same container identity and unchanged configured loopback bindings. A fresh omission, changed identity, changed configured binding or genuinely changed live port still fails closed. Restoration does not depend on a transient live mapping, but still checks exact ownership and configured bindings before unpause.

Use `try/finally` around each outage, even though the fixture also restores every recorded paused target before normal teardown. Failed restoration attempts do not skip later targets; callback and admitted process-cleanup failures remain reported. Existing Mailpit `restart()` remains available to its original callers and may refresh random ports after stop/start; **restart is not stable-port SMTP-outage proof**. Do not restart while deliberately paused.

## Proof boundaries

Deterministic tests exercise option validation, target ownership/refusal, service-specific restoration and failure accumulation. The raw-Git baseline differential compares previous public default/classroom runtime output, existing Mailpit default/restart behavior and adjacent CLI help/rejection, with synthetic dependencies and no resources. Only the actual owned-control test can establish real Docker pause/resume/cleanup; none of these alone completes T3 joined journeys, T4 recovery acceptance or independent whole-P9 Verify.

See [the P9 feature document](../../../odd/tasks/p9-local-validation.md) and [the attributed work record](../../work-log/2026-10-19-p9-runtime-controls-worker.md) for current execution evidence and remaining work.
