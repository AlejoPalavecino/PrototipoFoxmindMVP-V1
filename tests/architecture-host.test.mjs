import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const rootPath = 'apps/api/src/bootstrap/application.ts';
const rootSource = ts.createSourceFile(rootPath, readFileSync(rootPath, 'utf8'), ts.ScriptTarget.Latest, true);

test('S1 root delegates Study runtime composition/lifecycle instead of owning its implementation', () => {
  assert.equal(rootSource.statements.some(node => ts.isFunctionDeclaration(node) && node.name?.text === 'createStudyRuntime'), false,
    'createStudyRuntime must move out of the root bootstrap');
  const imports = rootSource.statements.filter(ts.isImportDeclaration).map(node => node.moduleSpecifier.text);
  assert.ok(imports.includes('./study-runtime.ts'));
  for (const implementation of ['./study-composition.ts', './study-file-integration.ts', './study-agenda-integration.ts',
    '../modules/study/infrastructure/folders/reminders/runtime.ts', '../../../../src/core/domain/study/engine.ts',
    '../modules/study/infrastructure/providers/study-adapter.ts', '../modules/files/infrastructure/chat-attachment-service.ts']) {
    assert.ok(!imports.includes(implementation), `root must not own ${implementation}`);
  }
});

// Explicit synthetic values only: no process environment, files, clients or provider calls.
const key = offset => Buffer.from(Array.from({ length: 32 }, (_, i) => i + offset)).toString('base64url');
const base = () => ({ DATABASE_URL: 'postgresql://127.0.0.1/synthetic_host', APP_ORIGIN: 'http://127.0.0.1:3000',
  AUTH_LOCAL_HTTP: 'true', AUTH_CSRF_HMAC_KEY: key(1), AUTH_ABUSE_HMAC_KEY: key(2),
  AUTH_OUTBOX_ACTIVE_KEY_ID: 'fixture', AUTH_OUTBOX_KEYS_JSON: JSON.stringify({ fixture: Buffer.alloc(32, 3).toString('base64') }) });
const files = { FILES_ENABLED: '1', FILES_S3_ENDPOINT: 'http://127.0.0.1:18334', FILES_S3_REGION: 'us-east-1',
  FILES_S3_BUCKET: 'synthetic-private', FILES_S3_ACCESS_KEY_ID: 'a'.repeat(32), FILES_S3_SECRET_ACCESS_KEY: 'b'.repeat(64),
  FILES_SCANNER_HOST: '127.0.0.1', FILES_SCANNER_PORT: '13311', FILES_DRAFT_QUOTA_BYTES: '1000' };
const classrooms = { CLASSROOMS_ENABLED: '1', CLASSROOMS_QUOTA_BYTES: '2000', CLASSROOMS_SIGNING_KEY: key(3), CLASSROOMS_DELIVERY_KEY: key(4) };
const ai = { AI_ENABLED: 'true', AI_BACKEND: 'gemini-developer', AI_MODEL: 'synthetic-model', AI_API_KEY: 'synthetic-test-key-only',
  AI_DAILY_ACTOR_REQUESTS: '5', AI_DAILY_GLOBAL_REQUESTS: '20', AI_MAX_INPUT_TOKENS: '1000', AI_MAX_OUTPUT_TOKENS: '100',
  AI_DAILY_BUDGET_USD: '10', AI_INPUT_USD_PER_MILLION: '1', AI_OUTPUT_USD_PER_MILLION: '2', AI_DEADLINE_MS: '1000',
  AI_MAX_CONCURRENCY: '2', AI_MAX_DISPATCHES: '2', AI_MAX_JOB_AGE_MS: '300000' };
const { readConfiguration } = loadTsModule('apps/api/src/bootstrap/configuration.ts');

test('S2 real configuration parser preserves the supported capability matrix', () => {
  for (const [patch, enabled] of [[{}, [false, false, false]], [{ AI_ENABLED: 'false' }, [false, false, false]],
    [files, [true, false, false]], [{ ...files, ...classrooms }, [true, true, false]],
    [{ ...files, ...classrooms, ...ai }, [true, true, true]]]) {
    const env = { ...base(), ...patch }, before = structuredClone(env), config = readConfiguration(env);
    assert.deepEqual([!!config.files, !!config.classrooms, !!config.ai], enabled);
    assert.equal(config.foxyVisual, undefined);
    assert.equal(config.studyQuotaBytes, undefined);
    assert.deepEqual(env, before);
  }
  for (const quota of ['0', '250000000', '999999999999999']) {
    assert.equal(readConfiguration({ ...base(), STUDY_STORAGE_QUOTA_BYTES: quota }).studyQuotaBytes, BigInt(quota));
  }
});

