import test from 'node:test';
import assert from 'node:assert/strict';
import { crc32 } from 'node:zlib';
import { academicTables, academicHash, rejectUnchanged, maximumZip, assertPublishedQuestions, checkedResponse } from './p9-journey-helpers.mjs';

test('public response checking retains binary digest/length envelopes instead of assuming JSON bodies', () => {
  const binary = { status: 200, length: 50000000, digest: 'actual-hash' };
  assert.equal(checkedResponse(binary), binary);
  assert.deepEqual(checkedResponse({ status: 200, body: { id: 'actual-id' } }), { id: 'actual-id' });
  assert.equal(checkedResponse({ status: 200, body: null }), null);
  assert.throws(() => checkedResponse({ status: 403, body: { error: 'FORBIDDEN' } }));
});

test('academic rejection snapshot includes complete P6-P8 state and deterministic table ordering', async () => {
  for (const table of ['units', 'study_plan_versions', 'materials', 'wall_posts', 'wall_replies', 'student_activities',
    'questions', 'question_options', 'answers', 'answer_selections', 'attempt_attachments', 'attempt_grades',
    'question_grades', 'grade_corrections', 'file_custodies']) assert.ok(academicTables.includes(table), table);
  assert.equal(new Set(academicTables).size, academicTables.length);
  assert.equal(academicTables.includes('sessions'), false);
  assert.equal(academicTables.includes('background_jobs'), false);
  const queries = [], db = { query: async sql => { queries.push(sql); return { rows: [{ value: sql }] }; } };
  assert.equal(await academicHash(db), await academicHash(db));
  assert.ok(queries.every(sql => sql.endsWith('ORDER BY to_jsonb(t)::text')));
});

test('rejection evidence requires the exact route status and unchanged academic hash', async () => {
  let changed = false;
  const db = { query: async () => ({ rows: [{ value: changed }] }) };
  await rejectUnchanged(db, async () => ({ status: 403 }), 403);
  await assert.rejects(rejectUnchanged(db, async () => ({ status: 404 }), 403));
  await assert.rejects(rejectUnchanged(db, async () => { changed = true; return { status: 403 }; }, 403));
});

test('maximum attachment generator creates distinct stored unencrypted ZIPs with exact sizes and valid CRC', () => {
  const hashes = new Set();
  for (let index = 0; index < 5; index++) {
    const bytes = maximumZip(index, 4096), payload = bytes.subarray(38, bytes.length - 76);
    assert.equal(bytes.length, 4096); assert.equal(bytes.readUInt32LE(), 0x04034b50);
    assert.equal(bytes.readUInt16LE(6), 0); assert.equal(bytes.readUInt16LE(8), 0);
    assert.equal(bytes.readUInt32LE(14), crc32(payload));
    assert.equal(bytes.readUInt32LE(18), payload.length); assert.equal(bytes.readUInt32LE(22), payload.length);
    assert.equal(bytes.subarray(30, 38).toString(), 'work.txt');
    assert.equal(bytes.readUInt32LE(bytes.length - 22), 0x06054b50);
    hashes.add(bytes.toString('hex'));
  }
  assert.equal(hashes.size, 5);
  assert.throws(() => maximumZip(5)); assert.throws(() => maximumZip(0, 113));
});

test('positive feedback assertion binds question IDs, answers, exact points and distinct nonempty comments', () => {
  const expected = [{ id: 'q1', text: 'Answer', selected: [], earned: { numerator: '2', denominator: '1' }, feedback: 'Specific first feedback' },
    { id: 'q2', text: null, selected: ['selected'], earned: { numerator: '0', denominator: '1' }, feedback: 'Specific second feedback' }];
  const result = { status: 'published', questions: expected.map(q => ({ id: q.id, feedback: q.feedback, earned: q.earned,
    answer: { text: q.text, selectedOptions: q.selected.map(id => ({ id, text: id })) } })) };
  assertPublishedQuestions(result, expected);
  assert.throws(() => assertPublishedQuestions({ ...result, questions: result.questions.map(q => ({ ...q, feedback: null })) }, expected));
  assert.throws(() => assertPublishedQuestions({ ...result, questions: [...result.questions].reverse() }, expected));
  assert.throws(() => assertPublishedQuestions({ ...result, audit: [] }, expected));
});
