import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { NestFactory } from "@nestjs/core";
import { AccountMailService, MailModule, readMailConfiguration } from "../.build/api/apps/api/src/mail/index.js";
import { createSmtpFixture, readMimeParts } from "../scripts/mail-smtp-fixture.mjs";

// Synthetic public fixtures only; never load account state or environment secrets.
const token = Buffer.alloc(32, 17).toString("base64url");
const to = "MiXeD+course@example.test";
const config = smtpPort => ({ appOrigin: "http://127.0.0.1:3000", smtpPort });
const errorIs = code => error => {
  assert.equal(error.code, code);
  assert.equal(error.message, code);
  assert.equal(error.name, "MailError");
  assert.equal(error.cause, undefined);
  for (const secret of [token, to, "fixture-private-response", "PRIVATE"]) {
    assert.ok(!`${error.stack} ${JSON.stringify(error)}`.includes(secret), "sanitized error only");
  }
  return true;
};
async function context(configuration) {
  return NestFactory.createApplicationContext(MailModule.register(configuration), { logger: false, abortOnError: false });
}
async function withSender(options, run) {
  const smtp = await createSmtpFixture(options);
  let app;
  try { app = await context(config(smtp.port)); await run(app.get(AccountMailService), smtp, app); }
  finally { if (app) await app.close(); await smtp.close(); }
}

test("public configuration defaults and exact trusted origins/ports", () => {
  assert.deepEqual(readMailConfiguration({}), config(1025));
  for (const origin of ["https://foxmind.example", "http://localhost:3000", "http://[::1]:3000"]) {
    assert.deepEqual(readMailConfiguration({ APP_ORIGIN: origin, MAIL_SMTP_PORT: "65535" }), { appOrigin: origin, smtpPort: 65535 });
  }
  for (const port of ["", "0", "-1", "65536", "1.2", "12x", " 1025", "01025"]) {
    assert.throws(() => readMailConfiguration({ MAIL_SMTP_PORT: port }), errorIs("MAIL_CONFIGURATION_INVALID"));
  }
  for (const origin of ["", "http://example.test", "https://u:PRIVATE@example.test", "https://example.test/path", "https://example.test/", "https://example.test?PRIVATE", "https://example.test#PRIVATE", "https://example.test?", "https://example.test#", "https://EXAMPLE.test", "https://example.test\r\nPRIVATE", "http://127.1:3000", "ftp://example.test", "https://example.test\\PRIVATE"]) {
    assert.throws(() => readMailConfiguration({ APP_ORIGIN: origin }), errorIs("MAIL_CONFIGURATION_INVALID"));
  }
});

test("module rejects invalid direct configuration before SMTP connection", async () => {
  const smtp = await createSmtpFixture();
  try {
    for (const bad of [{ ...config(smtp.port), smtpPort: 0 }, { ...config(smtp.port), appOrigin: "http://remote.test" }, null]) {
      assert.throws(() => MailModule.register(bad), errorIs("MAIL_CONFIGURATION_INVALID"));
    }
    assert.equal(smtp.connections, 0);
    assert.equal(smtp.messages.length, 0);
  } finally { await smtp.close(); }
});

test("Nest sender sends both Spanish MIME purposes and preserves the previous purpose", async () => {
  await withSender({}, async (service, smtp) => {
    for (const [method, path, lifetime, subject] of [
      ["sendVerification", "/verify-email", "1 hora", "Verifica"],
      ["sendRecovery", "/recover-password", "15 minutos", "Recupera"],
      ["sendVerification", "/verify-email", "1 hora", "Verifica"],
    ]) {
      assert.deepEqual(await service[method]({ to, token, cc: "ignored@example.test", bcc: "ignored@example.test", from: "ignored@example.test", subject: "ignored" }), { status: "accepted" });
      const message = smtp.messages.at(-1);
      assert.deepEqual(message.envelope, { from: "<no-reply@foxmind.test>", to: [`<${to}>`] });
      const parts = readMimeParts(message.raw);
      assert.match(parts.headers, /^From: no-reply@foxmind\.test$/m);
      assert.ok(parts.headers.includes(`To: ${to}`));
      assert.match(parts.headers, new RegExp(`^Subject: ${subject}`, "m"));
      assert.doesNotMatch(parts.headers, /^(?:Cc|Bcc):/im);
      const link = `http://127.0.0.1:3000${path}#token=${token}`;
      for (const type of ["text/plain", "text/html"]) {
        assert.ok(parts[type].includes(link), "purpose link remains in fragment");
        assert.ok(parts[type].includes(lifetime), "correct fixed lifetime");
        assert.ok(parts[type].includes("Si no solicitaste"));
        assert.ok(!parts[type].includes(path === "/verify-email" ? "/recover-password" : "/verify-email"));
      }
      assert.ok(parts["text/html"].includes(`href="${link}"`));
      assert.ok(!parts.headers.includes(token));
    }
    assert.equal(smtp.messages.length, 3);
    assert.equal(smtp.connections, 3, "no SMTP pooling");
  });
});

