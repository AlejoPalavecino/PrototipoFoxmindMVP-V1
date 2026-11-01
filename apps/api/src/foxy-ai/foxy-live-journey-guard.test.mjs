import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync, unlinkSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
const target='scripts/foxy-provider-journey.mjs';
test('live journey refuses execution without explicit authorization',()=>{
 assert.ok(existsSync(target),'isolated live journey runner is required');
 const result=spawnSync(process.execPath,['--experimental-transform-types',target],{encoding:'utf8',timeout:10000});
 assert.notEqual(result.status,0); assert.match(result.stderr,/authoriz/i);
});
test('existing attempt receipt cannot be reused or overwritten',()=>{
 const id=randomUUID(), path=`.test-artifacts/foxy-live-${id}.jsonl`, original='test receipt\n';
 mkdirSync('.test-artifacts',{recursive:true}); writeFileSync(path,original,{flag:'wx'});
 try {
  const result=spawnSync(process.execPath,['--experimental-transform-types',target,'--live-authorized',`--attempt-id=${id}`],{encoding:'utf8',timeout:10000});
  assert.notEqual(result.status,0);
  assert.equal((awaitRead(path)),original);
 } finally {unlinkSync(path);}
});
import {readFileSync} from 'node:fs';
function awaitRead(path){ return readFileSync(path,'utf8'); }
