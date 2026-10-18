import { spawnSync } from 'node:child_process';
import { buildApi } from './build-api.mjs';

const usage = 'Usage: node scripts/test-p7-integration.mjs';
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--help') {
  console.log(`${usage}\nFresh API/production Next builds, then real P7 authoring, participation, practical submissions, questionnaire/evaluation taking and reopening/notification journeys. Owned disposable services only; no P8.`);
} else if (args.length) {
  console.error(usage);
  process.exitCode = 2;
} else {
  process.exitCode = buildApi();
  const steps = [
    [['node_modules/next/dist/bin/next', 'build', 'apps/web'], 180000],
    ...['authoring', 'participation', 'practical', 'practical-timing', 'questionnaire',
      'questionnaire-overview', 'questionnaire-recovery', 'history', 'notifications'].map(unit => [
      ['--test', '--test-isolation=none', '--test-concurrency=1', `tests/p7-${unit}-integration.test.mjs`], 360000,
    ]),
  ];
  for (const [command, timeout] of steps) {
    if (process.exitCode) break;
    const result = spawnSync(process.execPath, command, {
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }, windowsHide: true, stdio: 'inherit', timeout,
    });
    process.exitCode = result.status ?? 1;
  }
}
