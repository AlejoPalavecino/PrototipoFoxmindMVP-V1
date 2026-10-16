import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function testP4(args) {
  if (args.length === 1 && args[0] === '--help') {
    console.log('Usage: node scripts/test-p4.mjs [--persistent]'); return 0;
  }
  if (args.length > 1 || (args.length === 1 && args[0] !== '--persistent')) {
    console.error('Usage: node scripts/test-p4.mjs [--persistent]'); return 2;
  }
  const steps = [
    ['build', ['scripts/build-api.mjs'], 30000],
    ['policy/adapters/content/configuration', ['--test', '--test-concurrency=1', 'tests/p4-file-policy.test.mjs',
      'tests/p4-adapters.test.mjs', 'tests/p4-content.test.mjs', 'tests/p4-configuration.test.mjs',
      'tests/p4-cleanup-worker.test.mjs', 'tests/p4-http-output.test.mjs'], 30000],
    ['real isolated service journeys', ['--test', 'tests/p4-services.test.mjs'], 240000],
  ];
  if (args[0] === '--persistent') steps.push(['local services up', ['scripts/p4-local.mjs', 'up'], 200000],
    ['persistent restart', ['--test', 'tests/p4-persistence.test.mjs'], 90000]);
  for (const [label, command, timeout] of steps) {
    const result = spawnSync(process.execPath, command, { cwd: resolve(import.meta.dirname, '..'), stdio: 'inherit', windowsHide: true, timeout });
    console.log(`P4 ${label}: exit ${result.status ?? 'unavailable'}`);
    if (result.error || result.status !== 0) {
      if (label === 'local services up' || label === 'persistent restart') {
        const cleanup = spawnSync(process.execPath, ['scripts/p4-local.mjs', 'stop'], {
          cwd: resolve(import.meta.dirname, '..'), stdio: 'inherit', windowsHide: true, timeout: 30000,
        });
        console.log(`P4 failed persistent-stage stop: exit ${cleanup.status ?? 'unavailable'}`);
      }
      return result.status || 1;
    }
  }
  return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = testP4(process.argv.slice(2));
