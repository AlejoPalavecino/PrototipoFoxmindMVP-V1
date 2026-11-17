import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { deferred } from './agenda-ui-helpers.test.mjs';

const { createStudyRevisionController } = loadTsModule('apps/web/src/features/study/model/study-revision-controller.ts');
const detail = (id, revision = '1') => ({
  folder: { id, revision, name: `Carpeta ${id}`, units: [] },
  sources: [{ id: `source-${id}` }], conversations: [{ id: `conversation-${id}` }],
  creations: [], practices: [], exams: [], memory: { owner: id },
});

// Check not only emitted values but the next command's destination/revision:
// stale work must not silently replace the active context even without a render.
for (const replaceAt of ['command', 'refresh']) {
  for (const refreshFails of [false, true]) {
    test(`study ignores A after replace(B) while ${replaceAt} is pending; refresh ${refreshFails ? 'fails' : 'succeeds'}`, async () => {
      const commandA = deferred(), refreshA = deferred(), refreshStarted = deferred();
      // A correct controller may skip an obsolete refresh entirely.
      refreshA.promise.catch(() => {});
      const a = detail('A'), b = detail('B', '7'), committedA = detail('A', '2');
      const emitted = [], commands = [];
      const resultA = { folder: committedA.folder, result: { status: 'COMPLETE' } };
      const controller = createStudyRevisionController(a, {
        command: async (id, revision) => {
          commands.push({ id, revision });
          return id === 'A' ? commandA.promise : { folder: b.folder };
        },
        get: async id => {
          if (id === 'A') { refreshStarted.resolve(); return refreshA.promise; }
          return b;
        },
      }, next => emitted.push(structuredClone(next)));
      const pending = controller.run('SAVE_ANSWERS', { practiceId: 'practice-A' });
      if (replaceAt === 'command') controller.replace(b);
      commandA.resolve(resultA);
      if (replaceAt === 'refresh') { await refreshStarted.promise; controller.replace(b); }
      if (refreshFails) refreshA.reject(new Error('synthetic refresh offline'));
      else refreshA.resolve(committedA);
      // A committed write remains successful even when its refresh fails.
      assert.deepEqual(await pending, resultA);
      for (const next of emitted) assert.deepEqual(next, b, 'late A must never emit A or merge A.folder with B details');
      await controller.run('NEW_CONVERSATION');
      assert.deepEqual(commands, [{ id: 'A', revision: '1' }, { id: 'B', revision: '7' }]);
      assert.deepEqual(emitted.at(-1), b, 'B must retain its complete detail and revision');
    });
  }
}

for (const replaceAt of ['command', 'recovery refresh']) {
 for (const refreshFails of [false, true]) {
  test(`study preserves B after command A error with replace during ${replaceAt}; recovery refresh ${refreshFails ? 'fails' : 'succeeds'}`, async () => {
    const commandA = deferred(), refreshA = deferred(), refreshStarted = deferred();
    refreshA.promise.catch(() => {});
    const a = detail('A'), b = detail('B', '7');
    const error = new Error('synthetic command rejected');
    const emitted = [], commands = [];
    const controller = createStudyRevisionController(a, {
      command: async (id, revision) => {
        commands.push({ id, revision });
        return id === 'A' ? commandA.promise : { folder: b.folder };
      },
      get: async id => {
        if (id === 'B') return b;
        refreshStarted.resolve();
        return refreshA.promise;
      },
    }, next => emitted.push(structuredClone(next)));
    const pending = controller.run('SAVE_ANSWERS');
    const rejected = assert.rejects(pending, value => value === error);
    if (replaceAt === 'command') controller.replace(b);
    commandA.reject(error);
    if (replaceAt === 'recovery refresh') { await refreshStarted.promise; controller.replace(b); }
    if (refreshFails) refreshA.reject(new Error('synthetic recovery refresh offline'));
    else refreshA.resolve(detail('A', '3'));
    await rejected;
    for (const next of emitted) assert.deepEqual(next, b, 'recovery of a stale error must not render A over B');
    await controller.run('NEW_CONVERSATION');
    assert.deepEqual(commands, [{ id: 'A', revision: '1' }, { id: 'B', revision: '7' }]);
    assert.deepEqual(emitted.at(-1), b);
  });
 }
}

test('study retains confirmed write and uses its revision when refresh fails in the current folder', async () => {
  const a = detail('A'), emitted = [], revisions = [];
  const controller = createStudyRevisionController(a, {
    command: async (id, revision) => {
      revisions.push(revision);
      return { folder: detail(id, String(Number(revision) + 1)).folder };
    },
    get: async () => { throw new Error('synthetic refresh offline after commit'); },
  }, next => emitted.push(structuredClone(next)));
  assert.equal((await controller.run('SAVE_ANSWERS')).folder.revision, '2');
  assert.deepEqual(emitted, [{ ...a, folder: detail('A', '2').folder }]);
  await controller.run('FINALIZE_PRACTICE');
  assert.deepEqual(revisions, ['1', '2'], 'do not repeat a committed write with its old revision');
});
