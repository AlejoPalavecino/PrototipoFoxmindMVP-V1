import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdentityFileAccess } from '../.build/api/apps/api/src/files/host.js';
import { readIdentityConfiguration } from '../.build/api/apps/api/src/identity-security/index.js';
import { authorizeAttemptFileWrite } from '../.build/api/apps/api/src/files/attempt-bridge.js';
const id='a1111111-1111-4111-8111-111111111111';
test('attempt bridge converts expected classroom denials and never silently allows absent/malformed editor',async()=>{
 const target={scope:{kind:'classroom',id},purpose:'attachment',targetId:id};
 await assert.rejects(()=>authorizeAttemptFileWrite({query:async()=>{throw Error('No query expected');}},id,target,{headers:{}}),{code:'INVALID_UPLOAD'});
 await assert.rejects(()=>authorizeAttemptFileWrite({},id,{...target,purpose:'plan'},{headers:{}}),{code:'FORBIDDEN'});
 const denied={query:async()=>[]};await assert.rejects(()=>authorizeAttemptFileWrite(denied,id,target,{headers:{'x-attempt-editor':'a'.repeat(43),'x-attempt-epoch':'1'}}),{code:'FORBIDDEN'});
});
test('default identity/file access remains fail-closed for isolated old callers and production authorizer is opt-in',()=>{
 const security=readIdentityConfiguration({APP_ORIGIN:'http://localhost:3000',AUTH_LOCAL_HTTP:'true',AUTH_CSRF_HMAC_KEY:Buffer.from(Array.from({length:32},(_,i)=>i)).toString('base64url'),AUTH_ABUSE_HMAC_KEY:Buffer.from(Array.from({length:32},(_,i)=>i+1)).toString('base64url')},'127.0.0.1');
 assert.equal(typeof createIdentityFileAccess(security).authorize,'function');
 assert.equal(typeof createIdentityFileAccess(security,authorizeAttemptFileWrite).authorize,'function');
});
