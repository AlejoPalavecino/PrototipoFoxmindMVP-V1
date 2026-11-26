import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFolder, studyId, studyRevision } from "../../../../../../../../src/core/domain/study/folders.ts";
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
// 2026-11-25: the approved study wizard lets students build their path by hand without a program file
// (decision recorded in docs/work-log/2026-11-25-expedition-studio-foxy.md). The curriculum itself stays required.
test('active folder can be built by hand without a plan file, but never without topics',()=>{
 const fields={name:'Biología',academicYear:2026,bannerKey:'biology',units:[{id:crypto.randomUUID(),title:'Unidad',topics:[{id:crypto.randomUUID(),title:'Tema'}]}]};
 assert.equal(validateFolder(fields,true).planFileId,null);
 assert.equal(validateFolder(fields,false).planFileId,null);
 assert.throws(()=>validateFolder({...fields,units:[]},true),{code:'INVALID_INPUT'});
 assert.throws(()=>validateFolder({...fields,units:[{...fields.units[0],topics:[]}]},true),{code:'INVALID_INPUT'});
});

