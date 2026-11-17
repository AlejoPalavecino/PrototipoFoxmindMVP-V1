import 'reflect-metadata';
import assert from 'node:assert/strict';
import { Socket } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { AccountMailService } from '../.build/p33-mail/apps/api/src/bootstrap/identity-mail.module.js';
import { createSmtpFixture } from '../scripts/mail-smtp-fixture.mjs';

const input = { to: 'Cancellation@example.test', token: Buffer.alloc(32, 31).toString('base64url') };
const unavailable = error => {
  assert.ok(error?.name === 'MailError' && error.code === 'MAIL_DELIVERY_UNAVAILABLE' && error.message === error.code, 'typed unavailable');
  assert.equal(error.cause, undefined);
  assert.ok(![input.to, input.token, 'fixture-private-response'].some(value => `${error.stack} ${JSON.stringify(error)}`.includes(value)), 'sanitized failure');
  return true;
};
async function withSender(options, run) {
  const smtp = await createSmtpFixture(options);
  const sender = new AccountMailService({ smtpPort: smtp.port, appOrigin: 'http://127.0.0.1:3000' });
  try { await run(sender, smtp); }
  finally { await sender.onModuleDestroy(); await smtp.close(); }
}

test('cancelPending destroys actual in-flight DATA sockets, settles both purposes and permanently closes acceptance', { timeout: 2500 }, async t => {
  await withSender({ stallData: true }, async (sender, smtp) => {
    assert.equal(typeof sender.cancelPending, 'function', 'public cancellation port');
    const connect = Socket.prototype.connect;
    const sockets = [];
    t.mock.method(Socket.prototype, 'connect', function (...args) {
      sockets.push(this);
      return connect.apply(this, args);
    });
    const first = assert.rejects(sender.sendVerification(input), unavailable);
    const second = assert.rejects(sender.sendRecovery(input), unavailable);
    await smtp.dataReceived;
    sender.cancelPending(); sender.cancelPending();
    assert.ok(sockets.length >= 1 && sockets.every(socket => socket.destroyed), 'actual client sockets destroyed synchronously');
    await Promise.all([first, second, sender.onModuleDestroy(), smtp.waitForIdle()]);
    assert.equal(smtp.activeConnections, 0);
    await assert.rejects(sender.sendVerification(input), unavailable);
    await assert.rejects(sender.sendRecovery(input), unavailable);
    assert.equal(smtp.messages.length, 0);
    assert.ok(smtp.connections >= 1 && smtp.connections <= 2, 'owned connections only');
  });
});

test('cancelPending during real connect settles setup exactly once and destroys the connecting socket', { timeout: 2500 }, async t => {
  await withSender({}, async (sender, smtp) => {
    assert.equal(typeof sender.cancelPending, 'function', 'public cancellation port');
    const connect = Socket.prototype.connect;
    let connecting = false, closes = 0;
    let socketClosed;
    const closed = new Promise(resolve => { socketClosed = resolve; });
    t.mock.method(Socket.prototype, 'connect', function (...args) {
      const result = connect.apply(this, args);
      connecting = this.connecting;
      this.once('close', () => { closes++; socketClosed(); });
      sender.cancelPending(); sender.cancelPending();
      return result;
    });
    await assert.rejects(sender.sendVerification(input), unavailable);
    await closed;
    assert.equal(connecting, true, 'real net.Socket was connecting at cancellation');
    assert.equal(closes, 1, 'single socket close, no duplicate setup completion');
    await assert.rejects(sender.sendRecovery(input), unavailable);
    await sender.onModuleDestroy();
    assert.equal(smtp.messages.length, 0);
  });
});

test('greeting cancellation closes the real peer promptly without waiting for SMTP timeout', { timeout: 2500 }, async () => {
  await withSender({ stallGreeting: true }, async (sender, smtp) => {
    const sending = assert.rejects(sender.sendRecovery(input), unavailable);
    while (!smtp.connections) await delay(1);
    sender.cancelPending();
    await Promise.all([sending, sender.onModuleDestroy(), smtp.waitForIdle()]);
    assert.equal(smtp.activeConnections, 0);
    assert.equal(smtp.messages.length, 0);
  });
});

test('immediate cancellation settles sends before or during socket setup and retains input validation', { timeout: 2500 }, async () => {
  await withSender({}, async (sender, smtp) => {
    const sending = assert.rejects(sender.sendVerification(input), unavailable);
    sender.cancelPending();
    await Promise.all([sending, sender.onModuleDestroy()]);
    await assert.rejects(sender.sendRecovery({ ...input, token: 'invalid' }), { code: 'MAIL_INPUT_INVALID' });
    await assert.rejects(sender.sendRecovery({ ...input, to: 'Reject@EXAMPLE.test' }), { code: 'MAIL_INPUT_INVALID' });
    assert.equal(smtp.messages.length, 0);
  });
});

test('cancellation before any send is idempotent, lazy and does not open SMTP', async () => {
  await withSender({}, async (sender, smtp) => {
    assert.equal(typeof sender.cancelPending, 'function', 'public cancellation port');
    sender.cancelPending(); sender.cancelPending();
    await assert.rejects(sender.sendVerification(input), unavailable);
    await assert.rejects(sender.sendRecovery(input), unavailable);
    assert.equal(smtp.connections, 0);
  });
});

test('ordinary sender close remains graceful and waits for an accepted real send', { timeout: 2500 }, async t => {
  await withSender({}, async (sender, smtp) => {
    const connect = Socket.prototype.connect;
    let closing, finished = false;
    t.mock.method(Socket.prototype, 'connect', function (...args) {
      const result = connect.apply(this, args);
      // The send is already in progress; close from the next microtask before greeting/DATA.
      queueMicrotask(() => { closing = sender.onModuleDestroy().then(() => { finished = true; }); });
      return result;
    });
    const sending = sender.sendVerification(input);
    await delay(0);
    assert.equal(finished, false, 'close drains rather than cancels ordinary SMTP');
    assert.deepEqual(await sending, { status: 'accepted' });
    await closing;
    assert.equal(finished, true);
    assert.equal(smtp.messages.length, 1);
    await assert.rejects(sender.sendRecovery(input), unavailable);
  });
});
