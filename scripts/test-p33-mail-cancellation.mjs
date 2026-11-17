import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const modes = ['--cancellation', '--regressions', '--deadline'];
const usage = 'Usage: node scripts/test-p33-mail-cancellation.mjs [--cancellation|--regressions|--deadline]';
function runTests(mode, files, deadline, additionalEnv = {}, imports = []) {
  const env = { ...process.env, ...additionalEnv };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, [...imports, '--test', '--test-concurrency=1', ...files], {
    env, encoding: 'utf8', windowsHide: true, timeout: Math.max(1, deadline - Date.now()),
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) console.error('Mail checks unavailable or timed out');
  console.log(`Mail ${mode.slice(2)} tests: exit ${result.status ?? 'unavailable'}`);
  return result.status ?? 1;
}

export async function runMailCancellation(mode = '--cancellation', { prepare } = {}) {
  if (!modes.includes(mode)) throw new Error('Invalid mail check mode');
  if (mode === '--deadline') {
    const { runIdentityTestProcess } = await import('./p33-test-process.mjs');
    const { withIdentityDatabase, identityTestEnvironment, compileIdentityApi } = await import('./p33-identity-test-env.mjs');
    try {
      return await withIdentityDatabase(async ({ url, name, deadline }) => {
        // Standalone deadline use now compiles; the coordinator alone supplies preparation.
        await (prepare ?? compileIdentityApi)(deadline);
        const env = { ...process.env, ...identityTestEnvironment(), DATABASE_URL: url, P33_IDENTITY_ISOLATED: name };
        delete env.NODE_TEST_CONTEXT;
        const result = await runIdentityTestProcess(['--test', '--test-isolation=none', '--test-concurrency=1', 'tests/p33-mail-deadline.test.mjs'], {
          env, workMs: 26000,
        });
        if (result.stdout) process.stdout.write(result.stdout);
        if (result.stderr) process.stderr.write(result.stderr);
        if (result.errorCode || result.phase !== 'complete') console.error('Mail checks unavailable or timed out');
        console.log(`Mail deadline tests: exit ${result.status ?? 'unavailable'}`);
        return result.status ?? 1;
      });
    } catch { console.error('Owned mail deadline runner unavailable (sanitized)'); return 1; }
  }
  // Private mail compilation remains an explicit prerequisite for component modes.
  if (mode === '--regressions') {
    // Run the original assertions against the private canonical mail closure.
    const mailEntries = [
      "apps/api/src/modules/identity/mail-delivery/infrastructure/mail/account-mail.service.js",
      "apps/api/src/modules/identity/mail-delivery/infrastructure/mail/configuration.js",
      "apps/api/src/bootstrap/identity-mail.module.js",
      "apps/api/src/modules/identity/mail-delivery/infrastructure/mail/mailbox.js",
      "apps/api/src/modules/identity/mail-delivery/infrastructure/mail/mail-error.js",
      "apps/api/src/modules/identity/mail-delivery/infrastructure/mail/templates.js"
    ];
    const redirects = Object.fromEntries(mailEntries.map(entry => [
      pathToFileURL(resolve('.build/api', entry)).href,
      pathToFileURL(resolve('.build/p33-mail', entry)).href,
    ]));
    const source = `import { registerHooks } from 'node:module';
      const redirects = ${JSON.stringify(redirects)};
      registerHooks({ resolve(specifier, context, nextResolve) {
        const url = context.parentURL && new URL(specifier, context.parentURL).href;
        return nextResolve(redirects[url] ?? specifier, context);
      } });`;
    const hook = `data:text/javascript,${encodeURIComponent(source)}`;
    return runTests(mode, ['tests/p32-mailer.test.mjs', 'tests/p33-mailbox.test.mjs'], Date.now() + 26000, {}, ['--import', hook]);
  }
  return runTests(mode, ['tests/p33-mail-cancellation.test.mjs'], Date.now() + 26000);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') console.log(usage);
  else if (args.length > 1 || (args.length && !modes.includes(args[0]))) {
    console.error(usage); process.exitCode = 2;
  } else process.exitCode = await runMailCancellation(args[0]);
}
