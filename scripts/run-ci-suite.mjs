import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { suites, validateCompleteSuite } from './ci-suites.mjs';

export async function runSuite(files, { cwd = process.cwd(), timeoutMs = 360000, spawn = spawnSync, environment = process.env } = {}) {
  if (!Array.isArray(files) || !files.length || new Set(files).size !== files.length) throw new Error('Empty or duplicate suite files');
  for (const file of files) if (!existsSync(resolve(cwd, file))) throw new Error(`Missing test: ${file}`);
  const totals = { passed: 0, skipped: 0, failed: 0 };
  const env = { ...environment };
  delete env.NODE_TEST_CONTEXT;
  for (const [index, file] of files.entries()) {
    console.log(`Running ${file}`);
    const result = await spawn(process.execPath, ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', '--test', '--test-reporter=tap', '--test-concurrency=1', file],
      { cwd, env, timeout: timeoutMs, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    const output = result.stdout || '';
    let observed = 0;
    for (const [key, label] of [['passed', 'pass'], ['skipped', 'skipped'], ['failed', 'fail']]) {
      const count = Number(output.match(new RegExp(`^# ${label} (\\d+)$`, 'm'))?.[1] || 0);
      totals[key] += count; observed += count;
    }
    if (result.status !== 0 || result.error || observed === 0) {
      if (!totals.failed) totals.failed++;
      if (index + 1 < files.length) console.log(`Not run after failure: ${files.slice(index + 1).join(', ')}`);
      break;
    }
  }
  console.log(`Tests: ${totals.passed} passed, ${totals.failed} failed, ${totals.skipped} skipped`);
  return totals;
}

function discoverTests(dir = 'tests') {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = `${dir}/${entry.name}`;
    return entry.isDirectory() ? discoverTests(path) : entry.isFile() && path.endsWith('.test.mjs') ? [path] : [];
  });
}
export function checkInventory() {
  const inventory = JSON.parse(readFileSync('scripts/complete-suite-inventory.json', 'utf8'));
  const manual = inventory.manual;
  const errors = validateCompleteSuite({ ...inventory, discovered: discoverTests(), manual });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Inventory: ${inventory.entries.length} entries, ${inventory.exclusions.length} explicit exclusions`);
}
async function main(args) {
  if (args.length === 1 && args[0] === '--check') { checkInventory(); return; }
  if (args.length === 1 && args[0] === '--list') { for (const [name, files] of Object.entries(suites)) console.log(`${name}: ${files.length} files`); return; }
  if (args.length !== 2 || args[0] !== '--suite' || !Object.hasOwn(suites, args[1])) throw new Error('Usage: --list | --suite <name>');
  const result = await runSuite(suites[args[1]]);
  if (result.failed) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