test("malformed tokens/recipients never connect or capture, including header injection", async () => {
  await withSender({}, async (service, smtp) => {
    const badTokens = [undefined, "", "x".repeat(42), "x".repeat(44), "=".repeat(43), `${token.slice(0, -1)}B`, `${token}\r\nBcc: hidden@example.test`];
    const badRecipients = [undefined, "", "A <a@example.test>", "a@example.test,b@example.test", "a@example.test\r\nBcc: b@example.test", "a@example.test\u0000", "a@example.test\u007f", "a@example.test\u0085", "a@example.test\n", "a@example.test\r", "a..b@example.test", "a@-example.test"];
    for (const method of ["sendVerification", "sendRecovery"]) {
      for (const bad of badTokens) await assert.rejects(service[method]({ to, token: bad }), errorIs("MAIL_INPUT_INVALID"));
      for (const bad of badRecipients) await assert.rejects(service[method]({ to: bad, token }), errorIs("MAIL_INPUT_INVALID"));
      await assert.rejects(service[method](null), errorIs("MAIL_INPUT_INVALID"));
    }
    assert.equal(smtp.connections, 0);
    assert.equal(smtp.messages.length, 0);
    assert.deepEqual(await service.sendRecovery({ to, token }), { status: "accepted" });
    assert.equal(smtp.messages.length, 1, "invalid inputs do not poison later valid send");
  });
});

test("uppercase domains reject before SMTP; lowercase domains preserve local spelling", async () => {
  await withSender({}, async (service, smtp) => {
    for (const method of ["sendVerification", "sendRecovery"]) {
      for (const address of ["MiXeD.Name+course@EXAMPLE.test", "MiXeD.Name+course@example.TEST", "MiXeD.Name+course@Example.test"]) {
        const before = { connections: smtp.connections, messages: smtp.messages.length };
        await assert.rejects(service[method]({ to: address, token }), error => {
          errorIs("MAIL_INPUT_INVALID")(error);
          assert.ok(!`${error.stack} ${JSON.stringify(error)}`.includes(address));
          return true;
        });
        assert.equal(smtp.connections, before.connections);
        assert.equal(smtp.messages.length, before.messages);
      }
    }
    assert.equal(smtp.connections, 0);
    assert.equal(smtp.messages.length, 0);
    const address = "MiXeD.Name+course@example.test";
    for (const method of ["sendVerification", "sendRecovery"]) {
      assert.deepEqual(await service[method]({ to: address, token }), { status: "accepted" });
      const message = smtp.messages.at(-1);
      assert.deepEqual(message.envelope.to, [`<${address}>`]);
      assert.ok(readMimeParts(message.raw).headers.includes(`To: ${address}`));
    }
    assert.equal(smtp.messages.length, 2);
    assert.equal(smtp.connections, 2);
  });
});

test("SMTP recipient refusal and DATA refusal are sanitized, never accepted", async () => {
  for (const option of [{ rejectRecipient: true }, { rejectData: true }]) {
    await withSender(option, async (service, smtp) => {
      for (const method of ["sendVerification", "sendRecovery"]) {
        await assert.rejects(service[method]({ to, token }), errorIs("MAIL_DELIVERY_UNAVAILABLE"));
      }
      assert.equal(smtp.messages.length, 0);
    });
  }
});

test("SMTP unavailability and bounded greeting timeout cannot claim acceptance", async () => {
  const unavailable = await createSmtpFixture();
  const port = unavailable.port;
  await unavailable.close();
  const app = await context(config(port));
  try { await assert.rejects(app.get(AccountMailService).sendVerification({ to, token }), errorIs("MAIL_DELIVERY_UNAVAILABLE")); }
  finally { await app.close(); }
  await withSender({ stallGreeting: true }, async (service, smtp) => {
    await assert.rejects(service.sendRecovery({ to, token }), errorIs("MAIL_DELIVERY_UNAVAILABLE"));
    assert.equal(smtp.messages.length, 0);
  });
});

test("Nest close awaits in-flight send bounded by socket timeout", async () => {
  await withSender({ stallData: true }, async (service, smtp, app) => {
    const sending = assert.rejects(service.sendVerification({ to, token }), errorIs("MAIL_DELIVERY_UNAVAILABLE"));
    await smtp.dataReceived;
    let closed = false;
    const closing = app.close().then(() => { closed = true; });
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(closed, false, "close waits for active SMTP operation");
    await Promise.all([sending, closing]);
    assert.equal(closed, true);
    assert.equal(smtp.messages.length, 0);
    await assert.rejects(service.sendRecovery({ to, token }), errorIs("MAIL_DELIVERY_UNAVAILABLE"));
  });
});

test("Nest resolves/closes sender without SMTP startup; closed sender cannot send", async () => {
  const smtp = await createSmtpFixture();
  let app;
  try {
    const configuration = config(smtp.port);
    app = await context(configuration);
    const service = app.get(AccountMailService);
    configuration.smtpPort = 1;
    configuration.appOrigin = "https://changed.example";
    assert.equal(smtp.connections, 0, "registration is standalone and lazy");
    await service.sendVerification({ to, token });
    assert.ok(readMimeParts(smtp.messages[0].raw)["text/plain"].includes("http://127.0.0.1:3000/verify-email"));
    await app.close();
    await assert.rejects(service.sendRecovery({ to, token }), errorIs("MAIL_DELIVERY_UNAVAILABLE"));
    assert.equal(smtp.messages.length, 1);
    assert.equal(smtp.connections, 1);
  } finally { if (app) await app.close(); await smtp.close(); }
});
