import { test } from 'node:test';
import assert from 'node:assert/strict';
import { studyUploadIntent, studyFileReady } from "../folders/uploads/upload-policy.ts";

test('planes privados sólo PDF/DOCX y límites sin truncamiento', () => {
  assert.equal(studyUploadIntent({ name: 'Biología.PDF', bytes: 20_000_000, purpose: 'plan' }).extension, 'pdf');
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
