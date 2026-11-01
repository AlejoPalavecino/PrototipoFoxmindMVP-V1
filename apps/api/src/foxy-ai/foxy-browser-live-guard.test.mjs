import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
const script=resolve('scripts/foxy-browser-live.mjs');
const cleanEnv=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('AI_')&&k!=='FOXY_PRIVATE_ASSET_QUOTA_BYTES'));
function run(args,env=cleanEnv){return spawnSync(process.execPath,['--experimental-transform-types',script,...args],{env,encoding:'utf8',timeout:20000});}
test('missing or conflicting mode refuses before fixture setup',()=>{for(const args of [[],['--synthetic','--live-authorized',`--attempt-id=${randomUUID()}`]]){const r=run(args);assert.equal(r.status,1);assert.match(r.stderr,/FOXY_BROWSER_FIXTURE_FAILED/);}});
test('inherited AI variables refuse before receipt or setup',async()=>{const id=randomUUID(),path=resolve('.test-artifacts',`foxy-browser-${id}.receipt`);const r=run(['--synthetic',`--attempt-id=${id}`],{...cleanEnv,AI_ENABLED:'true'});assert.equal(r.status,1);await assert.rejects(readFile(path),{code:'ENOENT'});});
test('existing receipt cannot be reused or overwritten',async()=>{const id=randomUUID(),path=resolve('.test-artifacts',`foxy-browser-${id}.receipt`);await mkdir(resolve('.test-artifacts'),{recursive:true});await writeFile(path,'existing',{flag:'wx'});try {const r=run(['--synthetic',`--attempt-id=${id}`]);assert.equal(r.status,1);assert.equal(await readFile(path,'utf8'),'existing');}finally{await unlink(path);}});
