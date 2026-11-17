import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from "../../../../../../../../tests/agenda-database-helpers.test.mjs";
import { transactionDatabase } from "../../../../../../../../tests/classroom-ai-database.test.mjs";
import { homeFixture } from "../../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";

const create = async options => { const api = await Promise.all([import("../conversation-repository.ts"),import("../../../turns/infrastructure/context-catalog.ts"),import("../../../turns/infrastructure/assemble-grounding.ts"),import("../../../turns/infrastructure/grounding-snapshot.ts"),import("../../../turns/infrastructure/grounding-loader.ts"),import("../../../turns/infrastructure/turn-repository.ts"),import("../../../turns/infrastructure/turn-queue.ts"),import("../../../turns/infrastructure/text-budget.ts"),import("../../../turns/infrastructure/claim-authority.ts"),import("../../../turns/infrastructure/durable-loader.ts"),import("../../../domain/provider-input.ts"),import("../../../turns/infrastructure/turn-completion.ts"),import("../../../turns/infrastructure/turn-claimed-reader.ts"),import("../../../turns/infrastructure/turn-preparation.ts"),import("../../../turns/infrastructure/worker.ts"),import("../unit-of-work.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../presentation/http.ts"),import("../../../citations/infrastructure/citation-mapping.ts"),import("../../../../../bootstrap/foxy-runtime.ts"),import("../../../../../bootstrap/foxy-host.ts"),import("../../../turns/infrastructure/turn-recovery.ts"),import("../../../resources/infrastructure/resource-repository.ts"),import("../../../publications/infrastructure/publication-repository.ts"),import("../../../publications/infrastructure/publication-queue.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../publications/infrastructure/pdf-worker.ts"),import("../../../publications/infrastructure/publication-worker.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../publications/application/publication-service.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../publications/infrastructure/publication-cleanup.ts"),import("../../../publications/application/publication-management-service.ts"),import("../../../visuals/infrastructure/visual-configuration.ts"),import("../../../../../bootstrap/foxy-visual-host-providers.ts"),import("../../../private-assets/infrastructure/private-asset-read-repository.ts"),import("../../../private-assets/infrastructure/private-asset-reader.ts"),import("../../../private-assets/application/private-asset-read-service.ts"),import("../../../private-assets/infrastructure/private-asset-discard-repository.ts"),import("../../../private-assets/application/private-asset-discard-service.ts"),import("../../../resources/infrastructure/creation-repository.ts"),import("../../../resources/application/creation-service.ts")]).then(([m0,m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12,m13,m14,m15,m16,m17,m18,m19,m20,m21,m22,m23,m24,m25,m26,m27,m28,m29,m30,m31,m32,m33,m34,m35,m36,m37,m38,m39,m40,m41,m42,m43,m44]) => Object.freeze({createFoxyConversationRepository: m0.createFoxyConversationRepository,FoxyContextCatalogService: m1.FoxyContextCatalogService,assembleFoxyGrounding: m2.assembleFoxyGrounding,FoxyGroundingSnapshotService: m3.FoxyGroundingSnapshotService,FoxyGroundingLoader: m4.FoxyGroundingLoader,createFoxyTurnRepository: m5.createFoxyTurnRepository,createFoxyTurnQueue: m6.createFoxyTurnQueue,createFoxyTextBudget: m7.createFoxyTextBudget,createFoxyClaimAuthority: m8.createFoxyClaimAuthority,createFoxyDurableLoader: m9.createFoxyDurableLoader,projectFoxyTextInput: m10.projectFoxyTextInput,createFoxyTurnCompletion: m11.createFoxyTurnCompletion,createFoxyClaimedTurnReader: m12.createFoxyClaimedTurnReader,createFoxyTurnPreparation: m13.createFoxyTurnPreparation,createFoxyTextWorker: m14.createFoxyTextWorker,createFoxyUnitOfWork: m15.createFoxyUnitOfWork,createFoxyConversationService: m16.createFoxyConversationService,createFoxyTurnService: m16.createFoxyTurnService,createFoxyHandler: m17.createFoxyHandler,mapFoxyCitations: m18.mapFoxyCitations,createFoxyCitationService: m16.createFoxyCitationService,createFoxyRuntime: m19.createFoxyRuntime,FOXY_RUNTIME: m19.FOXY_RUNTIME,installFoxyTransport: m20.installFoxyTransport,createFoxyAuthentication: m20.createFoxyAuthentication,createFoxyTurnRecovery: m21.createFoxyTurnRecovery,createFoxyResourceRepository: m22.createFoxyResourceRepository,createFoxyResourceService: m16.createFoxyResourceService,createFoxyPublicationRepository: m23.createFoxyPublicationRepository,createFoxyPublicationQueue: m24.createFoxyPublicationQueue,createFoxyPublicationFileAllocator: m25.createFoxyPublicationFileAllocator,createFoxyPublicationAuthority: m26.createFoxyPublicationAuthority,createFoxyPublicationCompletion: m27.createFoxyPublicationCompletion,createFoxyPdfRenderer: m28.createFoxyPdfRenderer,createFoxyPublicationWorker: m29.createFoxyPublicationWorker,createFoxyPublicationConfirmationRepository: m30.createFoxyPublicationConfirmationRepository,createFoxyPublicationService: m31.createFoxyPublicationService,createFoxyPublicationFileReader: m32.createFoxyPublicationFileReader,createFoxyPublicationManagementRepository: m33.createFoxyPublicationManagementRepository,createFoxyPublicationCleanup: m34.createFoxyPublicationCleanup,createFoxyPublicationManagementService: m35.createFoxyPublicationManagementService,readFoxyVisualConfiguration: m36.readFoxyVisualConfiguration,selectFoxyVisualProviders: m37.selectFoxyVisualProviders,createFoxyPrivateAssetReadRepository: m38.createFoxyPrivateAssetReadRepository,createFoxyPrivateAssetReader: m39.createFoxyPrivateAssetReader,createFoxyPrivateAssetReadService: m40.createFoxyPrivateAssetReadService,createFoxyPrivateAssetDiscardRepository: m41.createFoxyPrivateAssetDiscardRepository,createFoxyPrivateAssetDiscardService: m42.createFoxyPrivateAssetDiscardService,createFoxyCreationRepository: m43.createFoxyCreationRepository,createFoxyCreationService: m44.createFoxyCreationService})); assert.equal(typeof api.createFoxyUnitOfWork, 'function'); return api.createFoxyUnitOfWork(options); };
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

