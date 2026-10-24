import { spawnSync } from 'node:child_process';
import { buildApi } from './build-api.mjs';

const usage = 'Usage: node scripts/test-agenda.mjs';
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--help') {
  console.log(`${usage}\nFresh API build, agenda contracts and real isolated PostgreSQL/session checks. Requires local Docker; never uses retained data.`);
} else if (args.length) {
  console.error(usage);
  process.exitCode = 2;
} else {
  process.exitCode = buildApi();
  if (!process.exitCode) {
    const suites = ['contracts', 'time', 'events', 'client', 'proxy', 'http', 'database', 'academic', 'identity', 'regressions', 'ui'];
    const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1',
      ...suites.map(name => `tests/agenda-${name}.test.mjs`)], {
      stdio: 'inherit', windowsHide: true, timeout: 360000,
    });
    process.exitCode = result.status ?? 1;
  }
}
