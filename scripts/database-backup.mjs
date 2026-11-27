// Backup and restore of a FoxMind database that runs in a Docker container (B12 of the 2026-11-26 audit).
// Both commands run the PostgreSQL tools inside that container over its local socket, so no password or URL
// is passed around and the tools always match the server version. See docs/engineering/database-backup.md.
import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { readFile, rename, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const roleMigration = 'prisma/migrations/202611260001_application_role/migration.sql';
const name = value => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,62}$/u.test(value)) throw new Error('INVALID_BACKUP_TARGET');
  return value;
};

function run(args, { input, output, docker = 'docker' } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(docker, args, { stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '', stderr = '';
    const written = output ? new Promise((done, fail) => output.on('close', done).on('error', fail)) : Promise.resolve();
    child.stderr.on('data', chunk => { stderr += chunk; });
    if (output) child.stdout.pipe(output); else child.stdout.on('data', chunk => { stdout += chunk; });
    if (typeof input === 'string') child.stdin.end(input);
    else if (input) { input.on('error', reject); input.pipe(child.stdin); }
    child.on('error', reject);
    child.on('close', code => written.then(() => code === 0 ? resolve(stdout)
      : reject(new Error(`${args.slice(0, 3).join(' ')} failed (${code}): ${stderr.trim().slice(-400)}`)), reject));
  });
}

const psql = (target, sql, options) => run(['exec', '-i', target.container, 'psql', '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-tA',
  '-U', target.user, '-d', target.database], { ...options, input: sql });

/** Writes a custom-format dump and checks that pg_restore can read it back. */
export async function backupDatabase({ container, database, user, file, docker }) {
  const target = { container: name(container), database: name(database), user: name(user) };
  const partial = `${file}.partial`;
  try {
    await run(['exec', target.container, 'pg_dump', '-U', target.user, '-d', target.database, '--format=custom', '--compress=6'],
      { output: createWriteStream(partial), docker });
    const list = await run(['exec', '-i', target.container, 'pg_restore', '--list'], { input: createReadStream(partial), docker });
    if (!/TABLE DATA public _prisma_migrations/u.test(list)) throw new Error('BACKUP_INCOMPLETE');
    await rename(partial, file);
    return { file, entries: list.split('\n').filter(line => line && !line.startsWith(';')).length };
  } catch (error) { await rm(partial, { force: true }); throw error; }
}

/**
 * Restores into an existing, empty database and never over one with tables. Ownership and grants come from the
 * restoring (migrating) role: the dump is loaded without owners or ACLs and the application role migration,
 * which is idempotent, then recreates foxmind_app and its grants even on a cluster where it did not exist.
 */
export async function restoreDatabase({ container, database, user, file, docker }) {
  const target = { container: name(container), database: name(database), user: name(user) };
  const tables = Number((await psql(target, "SELECT count(*) FROM pg_tables WHERE schemaname='public';", { docker })).trim());
  if (tables !== 0) throw new Error('RESTORE_TARGET_NOT_EMPTY');
  await run(['exec', '-i', target.container, 'pg_restore', '-U', target.user, '-d', target.database,
    '--no-owner', '--no-acl', '--exit-on-error', '--single-transaction'], { input: createReadStream(file), docker });
  await psql(target, await readFile(roleMigration, 'utf8'), { docker });
  const [restored, migrations] = (await psql(target, `SELECT (SELECT count(*) FROM pg_tables WHERE schemaname='public'),
    (SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL);`, { docker })).trim().split('|').map(Number);
  return { tables: restored, migrations };
}

async function main([command, ...args]) {
  const options = Object.fromEntries(args.map(arg => arg.match(/^--([a-z]+)=(.+)$/u)).filter(Boolean).map(match => [match[1], match[2]]));
  const usage = 'Usage: node scripts/database-backup.mjs backup|restore --container=NAME --database=DB --user=ROLE --file=PATH';
  if (!['backup', 'restore'].includes(command) || !options.container || !options.database || !options.user || !options.file) throw new Error(usage);
  const result = command === 'backup' ? await backupDatabase(options) : await restoreDatabase(options);
  console.log(JSON.stringify(result));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
