import test from 'node:test';
import assert from 'node:assert/strict';
import {parseEnv} from 'node:util';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {updateEnvironment,requireLocalOwner,stopLocalContainers,verifyLocalWebDependency} from '../scripts/local-app-environment.mjs';

const localOwner={project:'foxmind-local-0123456789abcdef',ports:{database:54321,storage:54322,scanner:54323,smtp:54324,inbox:54325}};

test('local startup diagnoses a missing or stale Next installation against this checkout lockfile', async t => {
  const root = await mkdtemp(join(tmpdir(), 'foxmind-local-next-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  await writeFile(join(root, 'package-lock.json'), JSON.stringify({packages: {'node_modules/next': {version: '1.2.3'}}}));
  const next = join(root, 'node_modules', 'next');
  await assert.rejects(verifyLocalWebDependency(root), /missing.*1\.2\.3.*npm ci/i);
  await mkdir(next, {recursive: true});
  await writeFile(join(next, 'package.json'), JSON.stringify({version: '1.2.2'}));
  await assert.rejects(verifyLocalWebDependency(root), /1\.2\.2.*1\.2\.3.*npm ci/);
  await writeFile(join(next, 'package.json'), JSON.stringify({version: '1.2.3'}));
  await verifyLocalWebDependency(root);
});

test('local stop validates every running container before stopping only owned IDs',async()=>{
  const calls=[];
  const command=async(executable,args)=>{
    assert.equal(executable,'docker');calls.push(args);
    if(args[0]==='ps')return 'aaa\nbbb';
    if(args[0]==='inspect')return localOwner.project;
    return '';
  };
  await stopLocalContainers(localOwner,command);
  assert.deepEqual(calls,[
    ['ps','-q','--filter','label=com.docker.compose.project='+localOwner.project],
    ['inspect','--format','{{index .Config.Labels "foxmind.local.owner"}}','aaa'],
    ['inspect','--format','{{index .Config.Labels "foxmind.local.owner"}}','bbb'],
    ['stop','aaa','bbb']
  ]);
});

test('local stop rejects a foreign owner before stopping any container',async()=>{
  const calls=[];
  await assert.rejects(stopLocalContainers(localOwner,async(_,args)=>{
    calls.push(args);
    if(args[0]==='ps')return 'aaa\nbbb';
    return args.at(-1)==='aaa'?localOwner.project:'foreign';
  }),/Foreign Docker resource/);
  assert.equal(calls.some(args=>args[0]==='stop'),false);
  await assert.rejects(stopLocalContainers({...localOwner,project:'foreign'},async()=>assert.fail('Docker must not be called')),/Invalid local owner/);
});

test('local stop needs no Docker when owner is absent and is idempotent with no running containers',async()=>{
  await stopLocalContainers(null,async()=>assert.fail('Docker must not be called'));
  let calls=0;
  await stopLocalContainers(localOwner,async(_,args)=>{calls++;assert.equal(args[0],'ps');return '';});
  assert.equal(calls,1);
});

test('local stop propagates Docker failures instead of reporting success',async()=>{
  for(const failAt of ['ps','inspect','stop']){
    await assert.rejects(stopLocalContainers(localOwner,async(_,args)=>{
      if(args[0]===failAt)throw Error('Docker unavailable');
      return args[0]==='ps'?'aaa':localOwner.project;
    }),/Docker unavailable/);
  }
});
test('local configuration preserves the existing key and safely quotes generated secrets',()=>{
  const original='# existing\r\nAI_API_KEY="synthetic $key # retained"\r\nAPP_ORIGIN=old\r\n';
  const updated=updateEnvironment(original,{APP_ORIGIN:'http://127.0.0.1:3000',AUTH_OUTBOX_KEYS_JSON:JSON.stringify({local:'synthetic+/='})});
  assert.equal(parseEnv(updated).AI_API_KEY,parseEnv(original).AI_API_KEY);
  assert.deepEqual(JSON.parse(parseEnv(updated).AUTH_OUTBOX_KEYS_JSON),{local:'synthetic+/='});
  assert.equal(parseEnv(updated).APP_ORIGIN,'http://127.0.0.1:3000');assert.ok(updated.startsWith('# existing\r\nAI_API_KEY='));
});
test('ambiguous environment updates and foreign resource owners are rejected',()=>{
  assert.throws(()=>updateEnvironment('APP_ORIGIN=a\nAPP_ORIGIN=b\n',{APP_ORIGIN:'c'}));
  assert.throws(()=>updateEnvironment('AI_API_KEY=synthetic\n',{AI_API_KEY:'replacement'}));
  assert.throws(()=>updateEnvironment('',{APP_ORIGIN:'a\nb'}));
  const owner={project:'foxmind-local-0123456789abcdef',ports:{database:54321,storage:54322,scanner:54323,smtp:54324,inbox:54325}};
  assert.equal(requireLocalOwner(owner),owner);assert.throws(()=>requireLocalOwner({...owner,project:'foxmind-p4-files'}));
  assert.throws(()=>requireLocalOwner({...owner,ports:{...owner.ports,database:0}}));
});
