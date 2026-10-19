import assert from 'node:assert/strict';
import test from 'node:test';

const controls = () => import('../scripts/p9-runtime-controls.mjs');
const owner = '0123456789abcdef';
function fixture() {
  const names = ['db', 's3', 'scan'].map(suffix => `foxmind-p4-${owner}-${suffix}`);
  const resources = new Map(names.map((name, index) => [name, {
    Id: `owned-${index}`, Name: `/${name}`, Config: { Labels: { 'foxmind.p4.owner': owner } },
    State: { Paused: false }, HostConfig: { PortBindings: {
      [`${[5432, 8333, 3310][index]}/tcp`]: [{ HostIp: '127.0.0.1', HostPort: String(20000 + index) }],
    } }, NetworkSettings: { Ports: {
      [`${[5432, 8333, 3310][index]}/tcp`]: [{ HostIp: '127.0.0.1', HostPort: String(20000 + index) }],
    } },
  }]));
  const actions = [];
  const runtime = { owner, names };
  let failResume, afterAction;
  const run = (_command, args) => {
    const name = args.at(-1), resource = resources.get(name);
    if (args[0] === 'inspect') return { status: resource ? 0 : 1, stdout: JSON.stringify(resource) };
    actions.push([args[0], name]);
    if (args[0] === 'unpause' && failResume === name) return { status: 1, stdout: '' };
    resource.State.Paused = args[0] === 'pause';
    afterAction?.(args[0], resource);
    return { status: 0, stdout: name };
  };
  return { runtime, resources, actions, run, failUnpause(name) { failResume = name; },
    mutateAfterAction(operation) { afterAction = operation; } };
}

test('fixture options preserve absent/default quota and accept explicit safe positive byte integers', async () => {
  const { readIntegrationOptions } = await controls();
  assert.deepEqual(readIntegrationOptions(), { classrooms: false, classroomQuotaBytes: 100000000 });
  assert.deepEqual(readIntegrationOptions({ classrooms: true }), { classrooms: true, classroomQuotaBytes: 100000000 });
  for (const quota of [1, 100000001, 250000001, Number.MAX_SAFE_INTEGER]) {
    assert.deepEqual(readIntegrationOptions({ classrooms: true, classroomQuotaBytes: quota }), {
      classrooms: true, classroomQuotaBytes: quota,
    });
  }
});

test('fixture options reject invalid, unsafe, unknown or ignored quota options before resources', async () => {
  const { readIntegrationOptions } = await controls();
  for (const quota of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '250000001', 1n, null, undefined]) {
    assert.throws(() => readIntegrationOptions({ classrooms: true, classroomQuotaBytes: quota }), /classroomQuotaBytes/);
  }
  for (const options of [null, [], true, { classrooms: 'true' }, { classrooms: null }, { classroomQuotaBytes: 1 },
    { classrooms: false, classroomQuotaBytes: 1 }, { classrooms: true, quota: 1 },
    Object.create({ classroomQuotaBytes: 1 })]) {
    assert.throws(() => readIntegrationOptions(options), /options|classrooms|classroomQuotaBytes/);
  }
});

test('each owned service pauses and resumes only its exact target; scanner never resumes data', async () => {
  const { createOwnedServiceControls } = await controls();
  const f = fixture(), runtime = createOwnedServiceControls(f.runtime, f.run);
  const before = runtime.inspectServices();
  runtime.pauseDatabase(); runtime.pauseStorage(); runtime.pauseScanner();
  assert.equal(Object.values(runtime.inspectServices()).every(item => item.paused), true);
  const scanner = runtime.resumeScanner();
  assert.equal(scanner.paused, false);
  assert.equal(runtime.inspectServices().database.paused, true);
  assert.equal(runtime.inspectServices().storage.paused, true);
  runtime.resumeDatabase(); runtime.resumeStorage(); runtime.resumeScanner();
  assert.deepEqual(runtime.inspectServices(), before);
  assert.deepEqual(f.actions, [
    ['pause', f.runtime.names[0]], ['pause', f.runtime.names[1]], ['pause', f.runtime.names[2]],
    ['unpause', f.runtime.names[2]], ['unpause', f.runtime.names[0]], ['unpause', f.runtime.names[1]],
  ]);
});