test('teacher identity is checked before lock, after lock and after operation; lock mode follows write', async () => {
  for (const write of [false, true]) {
    const id = randomUUID(), request = { headers: {} }, calls = [];
    const database = { $transaction: async fn => fn({ $queryRawUnsafe: async (sql, ...args) => {
      calls.push(['sql', sql, ...args]); return [{ id, account_role: 'teacher', email_verified_at: new Date() }]; } }) };
    const authenticate = async (tx, req, flag) => { calls.push(['auth', tx, req, flag]); return id; };
    const uow = await create({ database, authenticate });
    assert.equal(await uow.run(request, write, async (tx, actor) => { calls.push(['operation', tx]); assert.equal(actor.id, id); assert.equal(actor.accountRole, 'teacher'); assert.ok(actor.now instanceof Date); return 'ok'; }), 'ok');
    const names = calls.map(c => c[0]), locks = calls.filter(c => c[0] === 'sql' && /\busers\b/iu.test(c[1]));
    assert.equal(locks.length, 1); assert.match(locks[0][1], write ? /FOR UPDATE/iu : /FOR SHARE/iu);
    assert.deepEqual(names.filter(x => x !== 'sql'), ['auth', 'auth', 'operation', 'auth']);
    assert.ok(names.indexOf('auth') < names.indexOf('sql') && names.lastIndexOf('auth') > names.indexOf('operation'));
    for (const call of calls.filter(c => c[0] === 'auth')) { assert.equal(call[2], request); assert.equal(call[3], write); }
  }
});

