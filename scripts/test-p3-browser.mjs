import { spawnSync } from 'node:child_process';
import { buildApi } from './build-api.mjs';

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--help') {
  console.log('Usage: node scripts/test-p3-browser.mjs\nFresh API and production Next builds, then real browser/SQL/captured-email P3 journeys. Own disposable fixtures; no P4/P5.');
} else if (args.length) { console.error('Usage: node scripts/test-p3-browser.mjs'); process.exitCode = 2; }
else {
  process.exitCode = buildApi();
  if (!process.exitCode) {
    const build = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build', 'apps/web'], {
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }, encoding: 'utf8', windowsHide: true, timeout: 180000,
    });
    if (build.stdout) process.stdout.write(build.stdout); if (build.stderr) process.stderr.write(build.stderr);
    process.exitCode = build.status ?? 1;
    if (!process.exitCode) {
      const run = spawnSync(process.execPath, ['--test', '--test-isolation=none', '--test-concurrency=1', 'tests/p3-browser.test.mjs'], {
        env: process.env, stdio: 'inherit', windowsHide: true, timeout: 240000,
      });
      process.exitCode = run.status ?? 1;
    }
  }
}
