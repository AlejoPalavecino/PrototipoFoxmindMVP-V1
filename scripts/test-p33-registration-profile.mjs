import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Duplicate-registration coverage depends on the registration case, so keep this group indivisible.
const groups = {
  registration: { range: '2–8 (7)', pattern: '^D2 (?:registration|raw Unicode|validates|duplicate|concurrent|default shared|registration IP)' },
  account: { range: '1, 9–13 (6)', pattern: '^D2 (?:rollback|profile|patch|mutations|media)' },
  sessions: { range: '14–15 (2)', pattern: '^D2 (?:authorized|persisted)' },
  lifecycle: { range: '16–18 (3)', pattern: '^D2 (?:SMTP|shutdown|real counter)' },
};
const usage = 'Usage: node scripts/test-p33-registration-profile.mjs --group=<registration|account|sessions|lifecycle>';

// Preparation is trusted in-process composition only; standalone use always compiles.
export async function runRegistrationProfile(group, { prepare } = {}) {
  if (!Object.hasOwn(groups, group)) throw new Error('Invalid registration/profile group');
  const { runIdentityTestProcess } = await import('./p33-test-process.mjs');
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
        const run = await runIdentityTestProcess(['--test', '--test-isolation=none', '--test-concurrency=1', `--test-name-pattern=${groups[group].pattern}`, 'tests/p33-registration-profile.test.mjs'], {
          env, workMs: 26000,
        });
        if (run.stdout) process.stdout.write(run.stdout);
        if (run.stderr) process.stderr.write(run.stderr);
        if (run.errorCode || run.phase !== 'complete') console.error('Registration/profile tests unavailable or timed out');
        result = run.status ?? 1;
      });
      console.log('Owned registration Mailpit container/volume cleanup: exit 0');
    });
  } catch { console.error('Registration/profile runner unavailable (sanitized)'); result = 1; }
  console.log(`Registration/profile group ${group}: exit ${result}; elapsed ${Date.now() - started}ms`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') {
    console.log(`${usage}\nregistration: cases ${groups.registration.range}\naccount: cases ${groups.account.range}\nsessions: cases ${groups.sessions.range}\nlifecycle: cases ${groups.lifecycle.range}\nOne fresh owned database/inbox per invocation; 90s provisioning, 30s module startup, 26s work; awaited owned cleanup. No retry or automatic subdivision.`);
  } else {
    const key = args.length === 1 && args[0].startsWith('--group=') ? args[0].slice('--group='.length) : '';
    if (!Object.hasOwn(groups, key)) { console.error(usage); process.exitCode = 2; }
    else process.exitCode = await runRegistrationProfile(key);
  }
}
