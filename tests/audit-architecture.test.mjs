import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
test('startup rejects invalid base configuration before resolving heavy runtime modules', () => {
  const hook = `import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, nextResolve) {
  if (['@nestjs/', '@prisma/', '@aws-sdk/'].some(prefix => specifier.startsWith(prefix)) || specifier === 'nodemailer' || specifier.startsWith('nodemailer/')) throw new Error('HEAVY_RUNTIME_RESOLVED');
  return nextResolve(specifier, context);
} });`;
  const preload = `data:text/javascript,${encodeURIComponent(hook)}`;
  const env = Object.fromEntries(['PATH', 'SystemRoot', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP']
    .filter(key => process.env[key]).map(key => [key, process.env[key]]));
  const main = '.build/api/apps/api/src/main.js';
  const cases = [
    { DATABASE_URL: 'not-a-postgres-url', API_PORT: '0', error: 'Invalid configuration: DATABASE_URL must be a PostgreSQL connection URL.\n' },
    { DATABASE_URL: 'postgresql://127.0.0.1/dummy', API_PORT: '65536', error: 'Invalid configuration: API_PORT must be an integer from 0 to 65535.\n' },
  ];
  for (const { error, ...input } of cases) {
    const result = spawnSync(process.execPath, ['--import', preload, main], { env: { ...env, ...input }, encoding: 'utf8', timeout: 1500 });
    assert.equal(result.status, 1, `invalid base configuration must exit promptly; signal=${result.signal ?? 'none'}`);
    assert.equal(result.stdout, ''); assert.equal(result.stderr, error);
    assert.doesNotMatch(result.stderr, /HEAVY_RUNTIME_RESOLVED/);
  }
});

test('base configuration shares the error class and preserves URL and port rules', async () => {
  const base = await import('../.build/api/apps/api/src/configuration-base.js');
  const full = await import('../.build/api/apps/api/src/configuration.js');
  assert.equal(base.ConfigurationError, full.ConfigurationError);
  const valid = 'postgresql://127.0.0.1/dummy';
  const urlError = 'Invalid configuration: DATABASE_URL must be a PostgreSQL connection URL.';
  const portError = 'Invalid configuration: API_PORT must be an integer from 0 to 65535.';
  for (const url of [undefined, 'not-a-url', 'mysql://127.0.0.1/db', 'postgresql://127.0.0.1/']) {
    assert.throws(() => base.readBaseConfiguration({ DATABASE_URL: url, API_PORT: '65536' }), { name: 'Error', message: urlError });
  }
  for (const port of ['', '-1', '65536', '12x']) {
    assert.throws(() => base.readBaseConfiguration({ DATABASE_URL: valid, API_PORT: port }), { name: 'Error', message: portError });
  }
  for (const [raw, expected] of [[undefined, 3001], ['0', 0], ['65535', 65535]]) {
    assert.deepEqual(base.readBaseConfiguration({ DATABASE_URL: valid, API_PORT: raw }), { databaseUrl: valid, port: expected });
  }
});
