import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudyChatPreviewDecoder } from '../apps/api/src/modules/study/generation/infrastructure/providers/study-chat-preview.ts';
import { createStudyChatPreviews } from '../apps/api/src/modules/study/generation/infrastructure/study-chat-previews.ts';

test('the study chat decoder publishes only the markdown of a complete answer, progressively', () => {
  const seen = [];
  const decode = createStudyChatPreviewDecoder(value => seen.push(value));
  decode('{"status":"COMPLETE","title":"Exposici');
  assert.deepEqual(seen, []);
  decode('{"status":"COMPLETE","title":"Exposición","markdown":"La **exposición** es');
  decode('{"status":"COMPLETE","title":"Exposición","markdown":"La **exposición** es la luz\\nacumulada');
  assert.deepEqual(seen, ['La **exposición** es', 'La **exposición** es la luz\nacumulada']);
  decode(undefined);
  assert.equal(seen.at(-1), undefined);
});

test('an insufficient answer never publishes text', () => {
  const seen = [];
  const decode = createStudyChatPreviewDecoder(value => seen.push(value));
  decode('{"status":"INSUFFICIENT","title":"Faltan fuentes","markdown":"algo"');
  assert.deepEqual(seen, []);
});

test('previews are private to the owner and folder, and vanish when the request closes', () => {
  const previews = createStudyChatPreviews();
  const session = previews.open('owner', 'folder', 'request');
  session.publish('Hola');
  assert.equal(previews.read('owner', 'folder', 'request'), 'Hola');
  assert.equal(previews.read('other', 'folder', 'request'), undefined);
  assert.equal(previews.read('owner', 'other', 'request'), undefined);
  session.publish(undefined);
  assert.equal(previews.read('owner', 'folder', 'request'), undefined);
  session.publish('Hola de nuevo');
  session.close();
  assert.equal(previews.read('owner', 'folder', 'request'), undefined);
  session.publish('tarde');
  assert.equal(previews.read('owner', 'folder', 'request'), undefined);
});
