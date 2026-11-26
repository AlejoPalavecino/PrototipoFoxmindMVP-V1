import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudyService } from '../apps/api/src/modules/study/folders/application/service.ts';

const row = (id, extra = {}) => ({
  id, owner_id: 'owner', status: 'ACTIVE', revision: 3n, created_at: new Date('2026-11-01T10:00:00Z'), updated_at: new Date('2026-11-20T10:00:00Z'),
  fields: { name: id, subject: 'Fotografía', academicYear: 2026, bannerKey: 'general', linkedClassroomId: null, planFileId: null },
  topics: [{ id: 'luz', title: 'Luz' }, { id: 'contraste', title: 'Contraste' }],
  scores: [{ topicId: 'luz', score: 1 }, { topicId: 'contraste', score: 0 }],
  ...extra,
});

function service({ rows, nextReviews }) {
  const calls = [];
  const options = {
    uow: { run: async (_request, write, work) => { calls.push(['run', write]); return work({ tx: true }, 'owner'); } },
    folders: { load: async () => assert.fail('el listado no carga carpetas completas'), list: async (_tx, owner) => { calls.push(['list', owner]); return rows; } },
    linkedClassrooms: async () => [],
    ...(nextReviews ? { agenda: { nextReviews: async (_tx, owner) => { calls.push(['nextReviews', owner]); return nextReviews; } } } : {}),
  };
  return { list: () => createStudyService(options).list({}), calls };
}

test('el listado de carpetas trae el avance por carpeta y el próximo repaso agendado', async () => {
  const review = { folderId: 'foto', startAt: '2026-12-01T21:00:00Z', endAt: '2026-12-01T21:45:00Z', title: 'Repaso: Contraste', timeZone: 'America/Argentina/Buenos_Aires' };
  const { list, calls } = service({ rows: [row('foto'), row('bio', { topics: [], scores: [] })], nextReviews: [review] });
  const result = await list();
  assert.deepEqual(result.items[0].progress, { topics: 2, practicedTopics: 2, weakestTopic: { id: 'contraste', title: 'Contraste' } });
  assert.deepEqual(result.items[0].nextReview, { startAt: review.startAt, endAt: review.endAt, title: review.title, timeZone: review.timeZone });
  assert.deepEqual(result.items[1].progress, { topics: 0, practicedTopics: 0 });
  assert.equal('nextReview' in result.items[1], false, 'sin repaso agendado no se inventa uno');
  assert.deepEqual(calls.filter(([name]) => name === 'nextReviews'), [['nextReviews', 'owner']], 'una sola consulta a la Agenda para toda la colección');
  assert.deepEqual(calls[0], ['run', false], 'lectura sin escritura');
});

test('sin integración de Agenda ni carpetas el listado sigue respondiendo', async () => {
  assert.equal('nextReview' in (await service({ rows: [row('foto')] }).list()).items[0], false);
  const empty = service({ rows: [], nextReviews: [] });
  assert.deepEqual((await empty.list()).items, []);
  assert.equal(empty.calls.some(([name]) => name === 'nextReviews'), false, 'sin carpetas no consulta la Agenda');
});
