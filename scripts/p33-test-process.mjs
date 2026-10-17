import { spawn } from 'node:child_process';

/** Test-process coordination only. Readiness never substitutes for any application assertion. */
export function runIdentityTestProcess(args, { env = process.env, startupMs = 30000, workMs = 26000 } = {}) {
  if (!Number.isFinite(startupMs) || startupMs <= 0 || !Number.isFinite(workMs) || workMs <= 0) throw new Error('Invalid test process deadline');
  return new Promise(resolve => {
    const started = Date.now();
    let readyAt, phase = 'startup', stdout = '', stderr = '', timer, errorCode;
    const child = spawn(process.execPath, args, { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
    const expire = next => { phase = next; child.kill(); };
    timer = setTimeout(() => expire('startup-timeout'), startupMs);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.once('error', error => { errorCode = error.code; });
    child.on('message', message => {
      if (message?.type !== 'foxmind-test-ready' || readyAt || phase !== 'startup') return;
      readyAt = Date.now(); clearTimeout(timer); phase = 'work';
      timer = setTimeout(() => expire('work-timeout'), workMs);
    });
    // close, rather than exit, also waits for the captured streams. Caller finally blocks then clean fixtures.
    child.once('close', (status, signal) => {
      clearTimeout(timer);
      const finished = Date.now();
      if (phase === 'startup') { phase = 'missing-readiness'; if (status === 0) status = 1; }
      else if (phase === 'work') phase = 'complete';
      resolve({ status, signal, errorCode, phase, stdout, stderr,
        startupMs: (readyAt ?? finished) - started, workMs: readyAt ? finished - readyAt : 0 });
    });
  });
}