test('S2 invalid dependency combinations and quota/AI configuration fail without mutating input', () => {
  for (const [patch, message] of [
    [classrooms, 'Invalid configuration: classrooms require private files.'],
    [ai, 'Invalid configuration: AI extraction requires classrooms.'],
    [{ ...files, ...ai }, 'Invalid configuration: AI extraction requires classrooms.'],
    [{ ...files, ...classrooms, ...ai, AI_API_KEY: undefined }, 'Invalid configuration: AI extraction configuration is unavailable.'],
    [{ AI_IMAGE_ENABLED: 'true' }, 'Invalid configuration: Foxy visual configuration is unavailable.'],
    ...['-1', '1.5', '1000000000000000', ''].map(value => [{ STUDY_STORAGE_QUOTA_BYTES: value }, 'Invalid configuration: private study storage quota.']),
  ]) {
    const env = { ...base(), ...patch }, before = structuredClone(env);
    assert.throws(() => readConfiguration(env), { message });
    assert.deepEqual(env, before);
  }
});

function hostProbe() {
  const calls = [], stubs = {};
  let Root, registration;
  // Stub only imported host edges, while executing the actual root registration, mounting and shutdown code.
  for (const node of rootSource.statements.filter(ts.isImportDeclaration)) {
    if (node.importClause?.isTypeOnly) continue;
    const exports = stubs[node.moduleSpecifier.text] ?? {};
    for (const binding of node.importClause?.namedBindings?.elements ?? []) {
      if (binding.isTypeOnly) continue;
      const name = binding.propertyName?.text ?? binding.name.text;
      const edge = (...args) => { calls.push(name); return {}; };
      edge.register = edge.integrated = edge;
      exports[name] = edge;
    }
    stubs[node.moduleSpecifier.text] = exports;
  }
  stubs['@nestjs/common'] = { Module: () => target => { Root = target; }, Inject: () => () => {}, Optional: () => () => {} };
  stubs['./study-runtime.ts'] = { STUDY_RUNTIME: 'StudyRuntime', createStudyRuntime() {} };
  stubs['./foxy-runtime.ts'].FOXY_RUNTIME = 'FoxyRuntime';
  const resources = { close() { calls.push('infrastructure.close'); } };
  stubs['../modules/files/infrastructure/configuration.ts'].createFileInfrastructure = () => resources;
  stubs['./academic-delivery-composition.ts'].localInvitationSender = () => resources;
  const app = { get(token) { return token === 'StudyRuntime' ? { service: {}, uploads: {}, attachments: {}, reminders: {}, admit() {} }
    : token === 'FoxyRuntime' ? { services: {} } : {}; },
    setGlobalPrefix(prefix) { assert.equal(prefix, 'api/v1'); },
    getHttpAdapter() { return { getInstance: () => ({ disable() {} }) }; }, enableShutdownHooks() {} };
  stubs['@nestjs/core'] = { NestFactory: { async create(module) { registration = module; return app; } } };
  const { createApplication } = loadTsModule(rootPath, { stubs });
  return { createApplication, calls, root: () => Root, registration: () => registration };
}

test('S2 host mounts Study and attachment transports only with both files and classrooms, independently of AI', async () => {
  const studyTransports = ['installChatAttachmentTransport', 'installStudyUploads', 'installStudyReminders', 'installStudyTransport'];
  for (const patch of [{}, files, { ...files, ...classrooms }, { ...files, ...classrooms, ...ai }]) {
    const host = hostProbe(), config = readConfiguration({ ...base(), ...patch });
    await host.createApplication(config);
    const enabled = !!config.classrooms && !!config.files;
    assert.deepEqual(host.calls.filter(call => studyTransports.includes(call)), enabled ? studyTransports : []);
    const provider = host.registration().providers.find(item => item.provide === 'StudyRuntime');
    assert.equal(!!provider, enabled);
    if (provider) assert.equal(provider.inject.length, 3);
    assert.ok(host.calls.includes('installIdentityTransport'));
    assert.ok(host.calls.includes('installAgendaTransport'));
    assert.ok(host.calls.includes('installHomeTransport'));
    assert.equal(host.calls.includes('installFilesTransport'), !!config.files);
    assert.equal(host.calls.includes('installFoxyTransport'), enabled);
  }
});

test('S1/S2 root drains Study before infrastructure even on rejection and preserves first failure', async () => {
  for (const reject of [false, true]) {
    const host = hostProbe(), events = [];
    await host.createApplication(readConfiguration(base()));
    let release;
    const pending = new Promise((resolve, fail) => { release = reject ? fail : resolve; });
    const failure = new Error('synthetic drain failure');
    const worker = name => ({ onModuleDestroy() { events.push(name); return Promise.resolve(); } });
    const root = new (host.root())({ shutdownMail() { events.push('mail'); } },
      { close() { events.push('files'); } }, { close() { events.push('classrooms'); } },
      worker('library'), worker('curriculum'), worker('activity'), worker('student'), worker('grading'), worker('foxy'),
      { close() { events.push('study'); return pending; } });
    const closing = root.onModuleDestroy();
    assert.deepEqual(events, ['study', 'foxy', 'library', 'curriculum', 'activity', 'student', 'grading']);
    release(failure);
    if (reject) await assert.rejects(closing, error => error === failure); else await closing;
    assert.deepEqual(events.slice(-3), ['mail', 'files', 'classrooms']);
  }
});
