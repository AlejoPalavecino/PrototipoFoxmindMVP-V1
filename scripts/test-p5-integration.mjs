import { spawnSync } from 'node:child_process';
import { buildApi } from './build-api.mjs';

const usage = 'Usage: node scripts/test-p5-integration.mjs';
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--help') {
  console.log(`${usage}\nFresh API/production Next builds, then real P3 sessions, P4 files and P5 classroom/enrollment/captured-mail/restart journeys. Own disposable fixtures only.`);
} else if (args.length) { console.error(usage); process.exitCode = 2; }
else {
  process.exitCode = buildApi();
  for (const [command, timeout] of [
    [['node_modules/next/dist/bin/next', 'build', 'apps/web'], 180000],
    [['--test', '--test-isolation=none', '--test-concurrency=1', 'tests/p5-integration.test.mjs', 'tests/p5-international-invitations.test.mjs'], 360000],
  ]) {
    if (process.exitCode) break;
    const result = spawnSync(process.execPath, command, { env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
      windowsHide: true, stdio: 'inherit', timeout });
    process.exitCode = result.status ?? 1;
  }
}
