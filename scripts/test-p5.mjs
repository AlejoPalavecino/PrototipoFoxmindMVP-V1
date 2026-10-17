import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function testP5(args) {
  if (args.length === 1 && args[0] === '--help') {
    console.log('Usage: node scripts/test-p5.mjs [--unit-only]');
    return 0;
  }
  if (args.length > 1 || (args.length === 1 && args[0] !== '--unit-only')) {
    console.error('Usage: node scripts/test-p5.mjs [--unit-only]');
    return 2;
  }
  const steps = [
    ['fresh API generation/build', ['scripts/build-api.mjs'], 40000],
    [
      'UI strict types',
      [
        'node_modules/typescript/bin/tsc',
        '-p',
        'apps/classrooms-ui/tsconfig.json',
      ],
      30000,
    ],
    [
      'isolated UI bundle',
      [
        'node_modules/vite/bin/vite.js',
        'build',
        'apps/p5-preview',
        '--outDir',
        '../../.build/p5-web',
        '--emptyOutDir',
      ],
      30000,
    ],
    [
      'policy/SQL/transport/client',
      [
        '--test',
        '--test-concurrency=1',
        'tests/p5-policy.test.mjs',
        'tests/p5-drafts.test.mjs',
        'tests/p5-enrollment.test.mjs',
        'tests/p5-delivery.test.mjs',
        'tests/p5-http.test.mjs',
        'tests/p5-ui-client.test.mjs',
      ],
      120000,
    ],
  ];
  if (!args.length)
    steps.push([
      'real SQL/S3/ClamAV/captured SMTP',
      ['--test', 'tests/p5-runtime.test.mjs'],
      240000,
    ]);
  for (const [label, command, timeout] of steps) {
    const result = spawnSync(process.execPath, command, {
      cwd: resolve(import.meta.dirname, '..'),
      stdio: 'inherit',
      windowsHide: true,
      timeout,
    });
    console.log(`P5 ${label}: exit${result.status ?? 'unavailable'}`);
    if (result.error || result.status !== 0) return result.status || 1;
  }
  if (args.length)
    console.log(
      'P5 real-service journey explicitly omitted by --unit-only. This is not full runtime acceptance.',
    );
  return 0;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  process.exitCode = testP5(process.argv.slice(2));
