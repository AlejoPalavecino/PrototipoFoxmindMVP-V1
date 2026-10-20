import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

/** Options apply only to fresh, owned integration fixtures, never production configuration. */
export function readIntegrationOptions(options = {}) {
  if (!options || Object.getPrototypeOf(options) !== Object.prototype ||
    Reflect.ownKeys(options).some(key => !['classrooms', 'classroomQuotaBytes'].includes(key))) {
    throw new TypeError('Invalid integration options');
  }
  const classrooms = options.classrooms === undefined ? false : options.classrooms;
  if (typeof classrooms !== 'boolean') throw new TypeError('Invalid classrooms option');
  const explicit = Object.hasOwn(options, 'classroomQuotaBytes');
  const classroomQuotaBytes = explicit ? options.classroomQuotaBytes : 100000000;
  if ((explicit && !classrooms) || !Number.isSafeInteger(classroomQuotaBytes) || classroomQuotaBytes < 1) {
    throw new TypeError('Invalid classroomQuotaBytes: enable classrooms and supply a positive safe integer');
  }
  return { classrooms, classroomQuotaBytes };
}

/** The only mutable targets are the three exact containers in this owned fixture. */
export function createOwnedServiceControls(runtime, run = spawnSync) {
  const definitions = { database: ['db', 5432], storage: ['s3', 8333], scanner: ['scan', 3310] };
  const paused = new Set(), admitted = new Map();
  const execute = (args, timeout) => {
    const result = run('docker', args, { encoding: 'utf8', windowsHide: true, timeout });
    if (result.error || result.status !== 0) throw new Error(`Owned integration ${args[0]} unavailable`);
    return result.stdout.trim();
  };
  const target = service => {
    const name = `foxmind-p4-${runtime.owner}-${definitions[service][0]}`;
    if (!/^[a-f0-9]{16}$/.test(runtime.owner) || !runtime.names.includes(name)) {
      throw new Error('Unowned integration resource membership');
    }
    return name;
  };
  const portKey = service => `${definitions[service][1]}/tcp`;
  const shape = bindings => bindings == null ? { present: false } : {
    present: true, count: bindings.length,
    bindings: bindings.map(binding => ({ host: binding.HostIp === '127.0.0.1' ? 'loopback' : 'not-loopback',
      port: /^[0-9]*$/.test(binding.HostPort) ? binding.HostPort : 'invalid' })),
  };
  const diagnostics = (service, resource, phase) => ({ service, phase, paused: resource.State.Paused,
    admitted: admitted.has(service), expectedPort: admitted.get(service)?.snapshot.port ?? null,
    live: shape(resource.NetworkSettings?.Ports?.[portKey(service)]),
    configured: shape(resource.HostConfig?.PortBindings?.[portKey(service)]) });
  const failBinding = (service, resource, phase) => {
    const detail = diagnostics(service, resource, phase);
    const error = new Error(`Owned integration port binding unavailable: ${JSON.stringify(detail)}`);
    error.diagnostics = detail;
    throw error;
  };
  const readOwned = service => {
    const name = target(service); let resource;
    try { resource = JSON.parse(execute(['inspect', '--format', '{{json .}}', name], 5000)); }
    catch { throw new Error('Integration resource ownership unavailable'); }
    if (resource?.Name !== `/${name}` || resource.Config?.Labels?.['foxmind.p4.owner'] !== runtime.owner ||
      typeof resource.Id !== 'string' || !resource.Id || typeof resource.State?.Paused !== 'boolean' ||
      (admitted.has(service) && resource.Id !== admitted.get(service).snapshot.id)) {
      throw new Error('Integration resource ownership unavailable');
    }
    return resource;
  };
  const validPort = raw => typeof raw === 'string' && /^[1-9][0-9]{0,4}$/.test(raw) && Number(raw) <= 65535;
  const checkConfigured = (service, resource, phase) => {
    const bindings = resource.HostConfig?.PortBindings?.[portKey(service)], prior = admitted.get(service);
    if (bindings?.length !== 1 || bindings[0].HostIp !== '127.0.0.1' ||
      !(bindings[0].HostPort === '' || validPort(bindings[0].HostPort)) ||
      (prior && JSON.stringify(resource.HostConfig.PortBindings) !== prior.configured)) failBinding(service, resource, phase);
    return bindings[0];
  };
  const inspect = (service, phase = 'inspect') => {
    const resource = readOwned(service), configured = checkConfigured(service, resource, phase), prior = admitted.get(service);
    const bindings = resource.NetworkSettings?.Ports?.[portKey(service)];
    // Some engine states omit live port mappings while paused. This is never fresh admission:
    // exact identity and immutable configured loopback bindings must still match prior admission.
    if (resource.State.Paused && prior && (bindings == null || bindings.length === 0)) {
      return { ...prior.snapshot, paused: true };
    }
    if (bindings?.length !== 1 || bindings[0].HostIp !== '127.0.0.1' || !validPort(bindings[0].HostPort) ||
      (configured.HostPort !== '' && configured.HostPort !== bindings[0].HostPort) ||
      (prior && Number(bindings[0].HostPort) !== prior.snapshot.port) || (!prior && resource.State.Paused)) {
      failBinding(service, resource, phase);
    }
    const snapshot = { name: target(service), id: resource.Id, paused: resource.State.Paused,
      host: bindings[0].HostIp, port: Number(bindings[0].HostPort) };
    if (!prior) admitted.set(service, { snapshot, configured: JSON.stringify(resource.HostConfig.PortBindings) });
    return snapshot;
  };
  const requireNoArguments = args => {
    if (args.length) throw new TypeError('Owned service controls accept no arguments');
  };
  const pause = service => {
    const before = inspect(service, 'before-pause');
    if (paused.has(service)) return before;
    if (before.paused) throw new Error('Owned integration target already paused outside this control');
    execute(['pause', before.name], 15000); paused.add(service);
    const after = inspect(service, 'after-pause');
    assert.equal(after.paused, true, 'Owned integration pause state unavailable');
    return after;
  };
  const resume = service => {
    if (!paused.has(service)) return undefined;
    const before = readOwned(service); checkConfigured(service, before, 'before-resume');
    if (before.State.Paused) execute(['unpause', target(service)], 15000);
    const current = readOwned(service); checkConfigured(service, current, 'after-resume');
    assert.equal(current.State.Paused, false, 'Owned integration resume state unavailable');
    paused.delete(service);
    return inspect(service, 'after-resume');
  };
  const controls = {
    inspectServices(...args) {
      requireNoArguments(args);
      return Object.fromEntries(Object.keys(definitions).map(service => [service, inspect(service)]));
    },
    inspectBindings(...args) {
      requireNoArguments(args);
      return Object.fromEntries(Object.keys(definitions).map(service => [service, diagnostics(service, readOwned(service), 'readback')]));
    },
    restore(...args) {
      requireNoArguments(args); const failures = [];
      for (const service of paused) {
        try { resume(service); } catch (error) { failures.push(error); }
      }
      if (failures.length) throw new AggregateError(failures, 'Owned integration restoration failed');
    },
  };
  for (const service of Object.keys(definitions)) {
    const title = service[0].toUpperCase() + service.slice(1);
    controls[`pause${title}`] = (...args) => { requireNoArguments(args); return pause(service); };
    controls[`resume${title}`] = (...args) => { requireNoArguments(args); return resume(service); };
  }
  return Object.freeze(controls);
}

/** A pause may change only Paused, not the owned identities or loopback listener endpoints. */
export function assertMailpitContinuity(before, after) {
  for (const key of ['container', 'volume', 'containerId', 'volumeCreatedAt', 'smtpPort', 'httpOrigin']) {
    assert.equal(after[key], before[key], `Mailpit ${key} changed`);
  }
}
