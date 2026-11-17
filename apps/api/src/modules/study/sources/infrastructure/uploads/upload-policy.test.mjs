import { test } from 'node:test';
import assert from 'node:assert/strict';
import { studyUploadIntent, studyFileReady } from "../../domain/upload-policy.ts";

test('documentos privados en formatos aprobados y límites sin truncamiento', () => {
  for (const extension of ['pdf','doc','docx','ppt','pptx']) {
    for (const purpose of ['plan','material']) {
      assert.equal(studyUploadIntent({name:`Biología.${extension.toUpperCase()}`,bytes:20_000_000,purpose}).extension,extension);
      assert.throws(()=>studyUploadIntent({name:`Biología.${extension}`,bytes:20_000_001,purpose}),{code:'INVALID_UPLOAD'});
    }
  }
  assert.equal(studyUploadIntent({name:'recursos.zip',bytes:50_000_000,purpose:'material'}).extension,'zip');
  for (const input of [
    {name:'x.pdf', bytes:20_000_001, purpose:'plan'},
    {name:'x.png', bytes:100, purpose:'plan'},
    {name:'../x.pdf', bytes:100, purpose:'plan'},
    {name:'x.exe', bytes:100, purpose:'material'},
    {name:'x.pdf', bytes:0, purpose:'material'},
  ]) assert.throws(() => studyUploadIntent(input), {code:'INVALID_UPLOAD'});
});

test('material exige transferencia, validación y escaneo de los mismos bytes', () => {
  const row={phase:'READY',size_bytes:12n,digest:'a'.repeat(64),validated_digest:'a'.repeat(64),scanned_digest:'a'.repeat(64)};
  assert.equal(studyFileReady(row),true);
  assert.equal(studyFileReady({...row,phase:'PROCESSING'}),false);
  assert.equal(studyFileReady({...row,scanned_digest:'b'.repeat(64)}),false);
  assert.equal(studyFileReady({...row,validated_digest:null}),false);
});
