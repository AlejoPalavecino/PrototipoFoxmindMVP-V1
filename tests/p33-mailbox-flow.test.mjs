import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { NestFactory } from '@nestjs/core';
import { domainToASCII, domainToUnicode } from 'node:url';
import { MailModule } from '../.build/p33-mail/apps/api/src/bootstrap/identity-mail.module.js';
import { AccountMailService } from '../.build/p33-mail/apps/api/src/bootstrap/identity-mail.module.js';
import { withMailpit } from '../scripts/mailpit-test-runtime.mjs';

// Public SMTP -> owned fresh Mailpit -> public inbox API. Never print recipients/links.
test('Mailpit captures broad mailboxes with equivalent wire representations for both purposes', { timeout: 25000 }, async t => {
  await withMailpit(async ({ smtpPort, httpOrigin }) => {
    const origin = 'http://127.0.0.1:3000';
    const token = Buffer.alloc(32, 29).toString('base64url');
    const app = await NestFactory.createApplicationContext(MailModule.register({ appOrigin: origin, smtpPort }), { logger: false });
    const list = async () => {
      const response = await fetch(`${httpOrigin}/api/v1/messages`);
      assert.equal(response.status, 200);
      return response.json();
    };
    try {
      const sender = app.get(AccountMailService);
      assert.equal((await list()).total, 0);
      for (const [name, to, local, domain] of [
        ['quoted local with space', '"MiXeD Name+tag"@example.test', '"MiXeD Name+tag"', 'example.test'],
        ['Unicode local and international domain', 'Üser.Name+tag@bücher.test', 'Üser.Name+tag', 'bücher.test'],
        ['trimmed ASCII case dots plus', '  MiXeD.Name+tag@example.test  ', 'MiXeD.Name+tag', 'example.test'],
      ]) {
        await t.test(name, async () => {
          for (const [method, path, lifetime] of [['sendVerification', '/verify-email', '1 hora'], ['sendRecovery', '/recover-password', '15 minutos']]) {
            const before = await list();
            const result = await sender[method]({ to, token });
            assert.ok(result.status === 'accepted', 'SMTP acceptance only');
            const after = await list();
            assert.equal(after.total, before.total + 1);
            const previous = new Set(before.messages.map(message => message.ID));
            const id = after.messages.find(message => !previous.has(message.ID))?.ID;
            assert.ok(id, 'one new message');
            const response = await fetch(`${httpOrigin}/api/v1/message/${id}`);
            assert.equal(response.status, 200);
            const message = await response.json();
            assert.equal(message.To.length, 1);
            const captured = message.To[0].Address;
            const at = captured.lastIndexOf('@');
            // Quoting is retained when needed; IDNA A-label/U-label is wire encoding,
            // never a replacement account spelling. Preserve the local part exactly.
            assert.ok(captured.slice(0, at) === local, 'wire local part preserved');
            assert.ok(domainToUnicode(captured.slice(at + 1)) === domain, 'wire domain is IDNA equivalent');
            assert.ok([domain, domainToASCII(domain)].includes(captured.slice(at + 1)), 'standard domain representation');
            for (const body of [message.Text, message.HTML]) {
              assert.ok(body.includes(`${origin}${path}#token=${token}`), 'purpose-specific fragment');
              assert.ok(body.includes(lifetime), 'unchanged Spanish lifetime');
              assert.ok(!body.includes('?token='), 'no token query');
            }
            assert.ok(!message.Subject.includes(token), 'no secret in subject');
            assert.ok(message.From.Address === 'no-reply@foxmind.test', 'fixed sender');
          }
        });
      }
      await t.test('uppercase domains reject without inbox effects', async () => {
        const before = (await list()).total;
        for (const to of ['a@EXAMPLE.test', 'a@Bücher.test', 'a@bÜcher.test']) {
          for (const method of ['sendVerification', 'sendRecovery']) {
            await assert.rejects(sender[method]({ to, token }), error => error.code === 'MAIL_INPUT_INVALID' && error.message === 'MAIL_INPUT_INVALID');
          }
        }
        assert.equal((await list()).total, before);
      });
    } finally { await app.close(); }
  });
});
