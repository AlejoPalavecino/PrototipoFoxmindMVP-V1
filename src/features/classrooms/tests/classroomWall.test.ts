import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createWallFixtures } from '../data/wallFixtures';
import { classroomWallRepository } from '../data/inMemoryWallRepository';
import { publishWallPost, toggleWallLike, addWallComment } from '../application/classroomWall';
import type { WallPublication } from '../model/ClassroomWall';
import * as legacy from '../../../mockData';

const draft: WallPublication = { role: 'docente', title: '  Aviso  ', content: '  Texto\n nuevo  ', isPinned: true, attachment: { name: 'Guía.pdf', size: '2 MB', type: 'PDF' } };

test('publication preserves role identity, trims text and prepends without sorting or copying records', () => {
  const posts = createWallFixtures();
  for (const role of ['docente', 'alumno'] as const) {
    const next = publishWallPost(posts, { ...draft, role }, () => 123)!;
    assert.deepEqual(next[0], {
      id: 'post-123', authorName: role === 'docente' ? 'Profa. Martínez' : 'Valentina Gómez',
      authorRole: role, timestamp: 'Justo ahora', title: 'Aviso', content: 'Texto\n nuevo',
      isPinned: role === 'docente', type: role === 'docente' ? 'announcement' : 'doubt',
      attachment: draft.attachment, likesCount: 0, isLiked: false, comments: [],
    });
    assert.strictEqual(next[0].attachment, draft.attachment);
    assert.strictEqual(next[1], posts[0]);
    assert.deepEqual(next.map(post => post.id), ['post-123', 'post-1', 'post-2', 'post-3']);
    assert.equal(posts.length, 3);
  }
});

test('publication rejects blank content before sampling the clock; optional title and attachment remain undefined', () => {
  const posts = createWallFixtures();
  const forbiddenClock = () => { throw new Error('clock must not run'); };
  assert.equal(publishWallPost(posts, { ...draft, content: ' \n\t ' }, forbiddenClock), null);
  const next = publishWallPost(posts, { ...draft, title: '  ', attachment: null, isPinned: false }, () => 1)!;
  assert.equal(next[0].title, undefined);
  assert.equal(next[0].attachment, undefined);
  assert.equal(next[0].isPinned, false);
});

test('likes toggle in both directions, floor at zero, and retain untouched/nested references', () => {
  const posts = createWallFixtures();
  const liked = toggleWallLike(posts, 'post-1');
  assert.equal(liked[0].likesCount, 15);
  assert.equal(liked[0].isLiked, true);
  assert.notStrictEqual(liked[0], posts[0]);
  assert.strictEqual(liked[0].comments, posts[0].comments);
  assert.strictEqual(liked[0].attachment, posts[0].attachment);
  assert.strictEqual(liked[1], posts[1]);
  assert.deepEqual(toggleWallLike(liked, 'post-1'), posts);
  assert.equal(toggleWallLike(posts, 'post-2')[1].likesCount, 8);
  const zero = [{ ...posts[0], isLiked: true, likesCount: 0 }];
  assert.equal(toggleWallLike(zero, 'post-1')[0].likesCount, 0);
  const absent = toggleWallLike(posts, 'missing');
  assert.notStrictEqual(absent, posts);
  assert.ok(absent.every((post, index) => post === posts[index]));
});

test('comments append with role names, trimmed content and fresh ids while preserving existing comments and post order', () => {
  const posts = createWallFixtures();
  for (const role of ['docente', 'alumno'] as const) {
    const next = addWallComment(posts, 'post-1', role, '  Respuesta\n útil  ', () => 456)!;
    assert.deepEqual(next[0].comments[2], {
      id: 'c-456', authorName: role === 'docente' ? 'Profa. Martínez' : 'Valentina Gómez',
      authorRole: role, timestamp: 'Justo ahora', content: 'Respuesta\n útil',
    });
    assert.strictEqual(next[0].comments[0], posts[0].comments[0]);
    assert.notStrictEqual(next[0].comments, posts[0].comments);
    assert.strictEqual(next[1], posts[1]);
    assert.strictEqual(next[0].attachment, posts[0].attachment);
    assert.equal(posts[0].comments.length, 2);
    assert.deepEqual(next.map(post => post.id), posts.map(post => post.id));
  }
});

