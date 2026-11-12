import test from 'node:test';
import assert from 'node:assert/strict';
import { classroomClient, id } from './helpers/platform-polish/classroom-data.ts';
import { parseWallData } from '../src/core/domain/communication/wall.ts';

for (const role of ['teacher', 'student']) {
  test(`visual fixture ${role}: Muro satisfies the runtime reader contract`, async () => {
    const data = parseWallData(await classroomClient(role).call(`/${id}/wall`));
    assert.equal(data.posts.length, 1);
    assert.equal(data.posts[0].replyCount, 0);
    assert.equal(data.nextCursor, null);
  });
  test(`visual fixture ${role}: opening an activity supplies an attempt history`, async () => {
    const route = role === 'teacher' ? 'history-submissions' : 'history';
    const data = await classroomClient(role).call(`/${id}/activities/${id}/${route}`);
    assert.equal(data.activity.id, id);
    assert.deepEqual(data.attempts.filter(attempt => attempt.status === 'SUBMITTED'), []);
  });
}
