import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { withP5Services } from './p5-services.mjs';
import { withP5Mail } from './p5-mail.mjs';
import { PrismaClient } from '../.build/api/.generated/prisma/client.js';
import { FileService } from '../.build/api/apps/api/src/modules/files/infrastructure/service.js';
import { S3Storage } from '../.build/api/apps/api/src/modules/files/infrastructure/storage.js';
import { ClamdScanner } from '../.build/api/apps/api/src/modules/files/infrastructure/scanner.js';
import { FileError } from '../.build/api/apps/api/src/modules/files/domain/errors.js';
import { createFileAccess } from '../.build/api/apps/api/src/modules/files/infrastructure/access.js';
import { createFilesHandler } from '../.build/api/apps/api/src/modules/files/presentation/http.js';
import { ClassroomService } from '../.build/api/apps/api/src/bootstrap/academic-composition.js';
import { ClassroomError } from '../.build/api/apps/api/src/modules/classrooms/infrastructure/policy.js';
import { createClassroomsHandler } from '../.build/api/apps/api/src/bootstrap/academic-http.js';
import { InvitationDeliveryWorker, localInvitationSender } from '../.build/api/apps/api/src/bootstrap/academic-delivery-composition.js';

/** A local test host using captured SMTP and actual P4 services. Never import into the P3 application. */
export async function withP5Runtime(run, { port = 0, preview = false } = {}) {
  return withP5Services((runtime) =>
    withP5Mail(async (mail) => {
      const env = { ...process.env, DATABASE_URL: runtime.databaseUrl };
      for (const args of [
        ['migrate', 'deploy'],
        ['migrate', 'status'],
        [
          'migrate',
          'diff',
          '--from-config-datasource',
          '--to-schema',
          'prisma/schema.prisma',
          '--exit-code',
        ],
      ]) {
        const result = spawnSync(
          process.execPath,
          ['node_modules/prisma/build/index.js', ...args],
          { env, encoding: 'utf8', windowsHide: true, timeout: 30000 },
        );
        if (result.error || result.status !== 0)
          throw new Error(
            `P5 real runtime migration ${args[1]} failed (sanitized)`,
          );
      }
      const pool = new pg.Pool({
        connectionString: runtime.databaseUrl,
        max: 5,
        connectionTimeoutMillis: 2000,
        statement_timeout: 4000,
      });
      const prisma = new PrismaClient({
        adapter: new PrismaPg({
          connectionString: runtime.databaseUrl,
          max: 6,
          connectionTimeoutMillis: 2000,
          statement_timeout: 4000,
        }),
      });
      let server, vite;
      const sessionMap = new Map(),
        accounts = {};
      const sender = localInvitationSender(
        mail.smtpPort,
        'FoxMind@example.test',
      );
      let worker;
      try {
        for (const [name, first, last, email, accountRole] of [
          ['Docente', 'Lucía', 'Moreno', 'lucia@example.test', 'teacher'],
          ['Estudiante', 'Sofía', 'Ríos', 'sofia@example.test', 'student'],
          ['Otra persona', 'Mateo', 'Paz', 'mateo@example.test', 'student'],
        ]) {
          const id = randomUUID(),
            token = randomBytes(32).toString('base64url'),
            csrf = randomBytes(32).toString('base64url'),
            sessionId = randomUUID();
          await pool.query(
            `INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
          VALUES($1,now(),$2,$2,$3,$4,'isolated-fixture-not-login',now(),$5)`,
            [id, email, first, last, accountRole],
          );
          await pool.query(
            `INSERT INTO sessions(id,updated_at,user_id,token_hash,expires_at) VALUES($1,now(),$2,$3,now()+interval '2 hours')`,
            [sessionId, id, createHash('sha256').update(token).digest('hex')],
          );
          const account = {
            id,
            sessionId,
            token,
            csrf,
            name: `${first} ${last}`,
            email,
            accountRole,
          };
          sessionMap.set(token, account);
          accounts[name] = account;
        }
        let origin;
        const context = (req) =>
          sessionMap.get(
            /(?:^|;\s*)p5_fixture=([^;]+)/.exec(req.headers.cookie ?? '')?.[1],
          );
        const authenticate = async (tx, req, write) => {
          const account = context(req);
          if (
            !account ||
            (write &&
              (req.headers.origin !== origin ||
                req.headers['x-csrf-token'] !== account.csrf))
          )
            throw new ClassroomError('FORBIDDEN');
          const [session] = await tx.query(
            'SELECT user_id FROM sessions WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>clock_timestamp()',
            createHash('sha256').update(account.token).digest('hex'),
          );
          if (!session) throw new ClassroomError('FORBIDDEN');
          return session.user_id;
        };
        const access = createFileAccess({
          authenticate: async (tx, req, action) => {
            try {
              return await authenticate(tx, req, action === 'upload');
            } catch (error) {
              if (error instanceof ClassroomError && error.code === 'FORBIDDEN')
                throw new FileError('FORBIDDEN');
              throw error;
            }
          },
          authorizeAttemptWrite: async () => {
            throw new FileError('FORBIDDEN');
          },
        });
        const files = new FileService({
          database: prisma,
          access,
          storage: new S3Storage(runtime.s3, 'foxmind-private'),
          scanner: new ClamdScanner(runtime.scannerHost, runtime.scannerPort),
          draftQuotaBytes: 100000000n,
        });
        const deliveryKey = randomBytes(32),
          service = new ClassroomService({
            database: prisma,
            authenticate,
            files: files.store,
            signingKey: randomBytes(32),
            deliveryKey,
            classroomQuotaBytes: 500000000n,
            webOrigin: 'http://127.0.0.1:3005',
          });
        worker = new InvitationDeliveryWorker({
          database: prisma,
          key: deliveryKey,
          send: sender.send,
        });
        const admit = async (req, write) => {
          await files.store.transaction((tx) => authenticate(tx, req, write));
        };
        const classrooms = createClassroomsHandler(service, { admit }),
          fileHandler = createFilesHandler(files);
        if (preview) {
          const { createServer: createVite } = await import('vite');
          vite = await createVite({
            root: resolve('apps/p5-preview'),
            configFile: false,
            server: { middlewareMode: true, fs: { allow: [resolve('.')] } },
          });
        }
        server = createServer((req, res) => {
          if (req.headers.host !== new URL(origin).host) {
            res.writeHead(403).end();
            return;
          }
          if (req.url === '/__fixture/context') {
            const account = context(req) ?? accounts.Docente;
            if (!context(req))
              res.setHeader(
                'Set-Cookie',
                `p5_fixture=${account.token}; HttpOnly; SameSite=Strict; Path=/`,
              );
            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ name: account.name, csrf: account.csrf, accountRole: account.accountRole }));
            return;
          }
          if (req.url === '/__fixture/choose' && req.method === 'POST') {
            if (
              req.headers.origin !== origin ||
              req.headers['x-p5-fixture'] !== 'true'
            ) {
              res.writeHead(403).end();
              return;
            }
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
              if (body.length > 256) req.destroy();
            });
            req.on('end', () => {
              let account;
              try {
                account = accounts[JSON.parse(body).name];
              } catch {}
              if (!account) {
                res.writeHead(400).end();
                return;
              }
              res.setHeader(
                'Set-Cookie',
                `p5_fixture=${account.token}; HttpOnly; SameSite=Strict; Path=/`,
              );
              res.end('{}');
            });
            return;
          }
          classrooms(req, res, () =>
            fileHandler(req, res, () => {
              if (vite)
                vite.middlewares(req, res, () => res.writeHead(404).end());
              else res.writeHead(404).end();
            }),
          );
        });
        await new Promise((resolveReady, reject) => {
          server.once('error', reject);
          server.listen(port, '127.0.0.1', resolveReady);
        });
        origin = `http://127.0.0.1:${server.address().port}`;
        service.ports.webOrigin = origin;
        worker.onModuleInit();
        const request = (name) => ({
          headers: {
            cookie: `p5_fixture=${accounts[name].token}`,
            origin,
            'x-csrf-token': accounts[name].csrf,
          },
        });
        return await run({
          origin,
          pool,
          prisma,
          service,
          files,
          worker,
          mail,
          accounts,
          request,
          http: async (name, path, method = 'GET', body) => {
            const res = await fetch(origin + path, {
              method,
              headers: {
                ...request(name).headers,
                ...(method === 'GET'
                  ? {}
                  : { 'content-type': 'application/json' }),
              },
              body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
            });
            return res;
          },
        });
      } finally {
        if (worker) await worker.onModuleDestroy();
        sender.close();
        if (server) {
          server.closeAllConnections();
          await new Promise((r) => server.close(r));
        }
        if (vite) await vite.close();
        await prisma.$disconnect();
        await pool.end();
      }
    }),
  );
}
