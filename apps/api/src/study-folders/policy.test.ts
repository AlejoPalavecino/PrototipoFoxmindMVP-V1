import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFolder, studyId, studyRevision } from '../../../../src/core/domain/study-folders.ts';
test('folder validation preserves drafts and requires curriculum at activation', () => {
    assert.equal(validateFolder({}, false).name, '');
    assert.throws(() => validateFolder({ name: 'Biología', academicYear: 2026, bannerKey: 'biology', units: [] }, true), { code: 'INVALID_INPUT' });
    assert.equal(validateFolder({ planFileId:crypto.randomUUID(),name: 'Biología', academicYear: 2026, bannerKey: 'biology', units: [{ id: crypto.randomUUID(), title: 'Vida', topics: [{ id: crypto.randomUUID(), title: 'Células' }] }] }, true).name, 'Biología');
});
test('rejects unknown fields, identity injection and malformed identifiers', () => {
    assert.throws(() => validateFolder({ ownerId: crypto.randomUUID() }, false), { code: 'INVALID_INPUT' });
    assert.throws(() => studyId('not-an-id'), { code: 'INVALID_INPUT' });
    assert.throws(() => studyRevision('0'), { code: 'INVALID_INPUT' });
});
test('active folder requires an uploaded study plan while draft remains resumable',()=>{
 const fields={name:'Biología',academicYear:2026,bannerKey:'biology',units:[{id:crypto.randomUUID(),title:'Unidad',topics:[{id:crypto.randomUUID(),title:'Tema'}]}]};
 assert.throws(()=>validateFolder(fields,true),{code:'INVALID_INPUT'});
 assert.equal(validateFolder(fields,false).planFileId,null);
});

