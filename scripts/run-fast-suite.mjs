import { spawn, spawnSync } from 'node:child_process';
const testPreload = new URL('./register-api-test-build.mjs', import.meta.url).href;

export async function runFastGroup(files, { runFile, concurrency = 4 }) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) throw new Error('Invalid concurrency');
  const totals = { passed: 0, failed: 0, skipped: 0 };
  for (let index = 0; index < files.length; index += concurrency) {
    const batch = files.slice(index, index + concurrency);
    const results = await Promise.all(batch.map(file => Promise.resolve().then(() => runFile(file))
      .catch(error => { console.error(`${file}: ${error.message}`); return { passed: 0, failed: 1, skipped: 0 }; })));
    for (const result of results) {
      if (!result || Object.keys(totals).some(key => !Number.isSafeInteger(result[key]) || result[key] < 0)) {
        console.error('Invalid test result counts'); totals.failed++; continue;
      }
      for (const key of Object.keys(totals)) totals[key] += result[key];
    }
    if (totals.failed) {
      if (index + concurrency < files.length) console.log(`Not run after failure: ${files.slice(index + concurrency).join(', ')}`);
      break;
    }
  }
  console.log(`Fast tests: ${totals.passed} passed, ${totals.failed} failed, ${totals.skipped} skipped`);
  return totals;
}

function terminateOwned(child, realSpawn) {
  if (!realSpawn || !child.pid) { child.kill(); return; }
  if (process.platform === 'win32') {
    const result = spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore', timeout: 5000 });
    if (result.status !== 0) child.kill();
  } else {
    try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill(); }
  }
}
export function executeFastFile(file, { cwd, env, timeoutMs = 360000, spawnProcess = spawn }) {
  return new Promise(resolve => {
    const child = spawnProcess(process.execPath, ['--import', testPreload, '--experimental-transform-types', '--experimental-test-module-mocks', '--disable-warning=ExperimentalWarning', '--test', '--test-reporter=tap', '--test-concurrency=1', file], { cwd, env, windowsHide: true, detached: process.platform !== 'win32' && spawnProcess === spawn });
    let output = '', errors = '', timedOut = false;
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { errors += chunk; });
    const timer = setTimeout(() => { timedOut = true; terminateOwned(child, spawnProcess === spawn); }, timeoutMs);
    child.on('error', error => { errors += error.message; });
    child.on('close', code => {
      clearTimeout(timer); console.log(`Running ${file}\n${output}${errors}`);
      const count = label => Number(output.match(new RegExp(`^# ${label} (\\d+)$`, 'm'))?.[1] || 0);
      const passed = count('pass'), skipped = count('skipped'), failed = count('fail');
      resolve({ passed, skipped, failed: Math.max(failed, Number(code !== 0 || timedOut || passed + skipped + failed === 0)) });
    });
  });
}
