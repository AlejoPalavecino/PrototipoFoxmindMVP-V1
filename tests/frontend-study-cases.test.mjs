import test from 'node:test';
import assert from 'node:assert/strict';
import { componentWithPorts } from './foxmind-3d-flows-loader.test.mjs';
import { descendants, hookView, deferred } from './agenda-ui-helpers.test.mjs';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const detail = (id) => ({
  folder: { id, revision: '1', name: id, status: 'ACTIVE', units: [] },
  conversations: [],
  sources: [],
  creations: [],
  exams: [],
  practices: [],
});

test('new attempt selects the command practice ID without a second detail fetch', async () => {
  const { StudyWorkspace } = componentWithPorts(
    'apps/web/src/features/study/ui/study-workspace.tsx',
    {
      '../../../shared/use-chat-attachments': { useChatAttachments: () => ({ items: [] }) },
      '../../../../../shared-ui/use-chat-follow': { useChatFollow: () => ({}) },
    },
  );
  const value = detail('A');
  value.practices = ['old', 'actual-result', 'unrelated-last'].map((id) => ({
    id,
    title: id,
    kind: 'QUIZ',
    status: id === 'old' ? 'FINALIZED' : 'ACTIVE',
    questions: [],
  }));
  value.practices[0].questions.push({
    id: 'q', prompt: 'Compará las fuentes.', type: 'SINGLE', sourceRefs: [{ id: 'source', version: '1' }],
  });
  value.sources = [
    { id: 'source', version: '1', title: 'Apunte citado', available: true },
    { id: 'source', version: '2', title: 'Otra revisión', available: true },
    { id: 'unrelated', version: '1', title: 'Apunte ajeno al pedido', available: true },
  ];
  const calls = [];
  let reads = 0;
  const priorFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    reads++;
    throw new Error('unexpected second transport');
  };
  const view = hookView(StudyWorkspace, {
    detail: value,
    catalog: { classrooms: [] },
    run: async (...args) => {
      calls.push(args);
      return { folder: value.folder, result: { practice: value.practices[1] } };
    },
    onReload: async () => {
      reads++;
    },
  });
  try {
    await view.flush();
    const layout = descendants(view.tree, (node) => node.type?.name === 'FoxyChatLayout')[0];
    const row = descendants(layout.props.creations, (node) => node.key === 'old' &&
      node.props.className === 'creation-shelf-row')[0];
    descendants(row, (node) => node.type === 'button' && node.props.className === 'study-exact-creation-item')[0].props.onClick();
    await view.flush();
    descendants(
      view.tree,
      (node) => node.type === 'button' && node.props.children === 'Ver orientación',
    )[0].props.onClick();
    await view.flush();
    const reader = descendants(view.tree, (node) => node.type?.name === 'FoxyChatLayout')[0].props.children;
    assert.equal(reader.type.name, 'StudyPracticeView');
    assert.equal(reader.props.inline, true);
    assert.deepEqual(reader.props.sources.items.map(source => source.title), ['Apunte citado']);
    await reader.props.onNewAttempt();
    await view.flush();
    assert.deepEqual(calls, [['NEW_ATTEMPT', { practiceId: 'old' }, undefined]]);
    assert.equal(reads, 0);
    assert.equal(
      descendants(view.tree, (node) => node.type?.name === 'StudyPracticeView')[0].props.practice
        .id,
      'actual-result',
    );
  } finally {
    view.close();
    globalThis.fetch = priorFetch;
  }
});

test('folder operations ignore late errors and releases from a previous folder', async () => {
  const { createStudyFolderOperations } = loadTsModule(
    'apps/web/src/features/study/folders/study-folder-operations.ts',
  );
  const pending = deferred(),
    errors = [],
    changed = [],
    busy = [];
  const api = {
    command: async (id) => {
      if (id === 'A') return pending.promise;
      return { folder: detail('B').folder };
    },
    get: async (id) => detail(id),
  };
  const operations = createStudyFolderOperations(api, {
    onDetail: (value) => changed.push(value),
    onError: (value) => errors.push(value),
    onBusy: (value) => busy.push(value),
  });
  operations.replace(detail('A'));
  const work = operations.run('ARCHIVE');
  const rejected = assert.rejects(work, /late A/);
  operations.invalidate('B');
  operations.replace(detail('B'));
  const marker = errors.length;
  pending.reject(new Error('late A'));
  await rejected;
  assert.deepEqual(errors.slice(marker), []);
  assert.equal(
    changed.some((value) => value.folder.id === 'A'),
    false,
  );
  await operations.run('NEW_CONVERSATION');
  assert.equal(changed.at(-1).folder.id, 'B');
  assert.equal(busy.at(-1), false);
});