test('blank comments reject before clock; unknown post still maps a new array and samples clock as before', () => {
  const posts = createWallFixtures();
  const forbiddenClock = () => { throw new Error('clock must not run'); };
  for (const text of [undefined, '', ' \n\t ']) {
    assert.equal(addWallComment(posts, 'post-1', 'alumno', text, forbiddenClock), null);
  }
  let calls = 0;
  const next = addWallComment(posts, 'missing', 'docente', 'Respuesta', () => ++calls)!;
  assert.equal(calls, 1);
  assert.notStrictEqual(next, posts);
  assert.ok(next.every((post, index) => post === posts[index]));
});

test('like and comment map every matching id rather than only the first', () => {
  const [first] = createWallFixtures();
  const posts = [first, { ...first }];
  assert.deepEqual(toggleWallLike(posts, first.id).map(post => post.likesCount), [15, 15]);
  const next = addWallComment(posts, first.id, 'alumno', 'Comentario', () => 10)!;
  assert.strictEqual(next[0].comments[2], next[1].comments[2]);
});

test('valid publish/comment default to Date.now ids with existing relative timestamp semantics', () => {
  const original = Date.now;
  Date.now = () => 987;
  try {
    const posts = createWallFixtures();
    assert.equal(publishWallPost(posts, draft)![0].id, 'post-987');
    assert.equal(addWallComment(posts, 'post-1', 'docente', 'Hola')![0].comments[2].id, 'c-987');
  } finally {
    Date.now = original;
  }
});

test('operations are pure; explicit replacement shares exact arrays with legacy reads/writes but not mounted snapshots', () => {
  const mounted = classroomWallRepository.read();
  const next = publishWallPost(mounted, draft, () => 99)!;
  assert.strictEqual(classroomWallRepository.read(), mounted);
  toggleWallLike(mounted, 'post-1');
  addWallComment(mounted, 'post-1', 'alumno', 'Hola', () => 1);
  assert.strictEqual(classroomWallRepository.read(), mounted);
  try {
    assert.equal(classroomWallRepository.replace(next), undefined);
    assert.strictEqual(classroomWallRepository.read(), next);
    assert.strictEqual(legacy.sharedMuroPosts, next);
    assert.equal(mounted.length, 3);
    const staleWrite = toggleWallLike(mounted, 'post-1');
    legacy.updateSharedMuroPosts(staleWrite);
    assert.strictEqual(classroomWallRepository.read(), staleWrite);
    assert.equal(classroomWallRepository.read().length, 3); // no hidden merge with next
  } finally {
    classroomWallRepository.replace(mounted);
  }
});

test('mounted wall wiring retains local snapshot, explicit writes, draft resets and no subscription', () => {
  const source = readFileSync(new URL('../../../components/aulas/ClassroomMuroTab.tsx', import.meta.url), 'utf8');
  assert.match(source, /useState<MuroPost\[\]>\(\(\) => classroomWallRepository\.read\(\)\)/);
  assert.equal(source.match(/classroomWallRepository\.replace\(updated\)/g)?.length, 3);
  assert.equal(source.match(/if \(!updated\) return;/g)?.length, 2);
  assert.match(source, /setPosts\(updated\);\s*classroomWallRepository\.replace\(updated\);\s*setNewTitle\(''\);\s*setNewContent\(''\);\s*setIsPinned\(false\);\s*setAttachedFile\(null\);/);
  assert.match(source, /setCommentText\(prev => \(\{ \.\.\.prev, \[postId\]: '' \}\)\)/);
  assert.doesNotMatch(source, /subscribe|useEffect|mockData|\.sort\(/);
});
