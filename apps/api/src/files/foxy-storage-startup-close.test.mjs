import test,{mock} from 'node:test';
import assert from 'node:assert/strict';

test('application startup failure waits for shared storage close', {timeout:15000},async()=>{
 const filesUrl=new URL('../../../../.build/api/apps/api/src/files/index.js',import.meta.url),files=await import(filesUrl.href);
 let release,entered;const gate=new Promise(r=>release=r),closing=new Promise(r=>entered=r);
 const replacement={storage:{},scanner:{},close:async()=>{entered();await gate;}};
 const moduleMock=mock.module(filesUrl.href,{namedExports:{...files,createFileInfrastructure:()=>replacement}});
 try{
  const {createApplication}=await import('../../../../.build/api/apps/api/src/application.js?synthetic-startup-close');
  let settled=false;const attempt=createApplication({databaseUrl:'synthetic',identity:{},files:{infrastructure:{}}}).then(()=>{settled=true;return null},error=>{settled=true;return error});
  await closing;await Promise.resolve();assert.equal(settled,false,'startup failure must wait until infrastructure closes');
  release();assert.ok(await attempt);
 }finally{release();moduleMock.restore();}
});
