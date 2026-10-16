import { spawnSync } from 'node:child_process';
import { withIdentityDatabase, identityTestEnvironment, compileIdentityApi } from './p33-identity-test-env.mjs';

// The original health/configuration/lifecycle contracts now start the real identity module too.
let result = 1;
const started = Date.now();
try {
  await withIdentityDatabase(async ({ url, container, deadline }) => {
    compileIdentityApi(deadline);
    const env = { ...process.env, ...identityTestEnvironment(), DATABASE_URL: url,
      FOXMIND_TEST_DATABASE: 'isolated-container', FOXMIND_API_TEST_CONTAINER: container };
    delete env.NODE_TEST_CONTEXT;
    const run = spawnSync(process.execPath, ['--test', '--test-concurrency=1', 'tests/backend.test.mjs'], {
      env, encoding: 'utf8', timeout: Math.max(1, deadline - Date.now()), windowsHide: true,
    });
    console.log(run.stdout ?? '');
    console.error(run.stderr ?? '');
    if (run.error) console.error('Backend contract tests unavailable or timed out');
    result = run.status ?? 1;
  });
} catch { console.error('Backend test runner unavailable (sanitized)'); result = 1; }
console.log(`Backend runner: exit ${result}; elapsed ${Date.now() - started}ms`);
process.exitCode = result;