test('owned service guards reject missing membership, foreign label/name, non-loopback ports and arbitrary targets without mutation', async () => {
  const { createOwnedServiceControls } = await controls();
  for (const corrupt of [
    f => { f.runtime.names[0] = 'foreign-db'; },
    f => { f.resources.get(f.runtime.names[0]).Config.Labels['foxmind.p4.owner'] = 'foreign'; },
    f => { f.resources.get(f.runtime.names[0]).Name = '/foreign-db'; },
    f => { f.resources.get(f.runtime.names[0]).NetworkSettings.Ports['5432/tcp'][0].HostIp = '0.0.0.0'; },
  ]) {
    const f = fixture(); corrupt(f);
    assert.throws(() => createOwnedServiceControls(f.runtime, f.run).pauseDatabase(), /ownership|owned|binding/i);
    assert.deepEqual(f.actions, []);
  }
  const f = fixture(), runtime = createOwnedServiceControls(f.runtime, f.run);
  assert.throws(() => runtime.pauseDatabase('foreign-db'), /arguments/);
  assert.deepEqual(f.actions, []);
});

test('restoration tries every paused owned target and retains all admitted failures', async () => {
  const { createOwnedServiceControls } = await controls();
  const f = fixture(), runtime = createOwnedServiceControls(f.runtime, f.run);
  runtime.pauseDatabase(); runtime.pauseStorage(); runtime.pauseScanner();
  f.failUnpause(f.runtime.names[0]);
  assert.throws(() => runtime.restore(), error => error instanceof AggregateError && error.errors.length === 1);
  assert.equal(f.resources.get(f.runtime.names[0]).State.Paused, true);
  assert.equal(f.resources.get(f.runtime.names[1]).State.Paused, false);
  assert.equal(f.resources.get(f.runtime.names[2]).State.Paused, false);
  f.failUnpause(undefined); runtime.restore();
  assert.equal(Object.values(runtime.inspectServices()).every(item => !item.paused), true);
});

test('finally restoration preserves the callback failure and previous no-op resume behavior', async () => {
  const { createOwnedServiceControls } = await controls();
  const f = fixture(), runtime = createOwnedServiceControls(f.runtime, f.run), expected = new Error('fixture callback');
  assert.throws(() => {
    try { runtime.pauseDatabase(); runtime.pauseStorage(); throw expected; } finally { runtime.restore(); }
  }, error => error === expected);
  runtime.resumeScanner(); runtime.restore();
  assert.equal(Object.values(runtime.inspectServices()).every(item => !item.paused), true);
  assert.equal(f.actions.length, 4);
});

test('Mailpit continuity permits only pause-state changes, never container, volume or published-port replacement', async () => {
  const { assertMailpitContinuity } = await controls();
  const baseline = { container: 'owned-mail', volume: 'owned-mail-data', containerId: 'id',
    volumeCreatedAt: 'created', smtpPort: 21025, httpOrigin: 'http://127.0.0.1:28025', paused: false };
  assert.doesNotThrow(() => assertMailpitContinuity(baseline, { ...baseline, paused: true }));
  for (const key of ['container', 'volume', 'containerId', 'volumeCreatedAt', 'smtpPort', 'httpOrigin']) {
    assert.throws(() => assertMailpitContinuity(baseline, { ...baseline, [key]: 'changed' }), /Mailpit.*changed/);
  }
});

test('admitted paused live-port omission retains exact identity/configuration and restores normally', async () => {
  const { createOwnedServiceControls } = await controls();
  const f = fixture(), runtime = createOwnedServiceControls(f.runtime, f.run), before = runtime.inspectServices();
  const live = structuredClone(f.resources.get(f.runtime.names[0]).NetworkSettings.Ports);
  f.mutateAfterAction((action, resource) => { resource.NetworkSettings.Ports = action === 'pause' ? null : live; });
  assert.deepEqual(runtime.pauseDatabase(), { ...before.database, paused: true });
  assert.deepEqual(runtime.inspectBindings().database.live, { present: false });
  assert.deepEqual(runtime.resumeDatabase(), before.database);
});

test('omission never admits a fresh target or hides genuine port/configuration/identity changes', async () => {
  const { createOwnedServiceControls } = await controls();
  for (const corrupt of [
    resource => { resource.Id = 'replaced'; },
    resource => { resource.HostConfig.PortBindings['5432/tcp'][0].HostIp = '0.0.0.0'; },
    resource => { resource.HostConfig.PortBindings['5432/tcp'][0].HostPort = '29999'; },
    resource => { resource.NetworkSettings.Ports['5432/tcp'][0].HostPort = '29999'; },
  ]) {
    const f = fixture(), runtime = createOwnedServiceControls(f.runtime, f.run); runtime.inspectServices();
    f.mutateAfterAction((_action, resource) => corrupt(resource));
    assert.throws(() => runtime.pauseDatabase(), /ownership|binding/);
  }
  for (const paused of [false, true]) {
    const f = fixture(), resource = f.resources.get(f.runtime.names[0]);
    resource.State.Paused = paused; resource.NetworkSettings.Ports = null;
    assert.throws(() => createOwnedServiceControls(f.runtime, f.run).pauseDatabase(), /binding/);
    assert.deepEqual(f.actions, []);
  }
});
