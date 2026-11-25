import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { identityTestEnvironment } from './p33-identity-test-env.mjs';
import { cleanEnvironment } from './run-complete-suite.mjs';

async function freePort() {
  const server = createServer();
  await new Promise((done, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', done);
  });
  const port = server.address().port;
  await new Promise((done, reject) => server.close(error => error ? reject(error) : done()));
  return port;
}

function findPostgresBin() {
  if (process.env.FOXMIND_TEST_POSTGRES_BIN) return process.env.FOXMIND_TEST_POSTGRES_BIN;
  const config = spawnSync('pg_config', ['--bindir'], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
  const directory = config.status === 0 ? config.stdout.trim() : '';
  const suffix = process.platform === 'win32' ? '.exe' : '';
  const windowsRoot = join(process.env.ProgramFiles ?? 'C:/Program Files', 'PostgreSQL');
  const candidates = [directory, ...(suffix ? ['17', '16'].map(version => join(windowsRoot, version, 'bin')) : [])];
  return candidates.find(candidate => candidate && existsSync(join(candidate, 'initdb' + suffix))
    && existsSync(join(candidate, 'pg_ctl' + suffix)));
}

function postgresCommand(directory, binary, args) {
  const command = process.platform === 'win32' ? binary + '.exe' : binary;
  const executable = directory ? join(directory, command) : command;
  const result = spawnSync(executable, args, { encoding: 'utf8', windowsHide: true, timeout: 30000 });
  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    throw new Error(`${binary} failed (${result.error?.code ?? result.status})${stderr ? ': ' + stderr : ''}`);
  }
}

/** Server options for the disposable cluster. Outside Windows the Unix socket stays in the cluster's own
 * scratch directory: Debian/Ubuntu builds default to /var/run/postgresql, which a CI runner cannot write. */
export function postgresServerOptions({ port, socketDirectory, platform = process.platform }) {
  const options = `-h 127.0.0.1 -p ${port}`;
  return platform === 'win32' ? options : `${options} -k "${socketDirectory}"`;
}

async function logTail(file) {
  try { return (await readFile(file, 'utf8')).trim().split(/\r?\n/).slice(-20).join('\n'); } catch { return ''; }
}

export async function withTeacherSupportDatabase(run) {
  // The native cluster and its password file are disposable, owned and independent of DATABASE_URL.
  const postgresBin = findPostgresBin();
  const scratch = await mkdtemp(join(tmpdir(), 'foxmind-teacher-support-'));
  const data = join(scratch, 'postgres');
  const passwordFile = join(scratch, 'pg-pass');
  const password = randomBytes(24).toString('hex');
  let started = false, database;
  try {
    const databasePort = await freePort();
    await writeFile(passwordFile, password + '\n', { mode: 0o600 });
    postgresCommand(postgresBin, 'initdb', ['-D', data, '-U', 'postgres', '--auth=scram-sha-256',
      '--pwfile=' + passwordFile, '--encoding=UTF8', '--locale=C']);
    await rm(passwordFile);
    const serverLog = join(scratch, 'postgres.log');
    try {
      postgresCommand(postgresBin, 'pg_ctl', ['-D', data, '-l', serverLog, '-w',
        '-o', postgresServerOptions({ port: databasePort, socketDirectory: scratch }), 'start']);
    } catch (error) {
      // The disposable cluster's log names the cause (permissions, port, locale) that pg_ctl alone hides.
      const tail = await logTail(serverLog);
      throw new Error(tail ? `${error.message}\nPostgres log:\n${tail}` : error.message, { cause: error });
    }
    started = true;
    const databaseUrl = `postgresql://postgres:${password}@127.0.0.1:${databasePort}/postgres`;
    database = new pg.Client({ connectionString: databaseUrl, statement_timeout: 30000 });
    await database.connect();
    for (const migration of (await readdir('prisma/migrations')).filter(name => /^\d+_/.test(name)).sort()) {
      await database.query(await readFile(join('prisma/migrations', migration, 'migration.sql'), 'utf8'));
    }

    return await run({ database, databaseUrl });
  } finally {
    try {
      await database?.end();
    } finally {
      if (started || existsSync(join(data, 'postmaster.pid'))) postgresCommand(postgresBin, 'pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
      await rm(scratch, { recursive: true, force: true, maxRetries: 3 });
    }
  }
}

export function withTeacherSupportRuntime(run, { aiEnvironment, applicationOptions } = {}) {
  return withTeacherSupportDatabase(async ({ database, databaseUrl }) => {
    let application, web;
    try {
      const webPort = await freePort(), inactiveServicePort = await freePort();
      const { createApplication } = await import('../.build/api/apps/api/src/application.js');
      const { readConfiguration } = await import('../.build/api/apps/api/src/configuration.js');
      const origin = `http://127.0.0.1:${webPort}`;
      application = await createApplication(readConfiguration({
        ...identityTestEnvironment(), ...aiEnvironment, DATABASE_URL: databaseUrl, APP_ORIGIN: origin,
        MAIL_SMTP_PORT: String(inactiveServicePort),
        FILES_ENABLED: '1', FILES_S3_ENDPOINT: `http://127.0.0.1:${inactiveServicePort}`,
        FILES_S3_REGION: 'us-east-1', FILES_S3_BUCKET: 'synthetic-private',
        FILES_S3_ACCESS_KEY_ID: 'a'.repeat(32), FILES_S3_SECRET_ACCESS_KEY: 'b'.repeat(64),
        FILES_SCANNER_HOST: '127.0.0.1', FILES_SCANNER_PORT: String(inactiveServicePort),
        FILES_DRAFT_QUOTA_BYTES: '1000000', CLASSROOMS_ENABLED: '1', CLASSROOMS_QUOTA_BYTES: '100000000',
        CLASSROOMS_SIGNING_KEY: randomBytes(32).toString('base64url'),
        CLASSROOMS_DELIVERY_KEY: randomBytes(32).toString('base64url'),
      }), applicationOptions);
      await application.listen(0, '127.0.0.1');
      const apiOrigin = `http://127.0.0.1:${application.getHttpServer().address().port}`;
      web = spawn(process.execPath, [resolve('node_modules/next/dist/bin/next'), 'start', 'apps/web',
        '--hostname', '127.0.0.1', '--port', String(webPort)], {
        env: { ...cleanEnvironment(), NODE_ENV: 'production', FOXMIND_API_ORIGIN: apiOrigin },
        windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'],
      });
      let webError = '';
      web.stderr.on('data', data => { webError = (webError + String(data)).slice(-4096); });
      web.on('error', error => { webError = error.message; });
      const deadline = Date.now() + 25000;
      while (Date.now() < deadline && web.exitCode === null) {
        let response;
        try { response = await fetch(origin + '/sign-in', { signal: AbortSignal.timeout(800) }); } catch {}
        await response?.body.cancel();
        if (response?.ok) return await run({ origin, apiOrigin, database });
        await delay(150);
      }
      throw new Error('Next integration host unavailable. Build apps/web before running the test. ' + webError);
    } finally {
      try {
        if (web && web.exitCode === null && web.signalCode === null && web.pid) {
          const exit = new Promise(done => web.once('exit', done));
          web.kill();
          await exit;
        }
      } finally {
        await application?.close();
      }
    }
  });
}
