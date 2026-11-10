import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { NestFactory } from '@nestjs/core';
import * as mailPart0 from "../.build/p33-mail/apps/api/src/modules/identity/infrastructure/mail/configuration.js";
import * as mailPart1 from "../.build/p33-mail/apps/api/src/modules/identity/infrastructure/mail/account-mail.service.js";
import * as mailPart2 from "../.build/p33-mail/apps/api/src/bootstrap/identity-mail.module.js";
import * as mailPart3 from "../.build/p33-mail/apps/api/src/modules/identity/infrastructure/mail/mailbox.js";
const mail = Object.freeze({readMailConfiguration: mailPart0.readMailConfiguration,AccountMailService: mailPart1.AccountMailService,MailModule: mailPart2.MailModule,validateMailbox: mailPart3.validateMailbox});
import { createSmtpFixture, readMimeParts } from '../scripts/mail-smtp-fixture.mjs';

// Only synthetic public inputs; assertion failures never print their values.
const token = Buffer.alloc(32, 23).toString('base64url');
const ascii = 'MiXeD.Name+course@example.test';
const quoted = '"MiXeD Name+course"@example.test';
const international = 'Üser.Name+course@bücher.test';
const invalid = [undefined, null, 42, '', ' ', 'Name <a@example.test>',
  'a@example.test,b@example.test', 'a@example.test; b@example.test',
  'a@example.test\r\nBcc: b@example.test', 'a@example.test\n', '\ta@example.test',
  'a@example.test\u0000', 'a@example.test\u007f', 'a@example.test\u0085',
  'a\ud800@example.test', 'a..b@example.test', 'a@-example.test', 'a@localhost',
  'a@[127.0.0.1]', 'a@under_score.test', 'a@example.test.',
  `${'a'.repeat(65)}@example.test`, `${'é'.repeat(33)}@example.test`,
  `a@${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(62)}.test`];
const uppercase = ['MiXeD.Name+course@EXAMPLE.test', 'a@example.TEST',
  'a@Bücher.test', 'a@bÜcher.test', 'a@Ｂücher.test'];
const errorIs = code => error => {
  assert.ok(error?.code === code && error.message === code && error.name === 'MailError', 'stable mail error');
  assert.ok(error.cause === undefined, 'no transport cause');
  const text = `${error.stack} ${JSON.stringify(error)}`;
  assert.ok(![token, ascii, quoted, international, 'fixture-private-response'].some(value => text.includes(value)), 'sanitized error');
  return true;
};
async function withSender(options, run) {
  const smtp = await createSmtpFixture(options);
  let app;
  try {
    app = await NestFactory.createApplicationContext(mail.MailModule.register({ appOrigin: 'http://127.0.0.1:3000', smtpPort: smtp.port }), { logger: false });
    await run(app.get(mail.AccountMailService), smtp, app);
  } finally { if (app) await app.close(); await smtp.close(); }
}

test('public mailbox helper preserves trimmed delivery spelling without provider rewrites', () => {
  assert.ok(typeof mail.validateMailbox === 'function', 'public helper exported');
  for (const address of [ascii, quoted, international, '"a@b"@example.test', '"a,b; c"@example.test']) {
    assert.ok(mail.validateMailbox(`  ${address}  `) === address, 'only surrounding spaces trimmed');
  }
});

test('public mailbox helper rejects invalid syntax, controls, length overflow and uppercase Unicode domains', () => {
  assert.ok(typeof mail.validateMailbox === 'function', 'public helper exported');
  for (const value of [...invalid, ...uppercase]) assert.throws(() => mail.validateMailbox(value), errorIs('MAIL_INPUT_INVALID'));
  for (const address of [`${'a'.repeat(64)}@example.test`, `${'é'.repeat(32)}@example.test`]) {
    assert.ok(mail.validateMailbox(address) === address, '64-byte local boundary accepted');
  }
});

test('both sender purposes accept quoted, international and trimmed inputs', async () => {
  await withSender({}, async (sender, smtp) => {
    for (const to of [quoted, international, ` ${ascii} `]) {
      for (const method of ['sendVerification', 'sendRecovery']) {
        const result = await sender[method]({ to, token });
        assert.ok(result.status === 'accepted', 'SMTP acceptance');
      }
    }
    assert.equal(smtp.messages.length, 6);
  });
});

test('invalid inputs and uppercase domains never connect; valid ASCII keeps case/dots/plus', async () => {
  await withSender({}, async (sender, smtp) => {
    for (const method of ['sendVerification', 'sendRecovery']) {
      for (const to of [...invalid, ...uppercase]) await assert.rejects(sender[method]({ to, token }), errorIs('MAIL_INPUT_INVALID'));
      for (const bad of [undefined, '', 'x'.repeat(42), '='.repeat(43), `${token.slice(0, -1)}B`]) {
        await assert.rejects(sender[method]({ to: ascii, token: bad }), errorIs('MAIL_INPUT_INVALID'));
      }
      await assert.rejects(sender[method](null), errorIs('MAIL_INPUT_INVALID'));
    }
    assert.equal(smtp.connections, 0);
    assert.equal(smtp.messages.length, 0);
    for (const method of ['sendVerification', 'sendRecovery']) {
      await sender[method]({ to: ascii, token, cc: 'ignored@example.test', bcc: 'ignored@example.test' });
      const message = smtp.messages.at(-1);
      assert.ok(message.envelope.to.length === 1 && message.envelope.to[0] === `<${ascii}>`, 'single unchanged envelope');
      const parts = readMimeParts(message.raw);
      assert.ok(parts.headers.includes(`To: ${ascii}`), 'unchanged visible recipient');
      assert.ok(!/^(?:Cc|Bcc):/im.test(parts.headers), 'extra recipient fields ignored');
      const path = method === 'sendVerification' ? '/verify-email' : '/recover-password';
      const lifetime = method === 'sendVerification' ? '1 hora' : '15 minutos';
      for (const body of [parts['text/plain'], parts['text/html']]) {
        assert.ok(body.includes(`http://127.0.0.1:3000${path}#token=${token}`), 'trusted fragment link');
        assert.ok(body.includes(lifetime), 'unchanged Spanish lifetime');
      }
    }
  });
});

test('SMTP refusal, outage and closed sender preserve sanitized failure behavior', async () => {
  for (const options of [{ rejectRecipient: true }, { rejectData: true }]) {
    await withSender(options, async (sender, smtp) => {
      for (const method of ['sendVerification', 'sendRecovery']) await assert.rejects(sender[method]({ to: ascii, token }), errorIs('MAIL_DELIVERY_UNAVAILABLE'));
      assert.equal(smtp.messages.length, 0);
    });
  }
  const unavailable = await createSmtpFixture();
  const smtpPort = unavailable.port;
  await unavailable.close();
  const app = await NestFactory.createApplicationContext(mail.MailModule.register({ appOrigin: 'http://127.0.0.1:3000', smtpPort }), { logger: false });
  const sender = app.get(mail.AccountMailService);
  try { await assert.rejects(sender.sendVerification({ to: ascii, token }), errorIs('MAIL_DELIVERY_UNAVAILABLE')); }
  finally { await app.close(); }
  await assert.rejects(sender.sendRecovery({ to: ascii, token }), errorIs('MAIL_DELIVERY_UNAVAILABLE'));
});