test('late A completion cannot release a pending B lock', async () => {
  const { createStudyFolderOperations } = loadTsModule(
    'apps/web/src/features/study/folders/study-folder-operations.ts',
  );
  const a = deferred(),
    b = deferred(),
    busy = [];
  const operations = createStudyFolderOperations(
    {
      command: async (id) => (id === 'A' ? a.promise : b.promise),
      get: async (id) => detail(id),
    },
    { onDetail() {}, onError() {}, onBusy: (value) => busy.push(value) },
  );
  operations.replace(detail('A'));
  const workA = operations.run('ARCHIVE');
  operations.invalidate('B');
  operations.replace(detail('B'));
  const workB = operations.run('ARCHIVE');
  a.resolve({ folder: detail('A').folder });
  await workA;
  assert.equal(busy.at(-1), true);
  await assert.rejects(operations.run('NEW_CONVERSATION'), { code: 'PENDING' });
  b.resolve({ folder: detail('B').folder });
  await workB;
  assert.equal(busy.at(-1), false);
});

test('a failed generation stays in the chat while other folder errors reach the page', async () => {
  const { createStudyFolderOperations } = loadTsModule('apps/web/src/features/study/folders/study-folder-operations.ts');
  const failure = new Error('Cupo agotado');
  const notices = [];
  const operations = createStudyFolderOperations({
    command: async () => { throw failure; },
    get: async () => detail('folder'),
  }, {
    onDetail() {}, onBusy() {},
    onError: (message, error) => { if (error) notices.push({ message, error }); },
  });
  operations.replace(detail('folder'));
  await assert.rejects(operations.run('GENERATE', { conversationId: 'chat' }), failure);
  await assert.rejects(operations.run('ARCHIVE'), failure);
  assert.deepEqual(notices, [{ message: '', error: failure }, { message: failure.message, error: failure }]);
});

test('conversation switches preserve a separate composer draft for each chat', async () => {
  const { useStudyConversations } = loadTsModule(
    'apps/web/src/features/study/conversations/use-study-conversations.ts',
  );
  const value = detail('folder');
  value.conversations = [
    { id: 'a', title: 'A' },
    { id: 'b', title: 'B' },
  ];
  const selected = [],
    view = hookView(() => useStudyConversations(value, 'a', (id) => selected.push(id)), {});
  try {
    await view.flush();
    view.tree.setText('draft A');
    await view.flush();
    view.tree.openChat('b');
    await view.flush();
    assert.equal(view.tree.text, '');
    view.tree.setText('draft B');
    await view.flush();
    view.tree.openChat('a');
    await view.flush();
    assert.equal(view.tree.text, 'draft A');
    view.tree.openChat('b');
    await view.flush();
    assert.equal(view.tree.text, 'draft B');
    assert.deepEqual(selected, ['b', 'a', 'b']);
  } finally {
    view.close();
  }
});

test('chat retries retain the command identity and entered draft after a transport failure', async () => {
  const { useStudyChat } = loadTsModule(
    'apps/web/src/features/study/conversations/use-study-chat.ts',
  );
  const calls = [],
    cleared = [];
  const run = async (...args) => {
    calls.push(args);
    if (calls.length === 1)
      throw Object.assign(new Error('offline'), { code: 'SERVICE_UNAVAILABLE' });
    return { folder: detail('folder').folder, result: { status: 'COMPLETE' } };
  };
  const view = hookView(
    () =>
      useStudyChat({
        run,
        currentId: 'chat',
        text: 'keep my draft',
        setText: (value) => cleared.push(value('keep my draft')),
        selected: [],
        busy: false,
        active: true,
        blocked: false,
        onConversation() {},
      }),
    {},
  );
  try {
    await view.flush();
    await view.tree.send();
    await view.flush();
    assert.deepEqual(cleared, []);
    await view.tree.send();
    await view.flush();
    assert.equal(calls[0][2], calls[1][2]);
    assert.equal(calls[0][1].message, 'keep my draft');
    assert.deepEqual(cleared, ['']);
  } finally {
    view.close();
  }
});

test('confirmed new attempt remains available when its refresh fails', async () => {
  const { createStudyRevisionController } = loadTsModule(
    'apps/web/src/features/study/model/study-revision-controller.ts',
  );
  const value = detail('A'),
    practice = { id: 'new-attempt', status: 'ACTIVE', questions: [], answers: {} };
  const changes = [];
  const controller = createStudyRevisionController(
    value,
    {
      command: async () => ({ folder: { ...value.folder, revision: '2' }, result: { practice } }),
      get: async () => {
        throw new Error('offline after confirmed attempt');
      },
    },
    (next) => changes.push(next),
  );
  await controller.run('NEW_ATTEMPT', { practiceId: 'old' });
  assert.deepEqual(changes.at(-1).practices, [practice]);
  assert.equal(changes.at(-1).folder.revision, '2');
});
