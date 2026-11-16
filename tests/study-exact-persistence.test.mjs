import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFolder } from '../src/core/domain/study/folders.ts';
import { projectFolder, projectFolderSummary } from '../apps/api/src/modules/study/application/contracts.ts';

test('draft metadata accepts trimmed subject, all four steps, and safe legacy defaults', () => {
  for (let wizardStep = 0; wizardStep < 4; wizardStep++) {
    const fields = validateFolder({ subject: '  Fotografía  ', wizardStep }, false);
    assert.equal(fields.subject, 'Fotografía');
    assert.equal(fields.wizardStep, wizardStep);
  }
  assert.equal(validateFolder({ subject: '🦊'.repeat(100) }, false).subject, '🦊'.repeat(100));
  assert.equal(validateFolder({}, false).subject, '');
  assert.equal(validateFolder({}, false).wizardStep, 0);
});

test('metadata rejects null, wrong types and out-of-range values without truncation', () => {
  for (const subject of [null, 4, [], {}, 'a'.repeat(101), '🦊'.repeat(101)]) {
    assert.throws(() => validateFolder({ subject }, false), { code: 'INVALID_INPUT' });
  }
  for (const wizardStep of [null, -1, 4, 1.5, '2', false, [], {}, NaN, Infinity]) {
    assert.throws(() => validateFolder({ wizardStep }, false), { code: 'INVALID_INPUT' });
  }
  assert.throws(() => validateFolder({ subject: '', unexpected: true }, false), { code: 'INVALID_INPUT' });
});

test('legacy list/detail default metadata without changing persisted rows or exposing non-draft steps', () => {
  const fields = { name: 'Anterior', academicYear: 2026, bannerKey: 'general', units: [], linkedClassroomId: null, planFileId: null };
  const row = { id: crypto.randomUUID(), owner_id: crypto.randomUUID(), status: 'DRAFT', revision: 1n,
    created_at: new Date(), updated_at: new Date(), state: { fields, materials: [] } };
  const before = structuredClone(row);
  const { units, ...summaryFields } = fields;
  for (const folder of [projectFolder(row), projectFolderSummary({ ...row, fields: summaryFields })]) {
    assert.equal(folder.subject, '');
    assert.equal(folder.wizardStep, 0);
  }
  assert.deepEqual(row, before);
  for (const status of ['ACTIVE', 'ARCHIVED']) {
    const existing = { ...row, status, state: { ...row.state, fields: { ...fields, subject: 'Biología', wizardStep: 3 } } };
    const detail = projectFolder(existing), summary = projectFolderSummary({ ...existing, fields: existing.state.fields });
    for (const folder of [detail, summary]) {
      assert.equal(folder.subject, 'Biología');
      assert.equal(Object.hasOwn(folder, 'wizardStep'), false);
    }
  }
});
