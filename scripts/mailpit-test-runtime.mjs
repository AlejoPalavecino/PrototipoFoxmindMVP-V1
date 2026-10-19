import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import { assertMailpitContinuity } from './p9-runtime-controls.mjs';

export const MAILPIT_IMAGE = 'axllent/mailpit:v1.31.6@sha256:23fe39e81bde596a918000b3135c0f85dc8bb4c9ea6be274b051143f3e300387';
const ownerLabel = 'com.foxmind.mailpit-test';
const execute = promisify(execFile);

async function docker(...args) {
  const { stdout } = await execute('docker', args, { timeout: 8000, maxBuffer: 1024 * 1024 });
  return stdout.trim();
}

async function inspect(kind, name) {
  try {
    return JSON.parse(await docker(kind, 'inspect', name))[0];
  } catch (error) {
    if (/No such (container|volume|object)/i.test(error.stderr ?? '')) return undefined;
    throw error;
  }
}

async function ready(httpOrigin) {
  const deadline = Date.now() + 7000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${httpOrigin}/readyz`, { signal: AbortSignal.timeout(700) });
      await response.arrayBuffer();
      if (response.ok) return;
    } catch {
      // A starting container can refuse connections until its public listener is ready.
    }
    await delay(100);
  }
  throw new Error('Mailpit public readiness timed out');
}

/** Fresh test-only storage and random loopback ports. Never operates on Compose resources. */
export async function withMailpit(callback) {
  const owner = randomUUID();
  const container = `foxmind-mail-test-${owner}`;
  const volume = `${container}-data`;

  async function owned(kind, name) {
    const resource = await inspect(kind, name);
    if (!resource) return undefined;
    const labels = kind === 'container' ? resource.Config.Labels : resource.Labels;
    assert.equal(labels?.[ownerLabel], owner, `Refusing to modify unowned ${kind}`);
    assert.equal(resource.Name, kind === 'container' ? `/${name}` : name);
    return resource;
  }

  let failure;
  let result;
  let paused = false, resumePaused;
  try {
    await docker('volume', 'create', '--label', `${ownerLabel}=${owner}`, volume);
    await docker('container', 'create', '--name', container, '--label', `${ownerLabel}=${owner}`,
      '--publish', '127.0.0.1::1025', '--publish', '127.0.0.1::8025',
      '--mount', `type=volume,source=${volume},target=/data`,
      '--env', 'MP_DATABASE=/data/mailpit.db', '--env', 'MP_DISABLE_VERSION_CHECK=true',
      '--env', 'MP_MAX_MESSAGES=500', MAILPIT_IMAGE);
    await docker('container', 'start', container);
    const instance = await owned('container', container);
    const storage = await owned('volume', volume);
    let admittedEndpoints;
    const admittedBindings = JSON.stringify(instance.HostConfig.PortBindings);
    function endpoints(current) {
      assert.equal(current.Id, instance.Id, 'Test container identity changed');
      assert.ok(current.Mounts.some(mount => mount.Name === volume && mount.Destination === '/data'));
      assert.equal(JSON.stringify(current.HostConfig?.PortBindings), admittedBindings, 'Mailpit configured bindings changed');
      for (const target of [1025, 8025]) {
        const binding = current.HostConfig.PortBindings[`${target}/tcp`];
        assert.equal(binding?.length, 1, 'Mailpit configured binding missing');
        assert.equal(binding[0].HostIp, '127.0.0.1', 'Mailpit configured binding must be loopback');
      }
      function port(target) {
        const bindings = current.NetworkSettings?.Ports?.[`${target}/tcp`];
        if (current.State.Paused && admittedEndpoints && (bindings == null || bindings.length === 0)) {
          return target === 1025 ? admittedEndpoints.smtpPort : Number(new URL(admittedEndpoints.httpOrigin).port);
        }
        assert.equal(bindings?.length, 1, `Mailpit live binding missing: target=${target},paused=${current.State.Paused}`);
        assert.equal(bindings[0].HostIp, '127.0.0.1');
        assert.match(bindings[0].HostPort, /^[1-9][0-9]{0,4}$/);
        assert.ok(Number(bindings[0].HostPort) <= 65535);
        return Number(bindings[0].HostPort);
      }
      const value = { smtpPort: port(1025), httpOrigin: `http://127.0.0.1:${port(8025)}` };
      if (current.State.Paused) {
        assert.ok(admittedEndpoints, 'Fresh Mailpit endpoint admission requires unpaused state');
        assert.deepEqual(value, admittedEndpoints, 'Paused Mailpit endpoints changed');
        return value;
      }
      admittedEndpoints = value;
      return value;
    }
    async function snapshot() {
      const current = await owned('container', container), currentStorage = await owned('volume', volume);
      assert.ok(current && currentStorage, 'Owned Mailpit resource missing');
      assert.equal(currentStorage.CreatedAt, storage.CreatedAt, 'Test volume identity changed');
      assert.equal(typeof current.State.Paused, 'boolean');
      return { container, volume, containerId: current.Id, volumeCreatedAt: currentStorage.CreatedAt,
        ...endpoints(current), paused: current.State.Paused };
    }
    const noArguments = args => assert.equal(args.length, 0, 'Mailpit controls accept no arguments');
    const runtime = {
      ...endpoints(instance),
      async inspect(...args) { noArguments(args); return snapshot(); },
      async inspectBindings(...args) {
        noArguments(args);
        const current = await owned('container', container);
        const shape = bindings => bindings == null ? { present: false } : { present: true, count: bindings.length,
          bindings: bindings.map(binding => ({ host: binding.HostIp === '127.0.0.1' ? 'loopback' : 'not-loopback',
            port: /^[0-9]*$/.test(binding.HostPort) ? binding.HostPort : 'invalid' })) };
        return { paused: current.State.Paused, ports: Object.fromEntries([1025, 8025].map(target => [target, {
          live: shape(current.NetworkSettings?.Ports?.[`${target}/tcp`]),
          configured: shape(current.HostConfig?.PortBindings?.[`${target}/tcp`]),
        }])) };
      },
      async pause(...args) {
        noArguments(args);
        const before = await snapshot();
        assertMailpitContinuity({ ...before, smtpPort: runtime.smtpPort, httpOrigin: runtime.httpOrigin }, before);
        if (paused) return before;
        assert.equal(before.paused, false, 'Mailpit already paused outside this control');
        await docker('container', 'pause', container); paused = true;
        const after = await snapshot(); assertMailpitContinuity(before, after);
        assert.equal(after.paused, true, 'Mailpit pause state unavailable');
        return after;
      },
      async resume(...args) {
        noArguments(args);
        const before = await snapshot();
        assertMailpitContinuity({ ...before, smtpPort: runtime.smtpPort, httpOrigin: runtime.httpOrigin }, before);
        if (paused && before.paused) await docker('container', 'unpause', container);
        const after = await snapshot(); assertMailpitContinuity(before, after);
        assert.equal(after.paused, false, 'Mailpit resume state unavailable');
        paused = false;
        await ready(after.httpOrigin);
        return after;
      },
      async restart() {
        assert.equal(paused, false, 'Resume owned Mailpit before restarting');
        endpoints(await owned('container', container));
        assert.ok(await owned('volume', volume), 'Test volume no longer exists');
        await docker('container', 'stop', '--time', '2', container);
        await docker('container', 'start', container);
        // Docker can reassign randomly published host ports on every start.
        const refreshed = endpoints(await owned('container', container));
        const currentStorage = await owned('volume', volume);
        assert.equal(currentStorage.CreatedAt, storage.CreatedAt, 'Test volume identity changed');
        await ready(refreshed.httpOrigin);
        Object.assign(runtime, refreshed);
        return refreshed;
      },
    };
    resumePaused = runtime.resume;
    await ready(runtime.httpOrigin);
    result = await callback(runtime);
  } catch (error) {
    failure = error;
  } finally {
    // Resume the exact paused instance before removal, preserving callback and restoration failures.
    if (paused) {
      try { await resumePaused(); }
      catch (error) { failure = failure ? new AggregateError([failure, error], 'Mailpit test/restoration failed') : error; }
    }
    // Check exact UUID label and name immediately before each removal; no pruning or Compose down.
    for (const [kind, name] of [['container', container], ['volume', volume]]) {
      try {
        if (await owned(kind, name)) {
          await docker(kind, 'rm', ...(kind === 'container' ? ['--force'] : []), name);
        }
      } catch (error) {
        failure = failure ? new AggregateError([failure, error], 'Mailpit test/cleanup failed') : error;
      }
    }
  }
  if (failure) throw failure;
  return result;
}
