import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTsModule } from './helpers/load-ts-module.mjs';

function composition() {
  const cores = [], services = {};
  class Core {
    constructor(ports) { this.ports = ports; this.tokens = {}; cores.push(this); }
    run(...args) { return { receiver: this, method: 'run', args }; }
    classroom(...args) { return { receiver: this, method: 'classroom', args }; }
    summary(...args) { return { receiver: this, method: 'summary', args }; }
    mine(...args) { return { receiver: this, method: 'mine', args }; }
    detail(...args) { return { receiver: this, method: 'detail', args }; }
  }
  function service(name) {
    class Capability {
      constructor(core, dependencies) { this.core = core; this.dependencies = dependencies; services[name] = this; }
    }
    for (const method of ['enroll', 'activity', 'activityView', 'activitySummary', 'gradingContext', 'savePrivateGrading',
      'gradingView', 'scoreCorrection', 'progressView', 'changePlan', 'listWall', 'getAttemptGrading', 'changeActivities']) {
      Capability.prototype[method] = function (...args) { return { receiver: this, method, args }; };
    }
    return Capability;
  }
  const stubs = {
    '../modules/identity/mail-delivery/infrastructure/mail/mailbox.ts': { validateMailbox: value => value },
    '../modules/files/custody/infrastructure/promotion.ts': { promoteDraftPlan() {} },
    '../modules/classrooms/catalog/infrastructure/brujula-search.ts': { searchClassrooms: (core, ...args) => ({ receiver: core, method: 'search', args }) },
    '../modules/classrooms/access/infrastructure/core.ts': { ClassroomCore: Core },
    '../modules/materials/publication/infrastructure/classroom-file.ts': { createReadyClassroomFile: () => function readyFile() {} },
    '../modules/classrooms/access/infrastructure/revision.ts': { advanceClassroomRevision() {} },
    '../modules/classrooms/catalog/public.ts': { createCatalogOperations() {} },
    '../modules/classrooms/catalog/infrastructure/classroom-queries-repository.ts': { createCatalogRepository() {} },
    '../modules/classrooms/invitations/infrastructure/delivery-envelope.ts': { decryptDelivery() {} },
    '../platform/crypto/digest.ts': { digest() {} },
    './academic-management-composition.ts': { DraftService: service('drafts'), MembershipService: service('memberships'), InvitationService: service('invitations'), newClassroomCode() {} },
    './academic-curriculum-composition.ts': { PlanService: service('plan') },
    './academic-materials-composition.ts': { LibraryService: service('library') },
    './academic-communication-composition.ts': { WallService: service('wall') },
    './academic-notifications-composition.ts': { NotificationInboxService: service('notifications') },
    './academic-authoring-composition.ts': { ActivityAuthoringService: service('authoring') },
    '../modules/participation/attempts/infrastructure/activity-session.ts': {
      studentActivityView: (view, ...args) => view(...args), sessionView: (view, ...args) => view(...args),
    },
    './academic-student-composition.ts': { ActivityParticipationService: service('attempts'), PracticalSubmissionService: service('practical'),
      QuestionnaireAttemptService: service('questionnaires'), ActivityHistoryService: service('history') },
    './academic-grading-composition.ts': { GradingService: service('review'), GradingAiService: service('assistance'),
      GradePublicationService: service('publication'), GradeCorrectionService: service('corrections'), ProgressService: service('progress'),
      createTeacherSupportService: core => new (service('teacherSupport'))(core) },
  };
  const module = loadTsModule('apps/api/src/bootstrap/academic-composition.ts', { stubs });
  const ports = { files: { promoteDraftPlanInTransaction() {} }, database: {}, deliveryKey: Buffer.alloc(32), authenticate() { return this; } };
  const runtime = module.createAcademicRuntime ? module.createAcademicRuntime(ports) : new module.ClassroomService(ports);
  return { runtime, cores, services, module, ports };
}

