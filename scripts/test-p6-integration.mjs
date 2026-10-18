import { spawnSync } from 'node:child_process';
import { buildApi } from './build-api.mjs';

const usage = 'Usage: node scripts/test-p6-integration.mjs';
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--help') {
  console.log(`${usage}\nFresh API/production Next builds, then real Plan, Library, Muro and in-platform notification journeys. Owned disposable services only; no P7.`);
} else if (args.length) {
  console.error(usage); process.exitCode = 2;
} else {
  process.exitCode = buildApi();
  const steps = [
    [['node_modules/next/dist/bin/next', 'build', 'apps/web'], 180000],
    ...['plan', 'library', 'wall'].map(unit => [
      ['--test', '--test-isolation=none', '--test-concurrency=1', `tests/p6-${unit}-integration.test.mjs`], 360000,
    ]),
  ];
  for (const [command, timeout] of steps) {
    if (process.exitCode) break;
    const result = spawnSync(process.execPath, command, { env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
      windowsHide: true, stdio: 'inherit', timeout });
    process.exitCode = result.status ?? 1;
  }
}
