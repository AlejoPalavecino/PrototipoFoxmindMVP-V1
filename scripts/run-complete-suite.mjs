import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkInventory, runSuite } from './run-ci-suite.mjs';
import { criticalOwnedFiles, validateCompleteRoutes } from './ci-suites.mjs';
import { executeFastFile, runFastGroup } from './run-fast-suite.mjs';

export async function runCompleteGroup(route, { cwd = process.cwd(), env = process.env, spawn = spawnSync } = {}) {
  if (route.kind !== 'wrapper') return runSuite(route.files, { cwd, environment: env, spawn });
  const result = await spawn(process.execPath, route.command.slice(1), { cwd, env, timeout: 360000, encoding: 'utf8', windowsHide: true });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  const failed = result.status !== 0 || Boolean(result.error);
  console.log(`Wrapper ${route.id}: ${failed ? 'failed' : 'completed'} (individual test counts unavailable)`);
  return { passed: 0, failed: Number(failed), skipped: 0 };
}
export function cleanEnvironment(source = process.env) {
  const allowed = ['PATH', 'SystemRoot', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'ProgramFiles'];
  return { ...Object.fromEntries(allowed.filter(key => source[key]).map(key => [key, source[key]])), NEXT_TELEMETRY_DISABLED: '1' };
}
function prepareGroup(group, env) {
  // build-api.mjs owns a 90 s budget; the extra 5 s only cover process startup and exit.
  const commands = [['scripts/build-api.mjs', [], 95000]];
  if (['fast', 'owned-services'].includes(group)) {
    for (const project of ['apps/api/tsconfig.p33-security.json', 'apps/api/tsconfig.p33-mail.json'])
      commands.push(['node_modules/typescript/bin/tsc', ['-p', project], 90000]);
  }
  if (group === 'owned-browser') commands.push(['node_modules/next/dist/bin/next', ['build', 'apps/web'], 180000]);
  for (const [program, args, timeout] of commands) {
    const result = spawnSync(process.execPath, [program, ...args], { env, stdio: 'inherit', windowsHide: true, timeout });
    if (result.error || result.status !== 0) throw new Error(`Prerequisite failed or timed out: ${program}`);
  }
}
// PR gate subset: security and access files from owned-db, then every identity wrapper.
export function criticalRoute(routes) {
  const ownedDb = new Set(routes.find(route => route.id === 'owned-db')?.files ?? []);
  const unrouted = criticalOwnedFiles.filter(file => !ownedDb.has(file));
  if (unrouted.length) throw new Error(`Critical files not routed in owned-db: ${unrouted.join(', ')}`);
  return { id: 'critical-owned-db', kind: 'owned', files: criticalOwnedFiles };
}
async function executeGroup(group, routes, env) {
  prepareGroup(group, env);
  const wrappers = routes.filter(route => route.kind === 'wrapper');
  const selected = group === 'wrappers' ? wrappers
    : group === 'critical' ? [criticalRoute(routes), ...wrappers]
      : routes.filter(route => route.id === group);
  if (!selected.length) throw new Error(`Unknown group: ${group}`);
  for (const route of selected) {
    const result = group === 'fast'
      ? await runFastGroup(route.files, { runFile: file => executeFastFile(file, { cwd: process.cwd(), env }) })
      : await runCompleteGroup(route, { env });
    if (result.failed) {
      const pending = selected.slice(selected.indexOf(route) + 1).map(item => item.id);
      if (pending.length) console.log(`Wrapper routes not run after failure: ${pending.join(', ')}`);
      return false;
    }
  }
  return true;
}
async function main(args) {
  const groups = ['fast', 'critical', 'owned-db', 'owned-services', 'owned-browser', 'wrappers'];
  if (args.length === 1 && args[0] === '--check') {
    checkInventory();
    const inventory = JSON.parse(readFileSync('scripts/complete-suite-inventory.json', 'utf8'));
    const routes = JSON.parse(readFileSync('scripts/complete-suite-routes.json', 'utf8'));
    const errors = validateCompleteRoutes({ ...inventory, routes });
    if (errors.length) throw new Error(errors.join('\n'));
    console.log(`Routing: ${inventory.entries.length} tests, ${routes.length} explicit routes`);
    return;
  }
  if (args.length && (args.length !== 2 || args[0] !== '--group' || !groups.includes(args[1])))
    throw new Error('Usage: [--group fast|critical|owned-db|owned-services|owned-browser|wrappers]');
  checkInventory();
  const inventory = JSON.parse(readFileSync('scripts/complete-suite-inventory.json', 'utf8'));
  const routes = JSON.parse(readFileSync('scripts/complete-suite-routes.json', 'utf8'));
  const errors = validateCompleteRoutes({ ...inventory, routes });
  if (errors.length) throw new Error(errors.join('\n'));
  const env = cleanEnvironment();
  // A plain run is the whole suite; critical only repeats a subset of it.
  const planned = args.length ? [args[1]] : groups.filter(group => group !== 'critical');
  for (const [index, group] of planned.entries()) {
    console.log(`Complete suite group: ${group}`);
    if (!await executeGroup(group, routes, env)) {
      if (index + 1 < planned.length) console.log(`Groups not run after failure: ${planned.slice(index + 1).join(', ')}`);
      process.exitCode = 1; return;
    }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
