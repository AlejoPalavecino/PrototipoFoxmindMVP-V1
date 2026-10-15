import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import nodemailer from 'nodemailer';

const image = 'axllent/mailpit:v1.31.6@sha256:23fe39e81bde596a918000b3135c0f85dc8bb4c9ea6be274b051143f3e300387';

function composeConfiguration(ports = {}) {
  const environment = {
    ...process.env, COMPOSE_DISABLE_ENV_FILE: '1', POSTGRES_PASSWORD: '',
    MAIL_SMTP_PORT: '', MAIL_HTTP_PORT: '', ...ports,
  };
  delete environment.COMPOSE_ENV_FILES;
  return JSON.parse(execFileSync('docker', [
    'compose', '-p', 'foxmind-mail-local', '-f', 'compose.mail.yaml', 'config', '--format', 'json',
  ], { encoding: 'utf8', timeout: 5000, env: environment }));
}

test('capture Compose is independent, pinned, loopback-only and persistent', async () => {
  // Check the missing-file contract before importing the implementation (intentional RED).
  await readFile(new URL('../compose.mail.yaml', import.meta.url), 'utf8');
  const config = composeConfiguration();
  assert.deepEqual(Object.keys(config.services), ['mailpit']);
  const service = config.services.mailpit;
  assert.equal(service.image, image);
  assert.equal(service.depends_on, undefined);
  assert.deepEqual(service.ports.map(({ host_ip, target, published }) => [host_ip, target, published]), [
    ['127.0.0.1', 1025, '1025'], ['127.0.0.1', 8025, '8025'],
  ]);
  assert.deepEqual(service.environment, {
    MP_DATABASE: '/data/mailpit.db', MP_DISABLE_VERSION_CHECK: 'true', MP_MAX_MESSAGES: '500',
  });
  assert.deepEqual(service.volumes.map(({ type, source, target }) => [type, source, target]), [
    ['volume', 'mailpit-data', '/data'],
  ]);
  assert.deepEqual(Object.keys(config.volumes), ['mailpit-data']);
  const custom = composeConfiguration({ MAIL_SMTP_PORT: '11025', MAIL_HTTP_PORT: '18025' });
  assert.deepEqual(custom.services.mailpit.ports.map(({ host_ip, target, published }) => [host_ip, target, published]), [
    ['127.0.0.1', 1025, '11025'], ['127.0.0.1', 8025, '18025'],
  ]);
});

test('isolated SMTP capture survives restart and never uses the development inbox', { timeout: 24000 }, async (t) => {
  const { withMailpit, MAILPIT_IMAGE } = await import('../scripts/mailpit-test-runtime.mjs');
  assert.equal(MAILPIT_IMAGE, image);
  let firstOrigin;
  await withMailpit(async (runtime) => {
    let { smtpPort, httpOrigin } = runtime;
    firstOrigin = httpOrigin;
    assert.match(httpOrigin, /^http:\/\/127\.0\.0\.1:\d+$/);
    assert.ok(Number.isInteger(smtpPort) && smtpPort > 0);
    assert.equal((await fetch(`${httpOrigin}/readyz`)).status, 200);
    assert.equal((await (await fetch(`${httpOrigin}/api/v1/messages`)).json()).total, 0);
    const smtpConfiguration = {
      host: '127.0.0.1', port: smtpPort, secure: false, ignoreTLS: true,
      connectionTimeout: 2000, greetingTimeout: 2000, socketTimeout: 2000,
      logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true,
    };
    const transport = nodemailer.createTransport(smtpConfiguration);
    try {
      const sent = await transport.sendMail({
        from: 'FoxMind Capture <capture@foxmind.test>', to: 'recipient@example.test',
        subject: 'Capture persistence fixture', text: 'Local capture only.',
        html: '<p>Local capture only.</p>',
      });
      assert.deepEqual(sent.accepted, ['recipient@example.test']);
    } finally {
      transport.close();
    }
    const before = await (await fetch(`${httpOrigin}/api/v1/messages`)).json();
    assert.equal(before.total, 1);
    const id = before.messages[0].ID;
    const checkMessage = async () => {
      const response = await fetch(`${httpOrigin}/api/v1/message/${id}`);
      assert.equal(response.status, 200);
      const message = await response.json();
      assert.equal(message.Subject, 'Capture persistence fixture');
      assert.equal(message.To.length, 1);
      assert.equal(message.To[0].Address, 'recipient@example.test');
      assert.match(message.Text, /Local capture only\./);
      assert.match(message.HTML, /<p>Local capture only\.<\/p>/);
    };
    await checkMessage();
    const original = { smtpPort, httpOrigin };
    const refreshed = await runtime.restart();
    ({ smtpPort, httpOrigin } = refreshed);
    firstOrigin = httpOrigin;
    assert.deepEqual({ smtpPort: runtime.smtpPort, httpOrigin: runtime.httpOrigin }, refreshed);
    assert.match(httpOrigin, /^http:\/\/127\.0\.0\.1:\d+$/);
    t.diagnostic(`stop/start endpoints: ${JSON.stringify({ before: original, after: refreshed })}`);
    // Exercise both refreshed public listeners; unchanged ports are also valid on other hosts.
    const resumedTransport = nodemailer.createTransport({ ...smtpConfiguration, port: smtpPort });
    try {
      assert.equal(await resumedTransport.verify(), true);
    } finally {
      resumedTransport.close();
    }
    assert.equal((await fetch(`${httpOrigin}/readyz`)).status, 200);
    assert.equal((await (await fetch(`${httpOrigin}/api/v1/messages`)).json()).total, 1);
    await checkMessage();
  });
  // A fresh invocation must have an empty inbox, even after the previous message persisted.
  await withMailpit(async ({ httpOrigin }) => {
    assert.equal((await (await fetch(`${httpOrigin}/api/v1/messages`)).json()).total, 0);
  });
  await assert.rejects(fetch(`${firstOrigin}/readyz`, { signal: AbortSignal.timeout(1000) }));
});
