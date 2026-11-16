import test from 'node:test';
import assert from 'node:assert/strict';
import { validateUploadIntent, assertFileUsable, mayClaimAbandonedUpload } from '../apps/api/src/modules/files/domain/policy.ts';

const digest = 'a'.repeat(64);
const clean = { upload: 'COMPLETED', validation: 'APPROVED', scan: 'CLEAN',
  objectDigest: digest, validatedDigest: digest, scannedDigest: digest };
const abandoned = { upload: 'UPLOADING', lastActivityAt: 1000, completedAt: null,
  confirmedDraft: false, references: 0 };
const day = 86_400_000;
const rejected = (intent, code) => assert.throws(() => validateUploadIntent(intent), { code });

test('a teacher can prepare a plan at the decimal 20 MB boundary', () => {
  assert.deepEqual(validateUploadIntent({ purpose: 'plan', name: 'Plan de estudio.PDF', bytes: 20_000_000 }),
    { extension: 'pdf', maxBytes: 20_000_000 });
  rejected({ purpose: 'plan', name: 'plan.pdf', bytes: 20_000_001 }, 'FILE_TOO_LARGE');
});

for (const purpose of ['plan', 'instructions', 'material', 'attachment']) {
  test(`${purpose} accepts the five document formats at 20 MB and rejects larger files`, () => {
    for (const extension of ['pdf', 'doc', 'docx', 'ppt', 'pptx']) {
      const name = `tema.${extension}`;
      assert.deepEqual(validateUploadIntent({ purpose, name, bytes: 20_000_000 }), { extension, maxBytes: 20_000_000 });
      rejected({ purpose, name, bytes: 20_000_001 }, 'FILE_TOO_LARGE');
    }
  });
}

test('complementary formats are limited to materials and attachments and keep the 50 MB cap', () => {
  for (const extension of ['xlsx', 'jpg', 'jpeg', 'png', 'zip']) {
    const name = `tema.${extension}`;
    for (const purpose of ['material', 'attachment']) {
      assert.deepEqual(validateUploadIntent({ purpose, name, bytes: 50_000_000 }), { extension, maxBytes: 50_000_000 });
      rejected({ purpose, name, bytes: 50_000_001 }, 'FILE_TOO_LARGE');
    }
    for (const purpose of ['plan', 'instructions']) rejected({ purpose, name, bytes: 1 }, 'FILE_TYPE_NOT_ALLOWED');
  }
});

test('five 50 MB attachments pass individual policy without an extra aggregate cap', () => {
  const files = Array.from({ length: 5 }, (_, i) => ({ purpose: 'attachment', name: `${i}.zip`, bytes: 50_000_000 }));
  for (const file of files) assert.equal(validateUploadIntent(file).maxBytes, 50_000_000);
  // This proves per-file policy only; P7 owns submission count and quota is enforced transactionally.
  assert.equal(files.reduce((total, f) => total + f.bytes, 0), 250_000_000);
});

test('unsupported legacy formats, macro-enabled, audio/video and disguised extension names are rejected', () => {
  for (const name of ['a.xls', 'a.docm', 'a.pptm', 'a.xlsm', 'a.mp3', 'a.mp4', 'a.pdf.exe', 'a', '.pdf']) {
    rejected({ purpose: 'material', name, bytes: 10 }, 'FILE_TYPE_NOT_ALLOWED');
  }
});

test('untrusted filenames cannot contain paths, controls, alternate streams or trailing dots/spaces', () => {
  for (const name of ['../a.pdf', 'a/b.pdf', 'a\\b.pdf', 'a:stream.pdf', 'a\0.pdf', 'a\r\n.pdf', 'a.pdf ', 'a.pdf.', ' a.pdf']) {
    rejected({ purpose: 'material', name, bytes: 10 }, 'INVALID_UPLOAD');
  }
});

test('invalid context or nonintegral, empty, negative and nonfinite byte counts fail closed', () => {
  rejected({ purpose: 'avatar', name: 'a.png', bytes: 10 }, 'INVALID_UPLOAD');
  for (const bytes of [0, -1, 1.5, NaN, Infinity, '10', Number.MAX_SAFE_INTEGER + 1]) {
    rejected({ purpose: 'material', name: 'a.pdf', bytes }, 'INVALID_UPLOAD');
  }
});

test('a completed object is usable only after both gates approved those exact bytes', () => {
  assert.doesNotThrow(() => assertFileUsable(clean));
  for (const patch of [
    { upload: 'STARTED' }, { upload: 'UPLOADING' }, { upload: 'FAILED' }, { upload: 'CANCELLED' },
    { validation: 'PENDING' }, { validation: 'REJECTED' }, { scan: 'PENDING' }, { scan: 'RUNNING' },
    { scan: 'REJECTED' }, { scan: 'ERROR' }, { validatedDigest: null }, { scannedDigest: null },
    { scannedDigest: 'b'.repeat(64) }, { validatedDigest: 'b'.repeat(64) }, { objectDigest: '' },
  ]) assert.throws(() => assertFileUsable({ ...clean, ...patch }), { code: 'FILE_NOT_READY' });
});

test('completed scan of an older object never approves replacement bytes', () => {
  assert.throws(() => assertFileUsable({ ...clean, objectDigest: 'c'.repeat(64) }), { code: 'FILE_NOT_READY' });
  assert.throws(() => assertFileUsable({ ...clean, objectDigest: 'x', scannedDigest: 'x', validatedDigest: 'x' }), { code: 'FILE_NOT_READY' });
});

test('cleanup eligibility begins exactly 24 hours after last activity', () => {
  assert.equal(mayClaimAbandonedUpload(abandoned, 1000 + day - 1), false);
  assert.equal(mayClaimAbandonedUpload(abandoned, 1000 + day), true);
  assert.equal(mayClaimAbandonedUpload({ ...abandoned, lastActivityAt: 2000 }, 1000 + day), false);
});

test('confirmed drafts, completed files and linked history never expire through incomplete cleanup', () => {
  for (const patch of [{ completedAt: 1500 }, { confirmedDraft: true }, { references: 1 }, { upload: 'COMPLETED' }]) {
    assert.equal(mayClaimAbandonedUpload({ ...abandoned, ...patch }, 1000 + 2 * day), false);
  }
});

test('invalid cleanup observations never become a deletion claim', () => {
  for (const patch of [{ lastActivityAt: NaN }, { lastActivityAt: Infinity }, { references: -1 }, { references: NaN }, { upload: 'UNKNOWN' }]) {
    assert.equal(mayClaimAbandonedUpload({ ...abandoned, ...patch }, 1000 + 2 * day), false);
  }
  assert.equal(mayClaimAbandonedUpload(abandoned, NaN), false);
  assert.equal(mayClaimAbandonedUpload(abandoned, 0), false);
});
