import assert from 'node:assert/strict';
import test from 'node:test';
import { parseChatAttachmentIntent } from './policy.ts';

test('an attachment accepts PDF and DOCX and defaults to chat-only', () => {
  assert.deepEqual(parseChatAttachmentIntent('Guía de estudio.PDF', undefined, false), {
    name: 'Guía de estudio.PDF', extension: 'pdf', copy: false,
  });
  assert.equal(parseChatAttachmentIntent('Guía.docx', '1', true).copy, true);
});

test('invalid format, path, control characters and unauthorized copy are rejected', () => {
  for (const name of ['guía.zip', '../guía.pdf', 'a\\b.pdf', 'a\r.pdf', 'a'.repeat(121)+'.pdf']) {
    assert.throws(() => parseChatAttachmentIntent(name, undefined, true), { code: 'INVALID_INPUT' });
  }
  assert.throws(() => parseChatAttachmentIntent('Guía.pdf', '1', false), { code: 'INVALID_INPUT' });
  assert.throws(() => parseChatAttachmentIntent('Guía.pdf', 'yes', true), { code: 'INVALID_INPUT' });
});
