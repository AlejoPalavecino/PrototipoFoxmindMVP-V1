import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { setTimeout as pause } from 'node:timers/promises';
export async function withP5Mail(run) {
  const owner = randomBytes(12).toString('hex'),
    name = `foxmind-p5-mail-${owner}`;
  let created = false;
  const docker = (...args) => {
    const r = spawnSync('docker', args, {
      encoding: 'utf8',
      timeout: 15000,
      windowsHide: true,
    });
    if (r.error || r.status !== 0)
      throw new Error(`P5 captured inbox ${args[0]} failed`);
    return r.stdout.trim();
  };
  try {
    docker(
      'run',
      '-d',
      '--rm',
      '--pull=never',
      '--name',
      name,
      '--label',
      `foxmind.p5.owner=${owner}`,
      '--memory=192m',
      '--cpus=0.5',
      '-p',
      '127.0.0.1::1025',
      '-p',
      '127.0.0.1::8025',
      'axllent/mailpit:v1.31.6',
    );
    created = true;
    const port = (internal) =>
      Number(
        docker(
          'inspect',
          '--format',
          `{{(index (index .NetworkSettings.Ports "${internal}/tcp") 0).HostPort}}`,
          name,
        ),
      );
    const smtpPort = port(1025),
      inbox = `http://127.0.0.1:${port(8025)}`;
    let ready = false;
    for (let i = 0; i < 40; i++) {
      try {
        if (
          (
            await fetch(inbox + '/api/v1/info', {
              signal: AbortSignal.timeout(1000),
            })
          ).ok
        ) {
          ready = true;
          break;
        }
      } catch {}
      await pause(200);
    }
    if (!ready) throw new Error('P5 captured inbox readiness timeout');
    return await run({ smtpPort, inbox });
  } finally {
    if (created) {
      if (
        docker(
          'inspect',
          '--format',
          '{{index .Config.Labels "foxmind.p5.owner"}}',
          name,
        ) !== owner
      )
        throw new Error('P5 inbox ownership mismatch');
      docker('rm', '--force', name);
      console.log('P5 owned captured inbox cleanup: exit0');
    }
  }
}
