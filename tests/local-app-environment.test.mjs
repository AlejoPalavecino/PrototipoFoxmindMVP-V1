import test from 'node:test';
import assert from 'node:assert/strict';
import {parseEnv} from 'node:util';
import {updateEnvironment,requireLocalOwner} from '../scripts/local-app-environment.mjs';
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
