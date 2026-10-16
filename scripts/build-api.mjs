import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Always generate and compile in this invocation. No persistent reuse mechanism.
export function buildApi({ root = process.cwd(), run = spawnSync } = {}) {
  const require = createRequire(resolve(root, 'package.json'));
  const deadline = Date.now() + 30000;
  const stages = [
    ['Prisma generation', () => [require.resolve('prisma/build/index.js'), 'generate']],
    ['API TypeScript compilation', () => [require.resolve('typescript/bin/tsc'), '-p', 'apps/api/tsconfig.json']],
  ];
  for (const [label, args] of stages) {
    const result = run(process.execPath, args(), {
      cwd: root, env: process.env, encoding: 'utf8', windowsHide: true,
      timeout: Math.max(1, deadline - Date.now()),
    });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    console.log(`${label}: exit ${result.status ?? 'unavailable'}`);
    if (result.error || result.status !== 0) return result.status || 1;
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const usage = 'Usage: node scripts/build-api.mjs';
  if (args.length === 1 && args[0] === '--help') console.log(usage);
  else if (args.length) { console.error(usage); process.exitCode = 2; }
  else {
    try { process.exitCode = buildApi(); }
    catch { console.error('API build unavailable'); process.exitCode = 1; }
  }
}