test('academic runtime groups capabilities around exactly one core and one set of ports/tokens', () => {
  const { runtime, cores, services, ports } = composition();
  assert.equal(cores.length, 1);
  assert.equal(runtime.access, cores[0]);
  assert.equal(runtime.access.ports.database, ports.database);
  assert.equal(runtime.classrooms.drafts, services.drafts);
  assert.equal(runtime.classrooms.invitations, services.invitations);
  assert.equal(runtime.activities.authoring, services.authoring);
  assert.equal(runtime.participation.attempts, services.attempts);
  assert.equal(runtime.grading.progress, services.progress);
  assert.equal(runtime.grading.teacherSupport, services.teacherSupport);
  assert.equal(services.teacherSupport.core, runtime.access);
  assert.ok(Object.values(services).every(service => service.core === cores[0]));
  assert.equal(runtime.changeActivities, undefined);
});

test('cross-capability callbacks keep their original receiver and shared dependencies', () => {
  const { runtime, services } = composition();
  assert.equal(services.invitations.dependencies.enroll('tx').receiver, services.memberships);
  assert.equal(services.attempts.dependencies.activity('tx').receiver, services.authoring);
  assert.equal(services.review.dependencies.activityView('tx').receiver, services.authoring);
  assert.equal(services.assistance.dependencies.gradingContext('tx').receiver, services.review);
  assert.equal(services.authoring.dependencies.studentActivityView('tx').receiver, services.authoring);
  assert.equal(services.history.dependencies.sessionView('tx').receiver, services.authoring);
  assert.equal(services.authoring.dependencies.readyClassroomFile, services.library.dependencies.readyClassroomFile);
  assert.equal(services.publication.dependencies.advanceRevision, services.corrections.dependencies.advanceRevision);
  assert.equal(runtime.access.tokens, services.plan.core.tokens);
});

test('the production composition exports a runtime token and has no flat facade class', () => {
  const source = readFileSync('apps/api/src/bootstrap/academic-composition.ts', 'utf8');
  assert.doesNotMatch(source, /class ClassroomService|bindClassroomMethods/);
  const { module } = composition();
  assert.equal(typeof module.ACADEMIC_RUNTIME, 'symbol');
});

test('Foxy and AI receive only their own bound consumer operations', () => {
  const { runtime, services } = composition();
  const ports = loadTsModule('apps/api/src/bootstrap/academic-consumer-ports.ts');
  const foxy = ports.academicFoxyAccess(runtime);
  const student = ports.academicStudentProgress(runtime);
  const activity = ports.academicActivityAccess(runtime);
  assert.deepEqual(Object.keys(foxy).sort(), ['classroom', 'run']);
  assert.deepEqual(Object.keys(student), ['progressView']);
  assert.deepEqual(Object.keys(activity).sort(), ['classroom', 'ports']);
  assert.deepEqual(Object.keys(activity.ports).sort(), ['authenticate', 'database']);
  assert.equal(foxy.run({}, true, () => {}).receiver, runtime.access);
  assert.equal(foxy.classroom('tx', 'actor', 'room').receiver, runtime.access);
  assert.equal(student.progressView('tx').receiver, services.progress);
  assert.equal(activity.classroom('tx').receiver, runtime.access);
  assert.equal(activity.ports.database, runtime.access.ports.database);
  assert.equal(activity.ports.authenticate(), runtime.access.ports);
});

test('the real runtime shares the caller transaction and preserves read/write classroom locks', async () => {
  const { createAcademicRuntime } = loadTsModule('apps/api/src/bootstrap/academic-composition.ts');
  const { academicFoxyAccess } = loadTsModule('apps/api/src/bootstrap/academic-consumer-ports.ts');
  const actorId = 'a1111111-1111-4111-8111-111111111111', room = 'b1111111-1111-4111-8111-111111111111';
  const queries = [], transactions = [];
  const raw = { $queryRawUnsafe: async sql => {
    queries.push(sql);
    if (sql.includes('FROM users WHERE')) return [{ id: actorId, email_verified_at: new Date(), account_role: 'teacher' }];
    if (sql.includes('clock_timestamp() AS now')) return [{ now: new Date() }];
    if (sql.includes('account_action_controls')) return [{ request_count: 1 }];
    if (sql.includes('FROM classrooms c')) return [{ id: room, teacher_id: actorId, archived_at: null, revision: 0n }];
    throw Error('Unexpected synthetic SQL');
  } };
  const database = { $transaction: async (operation, options) => {
    transactions.push(options); return operation(raw);
  } };
  const runtime = createAcademicRuntime({ database, authenticate: async () => actorId,
    files: { load() { throw Error('unexpected file access'); }, loadAuthorized() { throw Error('unexpected file access'); },
      promoteDraftPlanInTransaction() { throw Error('unexpected file promotion'); } },
    signingKey: Buffer.alloc(32, 1), deliveryKey: Buffer.alloc(32, 2), classroomQuotaBytes: 1n,
    webOrigin: 'http://127.0.0.1:3005' });
  const access = academicFoxyAccess(runtime);
  for (const write of [false, true]) {
    queries.length = 0;
    await access.run({}, write, async (tx, actor) => {
      assert.equal(actor.id, actorId);
      await access.classroom(tx, actor, room);
    });
    assert.match(queries.find(sql => sql.includes('FROM classrooms c')), write ? /FOR UPDATE OF c/i : /FOR SHARE OF c/i);
  }
  assert.deepEqual(transactions, [{ maxWait: 2000, timeout: 6000 }, { maxWait: 2000, timeout: 6000 }]);
});

