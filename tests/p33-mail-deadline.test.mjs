import 'reflect-metadata';
import assert from 'node:assert/strict';
import { Socket } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { createApplication } from '../.build/api/apps/api/src/application.js';
import { readConfiguration } from '../.build/api/apps/api/src/configuration.js';
import { IdentityRuntime } from '../.build/api/apps/api/src/bootstrap/identity-runtime.js';
import { AccountMailService } from '../.build/api/apps/api/src/modules/identity/mail-delivery/infrastructure/mail/account-mail.service.js';
import { createSmtpFixture } from '../scripts/mail-smtp-fixture.mjs';

// Deferred integration proof: successful parent combined build + fresh owned DB only.
if (process.send) { process.send({ type: 'foxmind-test-ready' }); process.disconnect(); }
if (!/^foxmind-identity-[a-f0-9]+$/.test(process.env.P33_IDENTITY_ISOLATED ?? '')) throw new Error('Owned deadline runner required');
const origin = 'http://127.0.0.1:3000';
async function until(check, ms, label) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await check()) return; await delay(20); }
  assert.fail(label);
}
async function start(port) {
  const app = await createApplication(readConfiguration({ ...process.env, MAIL_SMTP_PORT: String(port) }));
  await app.listen(0, '127.0.0.1');
  return { app, base: `http://127.0.0.1:${app.getHttpServer().address().port}/api/v1` };
}
function request(base, path, body) {
  return fetch(`${base}${path}`, { method: body ? 'POST' : 'GET',
    headers: body ? { Origin: origin, 'Content-Type': 'application/json' } : {},
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(2000) });
}

test('real HTTP issuance: absolute SMTP deadline cancels before rejection, stops overlap, closes promptly and preserves durable retry', { timeout: 22000 }, async t => {
  // Partial bytes keep SMTP activity alive past the 5s inactivity timeout, but
  // never accept DATA. This is a different candidate from the historical stall.
  const peer = await createSmtpFixture({ stallData: true, trickleData: true });
  const healthyPeer = await createSmtpFixture();
  let active, restarted;
  const sockets = [];
  let cancellation = 0;
  const connect = Socket.prototype.connect;
  const cancel = AccountMailService.prototype.cancelPending;
  t.mock.method(Socket.prototype, 'connect', function (...args) {
    // Track only real SMTP sockets; HTTP and PostgreSQL are not sender resources.
    const options = args[0];
    if (options?.host === '127.0.0.1' && options.port === peer.port) sockets.push(this);
    return connect.apply(this, args);
  });
  t.mock.method(AccountMailService.prototype, 'cancelPending', function () {
    cancel.call(this);
    cancellation++;
    assert.ok(sockets.length > 0 && sockets.every(socket => socket.destroyed), 'socket destruction happens inside cancellation before deadline rejection');
  });
  const email = 'DeadlineRetry@example.test';
  const password = 'Synthetic deadline password 😀';
  try {
    active = await start(peer.port);
    const response = await request(active.base, '/auth/register', { email, password, firstName: 'Deadline', lastName: 'Fixture', accountRole: 'student' });
    assert.equal(response.status, 202);
    assert.deepEqual(await response.json(), { status: 'accepted' });
    await until(() => peer.activeConnections === 1, 2000, 'SMTP connection absent');
    await Promise.race([peer.dataReceived, delay(2000).then(() => assert.fail('SMTP DATA absent'))]);
    const began = Date.now();
    assert.equal((await request(active.base, '/auth/session')).status, 200, 'HTTP remains responsive while SMTP stalls');
    await until(() => cancellation === 1, 14000, 'absolute sender deadline absent');
    assert.ok(Date.now() - began >= 10000, 'activity did not turn this into a 5s inactivity failure');
    await peer.waitForIdle();
    assert.equal(peer.activeConnections, 0);
    assert.equal(peer.messages.length, 0);
    await delay(350);
    assert.equal(peer.connections, 1, 'terminal deadline never schedules another send');
    const closingAt = Date.now();
    await Promise.all([active.app.get(IdentityRuntime).stopMail(), active.app.get(IdentityRuntime).stopMail()]);
    await active.app.close(); active = undefined;
    assert.ok(Date.now() - closingAt < 1000, 'shutdown does not await an orphan SMTP operation');
    assert.equal(cancellation, 1);
    restarted = await start(healthyPeer.port);
    await until(() => healthyPeer.messages.length === 1, 3000, 'durable retry was not preserved for replacement lifecycle');
    assert.equal((await request(restarted.base, '/auth/login', { email, password })).status, 200, 'account survives failed transport');
    assert.equal(healthyPeer.messages.length, 1);
  } finally {
    // Close peers first on an assertion failure so cleanup cannot leave a stalled send.
    await peer.close(); await healthyPeer.close();
    if (active) await active.app.close();
    if (restarted) await restarted.app.close();
  }
});
