import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [operation, ...extra] = process.argv.slice(2);
const operations = {
  up: ['up', '-d', '--wait', '--wait-timeout', '30', 'mailpit'],
  stop: ['stop', 'mailpit'],
  status: ['ps', 'mailpit'],
};
if (!Object.hasOwn(operations, operation) || extra.length !== 0) {
  process.stderr.write('Usage: mail-compose.mjs <up|stop|status>\n');
  process.exit(2);
}

// Compose otherwise implicitly loads .env, even for this mail-only project.
const environment = { ...process.env, COMPOSE_DISABLE_ENV_FILE: '1' };
delete environment.COMPOSE_ENV_FILES;
const root = fileURLToPath(new URL('../', import.meta.url));
const result = spawnSync('docker', [
  'compose', '-p', 'foxmind-mail-local', '-f', 'compose.mail.yaml',
  ...operations[operation],
], { cwd: root, env: environment, stdio: 'inherit', timeout: 60000 });
if (result.error) {
  process.stderr.write('Local mail command failed or exceeded its time limit.\n');
}
process.exit(result.status ?? 1);
