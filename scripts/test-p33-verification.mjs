import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Fixed before either RED invocation. No retry, automatic subdivision or timing override.
const groups = {
  confirm: { range: '1–8 (8)', pattern: '^T3 confirm ' },
  resend: { range: '9–16 (8)', pattern: '^T3 resend ' },
};
const usage = 'Usage: node scripts/test-p33-verification.mjs --group=<confirm|resend>';

export async function runVerification(group, { prepare } = {}) {
  if (!Object.hasOwn(groups, group)) throw new Error('Invalid verification group');
  const { withIdentityDatabase, identityTestEnvironment, compileIdentityApi } = await import('./p33-identity-test-env.mjs');
  const { withMailpit } = await import('./mailpit-test-runtime.mjs');
  const started = Date.now();
  let result = 1;
  try {
    await withIdentityDatabase(async ({ url, container, name, deadline }) => {
      await (prepare ?? compileIdentityApi)(deadline);
      await withMailpit(async ({ smtpPort, httpOrigin }) => {
        const env = { ...process.env, ...identityTestEnvironment(), DATABASE_URL: url,
          P33_IDENTITY_ISOLATED: name, FOXMIND_API_TEST_CONTAINER: container,
          MAIL_SMTP_PORT: String(smtpPort), P33_OWNED_INBOX: httpOrigin };
        delete env.NODE_TEST_CONTEXT;
        const run = spawnSync(process.execPath, ['--test', '--test-concurrency=1', `--test-name-pattern=${groups[group].pattern}`, 'tests/p33-verification.test.mjs'], {
          env, encoding: 'utf8', timeout: Math.max(1, deadline - Date.now()), windowsHide: true,
        });
        if (run.stdout) process.stdout.write(run.stdout);
        if (run.stderr) process.stderr.write(run.stderr);
        if (run.error) console.error('Verification tests unavailable or timed out');
        result = run.status ?? 1;
      });
      console.log('Owned verification Mailpit container/volume cleanup: exit 0');
    });
  } catch { console.error('Verification runner unavailable (sanitized)'); result = 1; }
  console.log(`Verification group ${group}: exit ${result}; elapsed ${Date.now() - started}ms`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') {
    console.log(`${usage}\nconfirm: cases ${groups.confirm.range}\nresend: cases ${groups.resend.range}\nOne fresh owned database/inbox per invocation; 26s work, 30s outer. No retry or automatic subdivision.`);
  } else {
    const key = args.length === 1 && args[0].startsWith('--group=') ? args[0].slice('--group='.length) : '';
    if (!Object.hasOwn(groups, key)) { console.error(usage); process.exitCode = 2; }
    else process.exitCode = await runVerification(key);
  }
}
