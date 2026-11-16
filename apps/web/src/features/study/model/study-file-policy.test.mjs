import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStudyUpload,studyUploadPolicy,requireStudyPlan} from "./study-file-policy.ts";
test('plans accept PDF, Word and PowerPoint with an exact decimal 20 MB ceiling',()=>{
  for(const extension of ['pdf','doc','docx','ppt','pptx']){
    assert.equal(validateStudyUpload('plan',{name:`plan.${extension.toUpperCase()}`,size:20_000_000}),null);
    assert.match(validateStudyUpload('plan',{name:`plan.${extension}`,size:20_000_001}),/20 MB/);
  }
  assert.match(validateStudyUpload('plan',{name:'plan.zip',size:1}),/PDF, Word o PowerPoint/);
  assert.match(validateStudyUpload('plan',{name:'plan.pdf',size:0}),/vacío/);
});
test('materials keep 50 MB for other supported formats and accept documents up to 20 MB',()=>{
for(const extension of ['pdf','doc','docx','ppt','pptx']){
  assert.equal(validateStudyUpload('material',{name:`material.${extension}`,size:20_000_000}),null);
  assert.match(validateStudyUpload('material',{name:`material.${extension}`,size:20_000_001}),/20 MB/);
}
for(const ext of ['xlsx','jpg','jpeg','png','zip'])assert.equal(validateStudyUpload('material',{name:'material.'+ext,size:50_000_000}),null);assert.match(validateStudyUpload('material',{name:'material.zip',size:50000001}),/50 MB/);assert.match(validateStudyUpload('material',{name:'material.exe',size:1}),/formato/);assert.ok(studyUploadPolicy('material').accept.includes('.zip'));});
test('active folder requires a ready plan identity while drafts can stay incomplete',()=>{assert.match(requireStudyPlan(null),/cargá/);assert.equal(requireStudyPlan('ready-plan-id'),null);});
