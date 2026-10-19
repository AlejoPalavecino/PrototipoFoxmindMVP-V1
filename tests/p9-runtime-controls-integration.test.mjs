import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import nodemailer from 'nodemailer';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';

function docker(args) {
  const result = spawnSync('docker', args, { encoding: 'utf8', windowsHide: true, timeout: 15000 });
  if (result.error || result.status !== 0) throw new Error(`Owned control proof Docker ${args[0]} unavailable`);
  return result.stdout.trim();
}

// One fixture only; a callback failure deliberately exercises each helper's final restoration.
test('P9 exact owned service controls preserve identities, configured quota and cleanup after callback failure',
  { timeout: 330000 }, async t => {
    const marker = new Error('Intentional owned-control callback failure');
    let services, mail, since;
    const step = async (name, operation) => {
      let failure;
      await t.test(name, async () => {
        try { await operation(); } catch (error) { failure = error; throw error; }
      });
      if (failure) throw failure; // Do not run dependent proof after a preparation/assertion failure.
    };
    await assert.rejects(withP4IntegrationRuntime(async runtime => {
      services = runtime.inspectServices(); mail = await runtime.inspectMail();
      since = new Date(Date.now() - 1000).toISOString();
      await step('owned optional quota is admitted by unchanged application configuration', async () => {
        assert.equal(runtime.classroomQuotaBytes, 100000001n);
        assert.equal((await runtime.db.query('SELECT 1 AS ready')).rows[0].ready, 1);
        assert.equal(Object.values(services).every(service => !service.paused), true);
      });
      await step('foreign target arguments are refused with unchanged real owned states', async () => {
        assert.throws(() => runtime.pauseDatabase(mail.container), /arguments/);
        await assert.rejects(runtime.pauseMail(services.database.name), /arguments/);
        assert.deepEqual(runtime.inspectServices(), services);
        assert.deepEqual(await runtime.inspectMail(), mail);
      });
      await step('each exact database, storage and scanner target pauses and resumes independently', async () => {
        for (const [service, title] of [['database', 'Database'], ['storage', 'Storage'], ['scanner', 'Scanner']]) {
          try {
            t.diagnostic(JSON.stringify({ phase: 'before-pause', service, binding: runtime.inspectServiceBindings()[service] }));
            const paused = runtime[`pause${title}`]();
            t.diagnostic(JSON.stringify({ phase: 'after-pause', service, binding: runtime.inspectServiceBindings()[service] }));
            assert.equal(paused.name, services[service].name); assert.equal(paused.paused, true);
            const states = runtime.inspectServices();
            for (const key of Object.keys(services)) assert.equal(states[key].paused, key === service);
          } finally {
            try { t.diagnostic(JSON.stringify({ phase: 'before-finally-resume', service, binding: runtime.inspectServiceBindings()[service] })); }
            finally { runtime[`resume${title}`](); }
          }
          t.diagnostic(JSON.stringify({ phase: 'after-resume', service, binding: runtime.inspectServiceBindings()[service] }));
          assert.deepEqual(runtime.inspectServices(), services);
        }
      });
      await step('scanner-only resume never unpauses database or storage', async () => {
        try {
          runtime.pauseDatabase(); runtime.pauseStorage(); runtime.pauseScanner(); runtime.resumeScanner();
          const states = runtime.inspectServices();
          assert.equal(states.scanner.paused, false);
          assert.equal(states.database.paused, true); assert.equal(states.storage.paused, true);
        } finally { runtime.resumeScanner(); runtime.resumeStorage(); runtime.resumeDatabase(); }
        assert.deepEqual(runtime.inspectServices(), services);
      });
      await step('Mailpit pause/resume keeps exact container, volume and both published ports', async () => {
        try {
          t.diagnostic(JSON.stringify({ phase: 'before-mail-pause', binding: await runtime.inspectMailBindings() }));
          const paused = await runtime.pauseMail();
          t.diagnostic(JSON.stringify({ phase: 'after-mail-pause', binding: await runtime.inspectMailBindings() }));
          assert.deepEqual(paused, { ...mail, paused: true });
          assert.deepEqual(await runtime.inspectMail(), paused);
        } finally { await runtime.resumeMail(); }
        assert.deepEqual(await runtime.inspectMail(), mail);
        t.diagnostic(JSON.stringify({ phase: 'after-mail-resume', binding: await runtime.inspectMailBindings() }));
        const transport = nodemailer.createTransport({ host: '127.0.0.1', port: mail.smtpPort,
          secure: false, ignoreTLS: true, connectionTimeout: 2000, greetingTimeout: 2000, socketTimeout: 2000,
          logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true });
        try { assert.equal(await transport.verify(), true); } finally { transport.close(); }
        assert.equal((await fetch(`${mail.httpOrigin}/readyz`, { signal: AbortSignal.timeout(1000) })).status, 200);
      });
      runtime.pauseDatabase(); runtime.pauseStorage(); runtime.pauseScanner(); await runtime.pauseMail();
      t.diagnostic(JSON.stringify({ phase: 'before-callback-throw-finally', services: runtime.inspectServiceBindings(), mail: await runtime.inspectMailBindings() }));
      throw marker;
    }, { classrooms: true, classroomQuotaBytes: 100000001 }).catch(error => {
      const collect = value => [...(value.diagnostics ? [value.diagnostics] : []), ...(value.errors ?? []).flatMap(collect)];
      t.diagnostic(JSON.stringify({ phase: 'after-finally', controlFailures: collect(error), callbackMarkerPreserved: error === marker }));
      throw error;
    }), error => error === marker);
    await step('finally emits actual unpause before destroy for every exact owned target and removes owned resources', async () => {
      const identities = [...Object.values(services).map(service => ({ id: service.id, name: service.name })),
        { id: mail.containerId, name: mail.container }];
      const lines = docker(['events', '--since', since, '--until', new Date().toISOString(), '--filter', 'type=container',
        ...identities.flatMap(item => ['--filter', `container=${item.id}`]), '--format', '{{json .}}']);
      const events = lines.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
      for (const item of identities) {
        const actions = events.filter(event => event.Actor.ID === item.id).map(event => event.Action);
        const lastPause = actions.lastIndexOf('pause'), restored = actions.lastIndexOf('unpause'), removed = actions.lastIndexOf('destroy');
        assert.ok(lastPause >= 0 && restored > lastPause && removed > restored, `${item.name}: resume precedes owned removal`);
        const result = spawnSync('docker', ['container', 'inspect', '--format', '{{.State.Paused}}', item.id],
          { encoding: 'utf8', windowsHide: true, timeout: 5000 });
        assert.equal(result.status, 1, 'Owned container removed');
      }
      const prefix = services.database.name.slice(0, -3);
      for (const volume of [`${prefix}-db-data`, `${prefix}-s3-data`, mail.volume]) {
        const result = spawnSync('docker', ['volume', 'inspect', '--format', '{{.Name}}', volume],
          { encoding: 'utf8', windowsHide: true, timeout: 5000 });
        assert.equal(result.status, 1, 'Owned volume removed');
      }
      const network = spawnSync('docker', ['network', 'inspect', '--format', '{{.Name}}', prefix],
        { encoding: 'utf8', windowsHide: true, timeout: 5000 });
      assert.equal(network.status, 1, 'Owned network removed');
      assert.equal(docker(['container', 'ls', '--all', '--filter', `label=foxmind.p4.owner=${prefix.slice('foxmind-p4-'.length)}`, '--format', '{{.ID}}']), '');
      t.diagnostic(`Exact owned control cleanup: ${identities.length} containers, 3 volumes; actual pause/unpause/destroy ordering confirmed.`);
    });
  });
