import { randomUUID } from 'node:crypto';
import {seedPlan} from './helpers/plan-fixture.mjs';
import { FileStore } from '../.build/api/apps/api/src/modules/files/infrastructure/store.js';
import { createActivityAiAccess } from '../.build/api/apps/api/src/modules/activities/infrastructure/activity-ai/database.js';
import { ClassroomService } from '../.build/api/apps/api/src/bootstrap/academic-composition.js';
export const configuration = { model: 'gemini-test-fixture', maxInputTokens: 100000, maxOutputTokens: 16384,
  deadlineMs: 1000, maxDispatches: 2, maxJobAgeMs: 300000, maxConcurrency: 2, dailyActorRequests: 5,
  dailyGlobalRequests: 20, dailyBudgetUsd: 10, inputUsdPerMillion: 1, outputUsdPerMillion: 2 };
export async function fixture(local, overrides = {}) {
  const teacher = randomUUID(), stranger = randomUUID(), student = randomUUID(), room = randomUUID(), fileId = randomUUID();
  for (const id of [teacher, stranger, student]) await local.pool.query(`INSERT INTO users
    (id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
    VALUES($1,now(),$2,$2,'Synthetic','Activity AI','fixture',now(),$3)`, [id, `${id}@example.test`, id === student ? 'student' : 'teacher']);
  await local.pool.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
    VALUES($1,now(),$2,'Activity AI','Subject','A',2026,'UTC','explore',100000000)`, [room, teacher]);
  const enrollment = randomUUID();
  await local.pool.query('INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)', [enrollment, room, student]);
  await local.pool.query(`INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method) VALUES($1,now(),$2,$3,'CODE')`, [randomUUID(), enrollment, room]);
  const authenticate = async (_tx, req) => req.actor;
  const files = new FileStore(local.database, { authenticate, authorize: async () => {} }, 100000000n);
  const classrooms = new ClassroomService({ database: local.database, files, authenticate, signingKey: Buffer.alloc(32, 1),
    deliveryKey: Buffer.alloc(32, 2), classroomQuotaBytes: 100000000n, webOrigin: 'http://127.0.0.1:3005' });
  const T = { actor: teacher }, S = { actor: student }, O = { actor: stranger };
  const detail = () => classrooms.detail(T, room), revision = async () => (await detail()).revision;
  const plan = async operation => classrooms.changePlan(T, room, { revision: await revision(), operation });
  const seed=operation=>seedPlan(local.pool.query.bind(local.pool),room,operation);
  await seed({ action: 'addUnit', name: 'Luz' });
  const unitId = (await detail()).units[0].id;
  await seed({ action: 'addTopic', unitId, name: 'Exposición' });
  const topicIds = (await detail()).units[0].topics.map(x => x.id), sourceId = `plan:${randomUUID()}`;
  const start = { revision: await revision(), requestId: randomUUID(), type: 'ASSIGNMENT', unitId, topicIds, sourceIds: [sourceId],
    objective: 'Relacionar conceptos', groupLevel: 'Segundo año', difficulty: 'BASIC', durationMinutes: 40, context: '',
    counts: { assignment: 2, development: 0, singleChoice: 0, multipleChoice: 0 }, acknowledgedWarnings: [] };
  const proposal = { schemaVersion: 'activity-proposal-v1', type: 'ASSIGNMENT', title: 'Luz en contexto', objective: start.objective,
    instructions: 'Resolver según las fuentes.', assignmentPrompts: ['Comparar casos.', 'Explicar relación.'], questions: [], warnings: [],
    evidence: [0, 1].map(index => ({ item: 'assignment', index, references: [{ sourceId, page: 1 }] })) };
  const calls = [], state = { digest: 'a'.repeat(64), extension: 'pdf', available: true };
  const options = { access: createActivityAiAccess(classrooms.ports, classrooms.classroom), configuration, reader: {
    snapshot: async (_tx, _request, classroomId, requested) => {
      if (!state.available || classroomId !== room || requested !== sourceId) throw Object.assign(new Error('FILE_NOT_READY'), { code: 'FILE_NOT_READY' });
      return { sourceId, fileId, digest: state.digest, extension: state.extension, sizeBytes: 14 };
    },
    read: async () => { calls.push('read'); return { sourceId, document: state.extension === 'pdf'
      ? { kind: 'pdf', bytes: Uint8Array.from([37, 80, 68, 70]) } : { kind: 'text', text: 'Exposición: luz acumulada en un intervalo.' },
    pageCount: state.extension === 'pdf' ? 3 : null, warnings: state.extension === 'pdf' ? [] : ['DOCX_IMAGES_OMITTED'] }; },
  }, provider: {
    countActivityTokens: async () => { calls.push('count'); return 20; },
    generateActivity: async () => { calls.push('generate'); return { json: { status: 'READY', proposal }, inputTokens: 20, outputTokens: 30 }; },
  }, ...overrides };
  return { ...local, options, calls, state, classrooms, teacher, stranger, student, room, fileId, sourceId, unitId, topicIds,
    T, S, O, revision, plan,seedPlan:seed, start, proposal };
}
