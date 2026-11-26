import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { account, api } from './p4-integration-helpers.mjs';

test('account helper retains verification when the same mailbox also contains an invitation', { timeout: 15000 }, async () => {
  const originalFetch = globalThis.fetch;
  const link = `http://127.0.0.1:3000/verify-email#token=${'A'.repeat(43)}`;
  const email = 'fixture@example.test';
  try {
    for (const order of [['verification', 'invitation'], ['invitation', 'verification']]) {
      const visits = [];
      const element = () => ({ fill: async () => {}, click: async () => {}, waitFor: async () => {} });
      const page = { goto: async url => { visits.push(url); }, getByLabel: element,
        getByRole: element, getByText: element, waitForURL: async () => {}, on: () => {}, off: () => {},
        evaluate: async () => ({ status: 200, body: { user: { id: 'fixture-user' } } }) };
      globalThis.fetch = async url => Response.json(url.endsWith('/messages')
        ? { messages: order.map(ID => ({ ID, To: [{ Address: email }] })) }
        : { Text: url.endsWith('/verification') ? link : 'http://127.0.0.1:3000/mis-aulas?invitacion=fixture' });
      assert.equal((await account(page, 'http://127.0.0.1:3000', 'http://inbox.test', email)).id, 'fixture-user');
      assert.equal(visits.at(-1), link);
    }
  } finally { globalThis.fetch = originalFetch; }
});

for (const method of ['POST', 'PUT', 'PATCH']) {
  test(`real browser test helper obtains fresh CSRF for ${method}`, async () => {
    const seen = [];
    const page = { evaluate: (fn, args) => runInNewContext(`(${fn.toString()})(args)`, {
      args, fetch: async (url, options) => {
        seen.push({ url, options });
        return url.endsWith('/csrf') ? Response.json({ csrfToken: 'fresh-fixture' }) : Response.json({ saved: true });
      },
    }) };
    const result = await api(page, method, '/classrooms/drafts', {});
    assert.equal(result.status, 200);
    assert.equal(seen[0].url, '/api/v1/auth/csrf');
    assert.equal(seen[1].options.headers['x-csrf-token'], 'fresh-fixture');
  });
}

test('P5 lock keeps independent accepted CSS versions and Vite dependency closure', () => {
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  assert.equal(lock.packages['node_modules/postcss'].version, '8.5.23');
  assert.equal(lock.packages['node_modules/lightningcss'].version, '1.32.0');
  assert.equal(lock.packages['node_modules/vite/node_modules/postcss'].version, '8.5.30');
  assert.equal(lock.packages['node_modules/vite/node_modules/lightningcss'].version, '1.33.0');
});

for (const [args, expected] of [[['--help'], 0], [['--invalid'], 2], [['--help', '--invalid'], 2]]) {
  test(`P5 integration CLI ${args.join(' ')} never starts fixtures`, () => {
    const result = spawnSync(process.execPath, ['scripts/test-p5-integration.mjs', ...args], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
    assert.equal(result.status, expected);
    assert.match(result.stdout + result.stderr, /Usage: node scripts\/test-p5-integration\.mjs/);
    assert.doesNotMatch(result.stdout + result.stderr, /Prisma generation|database\/storage\/scanner ready/);
  });
}