test('student, unverified teacher and authentication failures never execute the operation', async () => {
  for (const variant of ['student', 'unverified', 'ORIGIN_NOT_ALLOWED', 'CSRF_INVALID', 'AUTH_REQUIRED']) {
    const id = randomUUID(); let ran = false;
    const database = { $transaction: async fn => fn({ $queryRawUnsafe: async () => [{ id,
      account_role: variant === 'student' ? 'student' : 'teacher', email_verified_at: variant === 'unverified' ? null : new Date() }] }) };
    const authenticate = async () => { if (['ORIGIN_NOT_ALLOWED', 'CSRF_INVALID', 'AUTH_REQUIRED'].includes(variant)) throw Object.assign(Error(variant), { code: variant }); return id; };
    const uow = await create({ database, authenticate });
    await assert.rejects(uow.run({}, true, async () => { ran = true; })); assert.equal(ran, false, variant);
  }
});

test('revoked or substituted session after lock and before commit is rejected', async () => {
  for (const changedAt of [2, 3]) {
    const id = randomUUID(); let count = 0, ran = false;
    const database = { $transaction: async fn => fn({ $queryRawUnsafe: async () => [{ id, account_role: 'teacher', email_verified_at: new Date() }] }) };
    const uow = await create({ database, authenticate: async () => ++count === changedAt ? randomUUID() : id });
    await assert.rejects(uow.run({}, true, async () => { ran = true; })); assert.equal(ran, changedAt === 3);
  }
});

test('real PostgreSQL lock wait rechecks a revoked session before invoking operation', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    const query = async (sql, ...args) => (await pool.query(sql, args)).rows, f = await homeFixture(query);
    const entered = deferred(); let revoked = false, ran = false;
    const database = transactionDatabase(pool), uow = await create({ database, authenticate: async () => { entered.resolve();
      if (revoked) throw Object.assign(Error('AUTH_REQUIRED'), { code: 'AUTH_REQUIRED' }); return f.teacherActor; } });
    const conn = await pool.connect();
    try {
      await conn.query('BEGIN'); await conn.query('SELECT id FROM users WHERE id=$1::uuid FOR UPDATE', [f.teacherActor]);
      const running = uow.run({}, true, async () => { ran = true; }); await entered.promise;
      revoked = true; await conn.query('COMMIT'); await assert.rejects(running); assert.equal(ran, false);
    } finally { await conn.query('ROLLBACK'); conn.release(); }
  });
});

test('unexpected driver failure is sanitized while allowed domain codes survive', async () => {
  const id = randomUUID(), secret = 'sensitive synthetic driver detail';
  const database = { $transaction: async () => { throw Object.assign(Error(secret), { code: 'XX000', detail: secret }); } };
  const uow = await create({ database, authenticate: async () => id });
  await assert.rejects(uow.run({}, true, async () => {}), error => {
    assert.equal(error.code, 'SERVICE_UNAVAILABLE');
    assert.equal(String(error.message).includes(secret), false); assert.equal(JSON.stringify(error).includes(secret), false); return true;
  });
  for (const code of ['FORBIDDEN', 'CONFLICT', 'CSRF_INVALID', 'ORIGIN_NOT_ALLOWED', 'AUTH_REQUIRED']) {
    const domainError = Object.assign(Error(code), { code });
    const domain = await create({ database: { $transaction: async () => { throw domainError; } }, authenticate: async () => id });
    await assert.rejects(domain.run({}, true, async () => {}), error => error.code === code);
  }
});

test('driver failure after a write rolls back and does not reveal SQL detail', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    const query = async (sql, ...args) => (await pool.query(sql, args)).rows, f = await homeFixture(query);
    const uow = await create({ database: transactionDatabase(pool), authenticate: async () => f.teacherActor });
    const [before] = await query('SELECT name FROM classrooms WHERE id=$1::uuid', f.rooms.teach.id);
    let caught; try { await uow.run({}, true, async tx => {
      await tx.query("UPDATE classrooms SET name='synthetic changed' WHERE id=$1::uuid", f.rooms.teach.id);
      await tx.query('SELECT nonexistent_synthetic_secret_column FROM users');
    }); } catch (error) { caught = error; }
    const [after] = await query('SELECT name FROM classrooms WHERE id=$1::uuid', f.rooms.teach.id); assert.equal(after.name, before.name);
    assert.equal(caught?.code, 'SERVICE_UNAVAILABLE'); assert.equal(String(caught?.message).includes('nonexistent_synthetic_secret_column'), false);
  });
});
