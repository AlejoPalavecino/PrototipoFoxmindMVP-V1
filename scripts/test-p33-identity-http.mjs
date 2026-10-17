import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function runIdentityHttp({ prepare } = {}) {
  const { runIdentityTestProcess } = await import('./p33-test-process.mjs');
  const { withIdentityDatabase, identityTestEnvironment, compileIdentityApi } = await import('./p33-identity-test-env.mjs');
  const started = Date.now();
  let result = 1;
  try {
    await withIdentityDatabase(async ({ url, container, name, deadline }) => {
      await (prepare ?? compileIdentityApi)(deadline);
      const env = { ...process.env, ...identityTestEnvironment(), DATABASE_URL: url,
        P33_IDENTITY_ISOLATED: name, FOXMIND_API_TEST_CONTAINER: container };
      delete env.NODE_TEST_CONTEXT;
      const run = await runIdentityTestProcess(['--test', '--test-isolation=none', '--test-concurrency=1', 'tests/p33-identity-http.test.mjs'], {
        env, workMs: 26000,
      });
      if (run.stdout) process.stdout.write(run.stdout);
      if (run.stderr) process.stderr.write(run.stderr);
      if (run.errorCode || run.phase !== 'complete') console.error('Identity HTTP tests unavailable or timed out');
      result = run.status ?? 1;
    });
  } catch { console.error('Identity HTTP runner unavailable (sanitized)'); result = 1; }
  console.log(`Identity HTTP runner: exit ${result}; elapsed ${Date.now() - started}ms`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const usage = 'Usage: node scripts/test-p33-identity-http.mjs';
  if (args.length === 1 && args[0] === '--help') console.log(usage);
  else if (args.length) { console.error(usage); process.exitCode = 2; }
  else process.exitCode = await runIdentityHttp();
}
