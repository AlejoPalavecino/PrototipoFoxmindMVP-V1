import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Always generate and compile in this invocation. No persistent reuse mechanism.
export function buildApi({ root = process.cwd(), run = spawnSync, budgetMs = 90000, now = Date.now } = {}) {
  if (!Number.isSafeInteger(budgetMs) || budgetMs <= 0) {
    throw new TypeError('API build budget must be a positive safe integer');
  }
  if (typeof now !== 'function') {
    throw new TypeError('API build clock must be callable');
  }
  const readClock = () => {
    const value = now();
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError('API build clock must return a finite number');
    }
    return value;
  };
  const require = createRequire(resolve(root, 'package.json'));
  const deadline = readClock() + budgetMs;
  const stages = [
    ['Prisma generation', () => [require.resolve('prisma/build/index.js'), 'generate']],
    ['API TypeScript compilation', () => [require.resolve('typescript/bin/tsc'), '-p', 'apps/api/tsconfig.json']],
  ];
  for (const [label, args] of stages) {
    const remaining = deadline - readClock();
    if (remaining <= 0) {
      console.log(`${label}: exit unavailable`);
      return 1;
    }
    const result = run(process.execPath, args(), {
      cwd: root, env: process.env, encoding: 'utf8', windowsHide: true,
      timeout: remaining,
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
