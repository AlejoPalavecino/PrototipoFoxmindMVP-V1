import test from 'node:test';
import assert from 'node:assert/strict';
import { IdentityRuntime } from './runtime.ts';

test('account application exposes no host lifecycle hooks or mail shutdown methods', () => {
  for (const method of ['onApplicationBootstrap', 'onModuleDestroy', 'stopMail', 'shutdownMail']) {
    assert.equal(method in IdentityRuntime.prototype, false, `${method} belongs to bootstrap`);
  }
});

import { loadTsModule } from '../../../../../../../tests/helpers/load-ts-module.mjs';

function lifecycleFixture(run) {
  const events = [];
  class Sender {
    async close() { events.push('sender-close'); }
    async sendVerification() { return { status: 'accepted' }; }
    async sendRecovery() { return { status: 'accepted' }; }
  }
  const { IdentityMailLifecycle } = loadTsModule('apps/api/src/bootstrap/identity-mail-lifecycle.ts', { stubs: {
    '../modules/identity/mail-delivery/infrastructure/mail/account-mail.service.ts': { AccountMailService: Sender },
    '../modules/identity/mail-delivery/infrastructure/outbox/worker.ts': { runOnce: run },
  } });
  return { lifecycle: new IdentityMailLifecycle({ mail: {}, outbox: {} }, { database: {} }), events };
}
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

test('host mail lifecycle starts once, drains the active invocation and never schedules after stopping', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0, release;
  const active = new Promise(resolve => { release = resolve; });
  const { lifecycle, events } = lifecycleFixture(async () => { calls++; await active; });
  lifecycle.start(); lifecycle.start(); t.mock.timers.tick(0); await settle();
  assert.equal(calls, 1);
  let closed = false;
  const first = lifecycle.close();
  assert.equal(lifecycle.close(), first, 'close reuses the exact shutdown promise');
  void first.then(() => { closed = true; });
  await settle(); assert.equal(closed, false); assert.deepEqual(events, []);
  release(); await first;
  assert.deepEqual(events, ['sender-close']);
  lifecycle.start(); t.mock.timers.tick(1000); await settle();
  assert.equal(calls, 1);
});

test('host mail lifecycle keeps failures contained and cancels a pending timer during stop', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0;
  const { lifecycle, events } = lifecycleFixture(async () => { calls++; throw new Error('synthetic private failure'); });
  lifecycle.start(); t.mock.timers.tick(0); await settle();
  assert.equal(calls, 1);
  await lifecycle.stop(); t.mock.timers.tick(1000); await settle();
  assert.equal(calls, 1);
  await lifecycle.close(); assert.deepEqual(events, ['sender-close']);
});

test('runtime host preserves public lifecycle entry points and delegates them to its mail lifecycle', async () => {
  const events = [];
  class MailLifecycle {
    start() { events.push('start'); }
    async stop() { events.push('stop'); }
    async close() { events.push('close'); }
  }
  const { IdentityRuntime: HostRuntime } = loadTsModule('apps/api/src/bootstrap/identity-runtime.ts', { stubs: {
    './identity-mail-lifecycle.ts': { IdentityMailLifecycle: MailLifecycle },
    '../modules/identity/accounts/infrastructure/store-adapter.ts': { createIdentityStoreAdapter: store => ({ store }) },
    '../modules/identity/mail-delivery/infrastructure/outbox/repository.ts': {},
    '../modules/identity/accounts/infrastructure/security/verifiers.ts': {},
    '../modules/identity/mail-delivery/infrastructure/mail/mailbox.ts': {},
  } });
  const runtime = new HostRuntime({ security: {}, mail: {}, outbox: {} }, {}, {});
  runtime.onApplicationBootstrap();
  await runtime.stopMail(); await runtime.shutdownMail(); await runtime.onModuleDestroy();
  assert.deepEqual(events, ['start', 'stop', 'close', 'close']);
});
