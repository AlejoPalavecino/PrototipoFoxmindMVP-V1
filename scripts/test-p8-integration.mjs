import { spawnSync } from 'node:child_process';
import { buildApi } from './build-api.mjs';

const usage = 'Usage: node scripts/test-p8-integration.mjs';
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--help') {
  console.log(`${usage}\nFresh API/production Next builds, then real P8 private grading, confirmed reload, publication with restart/access, published correction with final result/access and progress journeys. Owned disposable services only; no P9.`);
} else if (args.length) {
  console.error(usage);
  process.exitCode = 2;
} else {
  process.exitCode = buildApi();
  const steps = [
    [['node_modules/next/dist/bin/next', 'build', 'apps/web'], 180000],
    ...['grading', 'grading-reload', 'publication', 'publication-tp', 'corrections', 'corrections-e-final', 'progress'].map(unit => [
      ['--test', '--test-isolation=none', '--test-concurrency=1', `tests/p8-${unit}-integration.test.mjs`], 360000,
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
