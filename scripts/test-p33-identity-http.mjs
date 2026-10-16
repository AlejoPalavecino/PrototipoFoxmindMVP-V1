import { spawnSync } from 'node:child_process';
import { withIdentityDatabase, identityTestEnvironment, compileIdentityApi } from './p33-identity-test-env.mjs';

const started = Date.now();
let result = 1;
try {
  await withIdentityDatabase(async ({ url, container, name, deadline }) => {
    compileIdentityApi(deadline);
    const env = { ...process.env, ...identityTestEnvironment(), DATABASE_URL: url,
      P33_IDENTITY_ISOLATED: name, FOXMIND_API_TEST_CONTAINER: container };
    delete env.NODE_TEST_CONTEXT;
    const run = spawnSync(process.execPath, ['--test', '--test-concurrency=1', 'tests/p33-identity-http.test.mjs'], {
      env, encoding: 'utf8', timeout: Math.max(1, deadline - Date.now()), windowsHide: true,
    });
    console.log(run.stdout ?? '');
    console.error(run.stderr ?? '');
    if (run.error) console.error('Identity HTTP tests unavailable or timed out');
    result = run.status ?? 1;
  });
} catch { console.error('Identity HTTP runner unavailable (sanitized)'); result = 1; }
console.log(`Identity HTTP runner: exit ${result}; elapsed ${Date.now() - started}ms`);
process.exitCode = result;
