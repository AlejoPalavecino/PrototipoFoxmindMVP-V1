import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Three groups fixed before the first RED invocation. No retry, automatic subdivision or timing override.
const groups = {
  request: { range: '1–4 (4)', pattern: '^R request-core ' },
  issuance: { range: '5–8 (4)', pattern: '^R issuance ' },
  confirm: { range: '9–16 (8)', pattern: '^R confirm ' },
};
const usage = 'Usage: node scripts/test-p33-recovery.mjs --group=<request|issuance|confirm>';

export async function runRecovery(group, { prepare } = {}) {
  if (!Object.hasOwn(groups, group)) throw new Error('Invalid recovery group');
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
        const run = await runIdentityTestProcess(['--test', '--test-isolation=none', '--test-concurrency=1', `--test-name-pattern=${groups[group].pattern}`, 'tests/p33-recovery.test.mjs'], {
          env, workMs: 26000,
        });
        if (run.stdout) process.stdout.write(run.stdout);
        if (run.stderr) process.stderr.write(run.stderr);
        if (run.errorCode || run.phase !== 'complete') console.error('Recovery tests unavailable or timed out');
        result = run.status ?? 1;
      });
      console.log('Owned recovery Mailpit container/volume cleanup: exit 0');
    });
  } catch { console.error('Recovery runner unavailable (sanitized)'); result = 1; }
  console.log(`Recovery group ${group}: exit ${result}; elapsed ${Date.now() - started}ms`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') {
    console.log(`${usage}\nrequest: cases ${groups.request.range}\nissuance: cases ${groups.issuance.range}\nconfirm: cases ${groups.confirm.range}\nOne fresh owned database/inbox per invocation; 90s provisioning, 30s module startup, 26s work; awaited owned cleanup. No retry or automatic subdivision.`);
  } else {
    const key = args.length === 1 && args[0].startsWith('--group=') ? args[0].slice('--group='.length) : '';
    if (!Object.hasOwn(groups, key)) { console.error(usage); process.exitCode = 2; }
    else process.exitCode = await runRecovery(key);
  }
}
