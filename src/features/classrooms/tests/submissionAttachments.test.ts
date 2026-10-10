import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_SUBMISSION_FILE_BYTES, selectSubmissionAttachments, removeSubmissionAttachment,
} from '../application/submissionAttachments';
import { deliverSubmission } from '../application/deliverSubmission';
import { createSubmissionFixtures } from '../data/submissionFixtures';

const fileWithSize = (name: string, size: number) => {
  const file = new File(['contenido'], name);
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

test('selection appends every allowed extension case-insensitively and preserves contents/order', async () => {
  const files = ['PDF', 'dOc', 'DOCX', 'txt', 'ePuB'].map(ext => new File([ext], `Trabajo.${ext}`));
  const first = selectSubmissionAttachments([], files.slice(0, 2));
  const result = selectSubmissionAttachments(first.attachments, files.slice(2));
  assert.equal(first.attachments.length, 2, 'Previous draft is not mutated');
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.attachments.map(item => item.file), files);
  assert.deepEqual(result.attachments.map(item => item.type), ['PDF', 'DOC', 'DOCX', 'TXT', 'EPUB']);
  assert.deepEqual(await Promise.all(result.attachments.map(item => item.file.text())), ['PDF', 'dOc', 'DOCX', 'txt', 'ePuB']);
});

test('mixed dropped/selected batches keep valid files with explicit type and size feedback', () => {
  assert.equal(MAX_SUBMISSION_FILE_BYTES, 25 * 1024 * 1024);
  const exact = fileWithSize('Exacto.PDF', MAX_SUBMISSION_FILE_BYTES);
  const tooLarge = fileWithSize('Grande.pdf', MAX_SUBMISSION_FILE_BYTES + 1);
  const valid = new File(['sí'], 'Ultimo.epub');
  const result = selectSubmissionAttachments([], [exact, new File(['no'], 'Mal.exe'), tooLarge, valid, new File([], 'SinExtension')]);
  assert.deepEqual(result.attachments.map(item => item.file), [exact, valid]);
  assert.equal(result.attachments[0].size, '25.0 MB');
  assert.equal(result.errors.length, 3);
  assert.match(result.errors[0], /Mal.exe.*Formato no permitido.*PDF.*DOC.*DOCX.*TXT.*EPUB/);
  assert.match(result.errors[1], /Grande.pdf.*25 MB/);
  assert.match(result.errors[2], /SinExtension.*Formato no permitido/);
  assert.throws(() => deliverSubmission(createSubmissionFixtures(), 2, {
    attachments: [{ name: 'Otra.pdf', size: '0 MB', type: 'PDF', file: tooLarge }],
  }), /25 MB/, 'Delivery rechecks bytes, not displayed metadata');
});

test('removing one of repeated filenames preserves every other File and supports re-selection', () => {
  const files = [new File(['uno'], 'Igual.txt'), new File(['dos'], 'Igual.txt'), new File(['tres'], 'Otro.pdf')];
  const initial = selectSubmissionAttachments([], files).attachments;
  const removed = removeSubmissionAttachment(initial, 1);
  assert.deepEqual(removed.map(item => item.file), [files[0], files[2]]);
  assert.equal(initial.length, 3);
  assert.deepEqual(selectSubmissionAttachments(removed, [files[1]]).attachments.map(item => item.file), [files[0], files[2], files[1]]);
});
