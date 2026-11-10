import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { NestFactory } from '@nestjs/core';
import { MailModule } from '../.build/api/apps/api/src/bootstrap/identity-mail.module.js';
import { AccountMailService } from '../.build/api/apps/api/src/modules/identity/infrastructure/mail/account-mail.service.js';
import { readMailConfiguration } from '../.build/api/apps/api/src/modules/identity/infrastructure/mail/configuration.js';
import { withMailpit } from '../scripts/mailpit-test-runtime.mjs';

// Real SMTP and public inbox API; fixtures are not issued account tokens.
test('Nest sender captures both account messages in an isolated Mailpit inbox', { timeout: 25000 }, async () => {
  await withMailpit(async ({ smtpPort, httpOrigin }) => {
    const origin = 'http://127.0.0.1:3000';
    const token = Buffer.alloc(32, 7).toString('base64url');
    const app = await NestFactory.createApplicationContext(MailModule.register(readMailConfiguration({
      APP_ORIGIN: origin, MAIL_SMTP_PORT: String(smtpPort),
    })), { logger: false });
    try {
      const sender = app.get(AccountMailService);
      const list = async () => (await fetch(`${httpOrigin}/api/v1/messages`)).json();
      assert.equal((await list()).total, 0);
      await assert.rejects(sender.sendVerification({ to: 'Fixture@EXAMPLE.test', token }), { message: 'MAIL_INPUT_INVALID' });
      assert.equal((await list()).total, 0);
      for (const [method, path, lifetime] of [
        ['sendVerification', '/verify-email', '1 hora'],
        ['sendRecovery', '/recover-password', '15 minutos'],
      ]) {
        const before = await list();
        assert.deepEqual(await sender[method]({ to: 'Fixture.Name+tag@example.test', token }), { status: 'accepted' });
        const after = await list();
        assert.equal(after.total, before.total + 1);
        const previousIds = new Set(before.messages.map(message => message.ID));
        const id = after.messages.find(message => !previousIds.has(message.ID)).ID;
        const response = await fetch(`${httpOrigin}/api/v1/message/${id}`);
        assert.equal(response.status, 200);
        const message = await response.json();
        assert.deepEqual(message.To.map(recipient => recipient.Address), ['Fixture.Name+tag@example.test']);
        for (const body of [message.Text, message.HTML]) {
          assert.ok(body.includes(`${origin}${path}#token=${token}`));
          assert.ok(body.includes(lifetime));
          assert.ok(!body.includes('?token='));
        }
        assert.ok(!message.Subject.includes(token));
        assert.equal(message.From.Address, 'no-reply@foxmind.test');
      }
    } finally {
      await app.close();
    }
  });
});