test('the fixture constructs one real runtime and keeps the 75 prototype operations bound', () => {
  const { module, cores, services, ports } = composition();
  let composed = 0;
  const { ClassroomService } = loadTsModule('tests/helpers/academic-fixture.ts', { stubs: {
    'node:module': { createRequire: () => () => ({ createAcademicRuntime(input) {
      composed++; return module.createAcademicRuntime(input);
    } }) },
  } });
  const service = new ClassroomService(ports);
  assert.equal(composed, 1); assert.equal(cores.length, 2);
  assert.equal(Object.getOwnPropertyNames(ClassroomService.prototype).filter(name => name !== 'constructor').length, 75);
  for (const method of Object.getOwnPropertyNames(ClassroomService.prototype).filter(name => name !== 'constructor')) {
    assert.equal(typeof ClassroomService.prototype[method], 'function');
  }
  assert.equal(service.ports, service.runtime.access.ports); assert.equal(service.tokens, service.runtime.access.tokens);
  const changePlan = service.changePlan, run = service.run;
  assert.equal(changePlan({}, 'room', {}).receiver, services.plan);
  assert.equal(run({}, false, () => {}).receiver, service.runtime.access);
});

test('fixture return types remain concrete and narrow consumers cannot access unrelated capabilities', async () => {
  const ts = (await import('typescript')).default;
  const { resolve } = await import('node:path');
  const path = resolve('tests/helpers/academic-fixture-type-fixture.ts');
  const source = [
    "import type { ClassroomService } from './academic-fixture.ts';",
    "import type { PlanService } from '../../apps/api/src/bootstrap/academic-curriculum-composition.ts';",
    "import type { AcademicFoxyAccess, AcademicStudentProgress, AcademicActivityAccess } from '../../apps/api/src/bootstrap/academic-consumer-ports.ts';",
    'declare const fixture: ClassroomService;',
    'declare const foxy: AcademicFoxyAccess;',
    'declare const student: AcademicStudentProgress;',
    'declare const activity: AcademicActivityAccess;',
    "const plan: ReturnType<PlanService['changePlan']> = fixture.changePlan({}, 'room', {});",
    'const result: Promise<number> = fixture.run({}, false, async () => 42);',
    '// @ts-expect-error A concrete plan result cannot be replaced by a caller-selected number.',
    "const wrong: Promise<number> = fixture.changePlan({}, 'room', {});",
    '// @ts-expect-error Foxy cannot mutate or publish an activity.',
    'foxy.changeActivities;',
    '// @ts-expect-error Student AI has no classroom transaction entry point.',
    'student.run;',
    '// @ts-expect-error Activity AI receives authentication/database, not tokens or the rest of ClassroomPorts.',
    'activity.ports.tokens;',
  ].join('\n');
  const options = { strict: true, noEmit: true, skipLibCheck: true, allowImportingTsExtensions: true,
    target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext };
  const host = ts.createCompilerHost(options), getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (file, ...args) => resolve(file) === path
    ? ts.createSourceFile(path, source, options.target, true) : getSourceFile(file, ...args);
  const program = ts.createProgram([path], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program).filter(item => item.file && resolve(item.file.fileName) === path);
  assert.deepEqual(diagnostics.map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n')), []);
});
