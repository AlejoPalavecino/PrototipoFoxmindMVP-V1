import test from 'node:test';
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';

const ai = { model: 'synthetic', apiKey: 'synthetic', maxConcurrency: 2, deadlineMs: 1000, maxInputTokens: 1000,
  maxOutputTokens: 100, dailyActorRequests: 3, dailyGlobalRequests: 9, inputUsdPerMillion: 1, outputUsdPerMillion: 1, dailyBudgetUsd: 1 };
const config = { signingKey: Buffer.alloc(32, 1), deliveryKey: Buffer.alloc(32, 2), classroomQuotaBytes: 1000000n, webOrigin: 'http://127.0.0.1:3005' };
const sender = { send: async () => {}, close() {} };
const gradingProvider = { countGradingAiTokens: async () => { throw new Error('unexpected count'); }, generateGradingAi: async () => { throw new Error('unexpected generate'); } };
const override = { provider: { countStudyPlanTokens: async () => 1, extractStudyPlan: async () => ({}) }, gradingProvider };
const modules = async () => import("../.build/api/apps/api/src/bootstrap/academic-classrooms.module.js");
const providerNamed = (module, name) => module.providers.find(p => p?.provide?.name === name);

async function captureAppModule() {
  const { createApplication } = await import('../.build/api/apps/api/src/application.js');
  const original = NestFactory.create; let captured;
  NestFactory.create = async definition => { captured = definition.module; throw new Error('capture only'); };
  try { await assert.rejects(createApplication({ databaseUrl: 'postgresql://synthetic/test', identity: { security: {}, outbox: {}, mail: {} } }), /capture only/); }
  finally { NestFactory.create = original; }
  assert.ok(captured); return captured;
}

test('IA habilitada registra runtime de corrección e inyecta proveedor fake sin despacharlo', async () => {
  const { ClassroomsModule } = await modules();
  const m = ClassroomsModule.integrated({}, {}, {}, config, sender, ai, override);
  const entry = providerNamed(m, 'GradingAiRuntime'); assert.ok(entry?.useFactory, 'registro de GradingAiRuntime');
  assert.ok(m.exports.some(x => x?.name === 'GradingAiRuntime'));
  const fakeDatabase = { $transaction: async () => { throw new Error('sin operaciones en arranque'); } };
  const fakeFiles = { store: { database: fakeDatabase, draftQuotaBytes: 1000000n }, storage: {}, scanner: {} };
  const deps = entry.inject.map(token => token?.name === 'PrismaService' ? fakeDatabase : token?.name === 'FileService' ? fakeFiles : {});
  const runtime = entry.useFactory(...deps); assert.equal(runtime.options.provider, gradingProvider);
  assert.equal(typeof runtime.options.reader.read, 'function'); assert.equal(typeof runtime.options.instructionReader.read, 'function');
  await runtime.onModuleDestroy();
});

test('IA deshabilitada no registra runtime ni ejecuta proveedor', async () => {
  const { ClassroomsModule } = await modules(); let calls = 0;
  const m = ClassroomsModule.integrated({}, {}, {}, config, sender, undefined, { ...override, gradingProvider: {
    countGradingAiTokens: async () => { calls++; return 1; }, generateGradingAi: async () => { calls++; return {}; } } });
  assert.equal(providerNamed(m, 'GradingAiRuntime'), undefined); assert.equal(calls, 0);
});

test('cierre espera al runtime de corrección antes de cerrar archivos y dependencias', async () => {
  const AppModule = await captureAppModule(), events = [];
  let release; const gate = new Promise(resolve => { release = resolve; });
  const identity = { shutdownMail: async () => { events.push('identity'); } }, files = { close: async () => { events.push('files'); } },
    classrooms = { close: async () => { events.push('classrooms'); } }, grading = { onModuleDestroy: async () => { events.push('grading-start'); await gate; events.push('grading-end'); } };
  const module = new AppModule(identity, files, classrooms, undefined, undefined, undefined, undefined, grading);
  const closing = module.onModuleDestroy(); await Promise.resolve();
  assert.deepEqual(events, ['grading-start']); release(); await closing;
  assert.ok(events.indexOf('grading-end') < events.indexOf('files')); assert.ok(events.includes('classrooms'));
});
