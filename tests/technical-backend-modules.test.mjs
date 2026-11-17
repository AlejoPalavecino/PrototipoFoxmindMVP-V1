import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const root = 'apps/api/src/';
function sources(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? sources(`${path}/${entry.name}`) : entry.name.endsWith('.ts') ? [`${path}/${entry.name}`] : []);
}
test('identity application owns use cases without SQL, Node, Prisma or concrete adapters', () => {
  const runtime = read(`${root}modules/identity/accounts/application/runtime.ts`);
  assert.match(runtime, /async register\(/);
  assert.match(runtime, /async confirmPasswordRecovery\(/);
  for (const path of sources(`${root}modules/identity`).filter(path => path.includes('/application/'))) {
    assert.doesNotMatch(read(path), /from ['"][^'"]*(?:infrastructure|\.generated|node:|@nestjs)/, path);
    assert.doesNotMatch(read(path), /\$(?:queryRaw|executeRaw)|\b(?:SELECT|INSERT INTO|UPDATE account_)\b/, path);
  }
});
test('technical public surfaces expose contracts without persistence or transport', () => {
  for (const owner of ['identity', 'files']) {
    const source = read(`${root}modules/${owner}/public.ts`);
    assert.doesNotMatch(source, /export\s+\*/);
    assert.doesNotMatch(source, /infrastructure|presentation|bootstrap|\bFileStore\b|\bIdentityStore\b/);
  }
});
test('session context is structural and file readiness has one pure owner', () => {
  assert.doesNotMatch(read(`${root}modules/identity/sessions/application/session-contracts.ts`), /Prisma|\.generated/);
  const readiness = read(`${root}modules/files/domain/readiness.ts`);
  assert.match(readiness, /function requireReady/);
  assert.doesNotMatch(readiness, /infrastructure|node:|Buffer|service\.ts/);
  const promotion = read(`${root}modules/files/custody/infrastructure/promotion.ts`);
  assert.doesNotMatch(promotion, /from ['"][^'"]*service\.ts/);
});

test('Nest resolves files against the exact runtime token exported by identity', async () => {
  await import('reflect-metadata');
  const [{NestFactory},{Module},{FilesModule},{IdentityModule},{IdentityRuntime},{PrismaService},{FileService}] = await Promise.all([
    import('@nestjs/core'),import('@nestjs/common'),
    import('../apps/api/src/bootstrap/files-files.module.ts'),
    import('../apps/api/src/bootstrap/identity-identity.module.ts'),
    import('../apps/api/src/bootstrap/identity-runtime.ts'),
    import('../apps/api/src/platform/database/prisma.service.ts'),
    import('../apps/api/src/modules/files/custody/infrastructure/service.ts'),
  ]);
  class DatabaseFixture {} Module({})(DatabaseFixture);
  const database={module:DatabaseFixture,providers:[{provide:PrismaService,useValue:{
    async $transaction(operation){return operation({async $queryRawUnsafe(){return [];}});}
  }}],exports:[PrismaService]};
  const configured=IdentityModule.register(database,{security:{},outbox:{},mail:{}});
  assert.equal(configured.providers[0].provide,IdentityRuntime);
  class IdentityFixture {} Module({})(IdentityFixture);
  const identity={module:IdentityFixture,providers:[{provide:IdentityRuntime,useValue:{configuration:{security:{}}}}],exports:[IdentityRuntime]};
  let closed=0;
  const files=FilesModule.integrated(database,identity,{draftQuotaBytes:0n},
    {storage:{},scanner:{},close(){closed++;}},
    {authorizeAttemptWrite(){},onReadyTransition(){}});
  assert.equal(files.providers[0].inject[1],IdentityRuntime);
  const app=await NestFactory.createApplicationContext(files,{logger:false,abortOnError:false});
  try {assert.ok(app.get(FileService));} finally {await app.close();}
  assert.equal(closed,1);
});
