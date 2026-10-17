import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { P4_IMAGES, P4_SCANNER_START } from '../scripts/p4-services.mjs';
for (const mode of ['refresh-required', 'offline-stale', 'offline-fresh']) {
  test(`scanner fixture startup preserves freshness boundary: ${mode}`, () => {
    const script = `set -eu
mkdir /tmp/p4-stubs
cat > /tmp/p4-stubs/freshclam <<'UPDATER'
#!/bin/sh
if [ "$P4_UPDATE_FAIL" = yes ]; then exit 9; fi
touch /tmp/p4-fresh
UPDATER
cat > /tmp/p4-stubs/clamd <<'SCANNER'
#!/bin/sh
test -f /tmp/p4-fresh || exit 42
echo SCANNER_READY
SCANNER
chmod +x /tmp/p4-stubs/freshclam /tmp/p4-stubs/clamd
export PATH=/tmp/p4-stubs:$PATH
${mode === 'offline-fresh' ? 'touch /tmp/p4-fresh' : ':'}
${mode.startsWith('offline') ? 'export P4_UPDATE_FAIL=yes' : ':'}
${P4_SCANNER_START}`;
    const result = spawnSync('docker', ['run', '--rm', '--pull=never', '--network=none', '--memory=128m', '--cpus=0.5',
      '--pids-limit=32', '--label', 'foxmind.p4.probe=scanner-start', '--entrypoint=/bin/sh', P4_IMAGES.scanner, '-c', script],
    { encoding: 'utf8', timeout: 10000, windowsHide: true });
    assert.equal(result.status, mode === 'offline-stale' ? 42 : 0);
    assert.equal(result.stdout.includes('SCANNER_READY'), mode !== 'offline-stale');
  });
}
