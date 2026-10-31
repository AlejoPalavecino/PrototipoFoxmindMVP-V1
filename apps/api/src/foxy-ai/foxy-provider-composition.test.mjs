import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { withAgendaDatabase } from '../../../../tests/agenda-database-helpers.test.mjs';
import { identityTestEnvironment } from '../../../../scripts/p33-identity-test-env.mjs';

const fakeProvider={countTokens:async()=>{throw Error('unexpected provider call');},generate:async()=>{throw Error('unexpected provider call');}};
const legacy={provider:{countStudyPlanTokens:async()=>1,extractStudyPlan:async()=>({})}};
test('application selects Foxy provider from production config or explicit overrides without dispatch', {timeout:120000}, async()=>{
  const {createApplication}=await import('../../../../.build/api/apps/api/src/application.js');
  const {readConfiguration}=await import('../../../../.build/api/apps/api/src/configuration.js');
  const {FOXY_RUNTIME}=await import('../../../../.build/api/apps/api/src/foxy-ai/index.js');
  await withAgendaDatabase(async({databaseUrl})=>{
    const base={...identityTestEnvironment(),DATABASE_URL:databaseUrl,API_PORT:'0',
      FILES_ENABLED:'1',FILES_S3_ENDPOINT:'http://127.0.0.1:9',FILES_S3_REGION:'us-east-1',FILES_S3_BUCKET:'synthetic-private',
      FILES_S3_ACCESS_KEY_ID:'a'.repeat(32),FILES_S3_SECRET_ACCESS_KEY:'b'.repeat(64),FILES_SCANNER_HOST:'127.0.0.1',FILES_SCANNER_PORT:'9',
      FILES_DRAFT_QUOTA_BYTES:'1000000',CLASSROOMS_ENABLED:'1',CLASSROOMS_QUOTA_BYTES:'100000000',
      CLASSROOMS_SIGNING_KEY:randomBytes(32).toString('base64url'),CLASSROOMS_DELIVERY_KEY:randomBytes(32).toString('base64url')};
    const ai={AI_ENABLED:'true',AI_BACKEND:'gemini-developer',AI_MODEL:'synthetic',AI_API_KEY:'synthetic-only',AI_DAILY_ACTOR_REQUESTS:'5',AI_DAILY_GLOBAL_REQUESTS:'20',
      AI_MAX_INPUT_TOKENS:'1000',AI_MAX_OUTPUT_TOKENS:'100',AI_DAILY_BUDGET_USD:'1',AI_INPUT_USD_PER_MILLION:'2',AI_OUTPUT_USD_PER_MILLION:'3',
      AI_DEADLINE_MS:'30000',AI_MAX_CONCURRENCY:'1',AI_MAX_DISPATCHES:'1',AI_MAX_JOB_AGE_MS:'300000'};
    for(const [env,options,enabled] of [[{AI_ENABLED:'false'},{foxy:{textProvider:fakeProvider}},false],[ai,{},true],
      [ai,{foxy:{textProvider:fakeProvider}},true],[ai,{foxy:{textProvider:null}},false],[ai,{ai:legacy},false]]) {
      const app=await createApplication(readConfiguration({...base,...env}),options);
      try { await app.init(); const runtime=app.get(FOXY_RUNTIME); assert.equal(Boolean(runtime.worker),enabled); }
      finally {await app.close();}
    }
  });
});

test('application passes only operational AI configuration into Foxy runtime', {timeout:120000}, async t=>{
  const {mock}=await import('node:test'); assert.equal(typeof mock.module,'function','run with --experimental-test-module-mocks');
  const moduleUrl=new URL('../../../../.build/api/apps/api/src/foxy-ai/index.js',import.meta.url), original=await import(moduleUrl.href);
  const captured=[];
  const moduleMock=mock.module(moduleUrl.href,{namedExports:{...original,createFoxyRuntime:options=>{
    captured.push(options.configuration); return original.createFoxyRuntime(options);
  }}});
  try {
    const applicationUrl=new URL('../../../../.build/api/apps/api/src/application.js',import.meta.url);
    const {createApplication}=await import(`${applicationUrl.href}?foxy-config-projection`);
    const {readConfiguration}=await import('../../../../.build/api/apps/api/src/configuration.js');
    await withAgendaDatabase(async({databaseUrl})=>{
      const env={...identityTestEnvironment(),DATABASE_URL:databaseUrl,API_PORT:'0',
        FILES_ENABLED:'1',FILES_S3_ENDPOINT:'http://127.0.0.1:9',FILES_S3_REGION:'us-east-1',FILES_S3_BUCKET:'synthetic-private',
        FILES_S3_ACCESS_KEY_ID:'a'.repeat(32),FILES_S3_SECRET_ACCESS_KEY:'b'.repeat(64),FILES_SCANNER_HOST:'127.0.0.1',FILES_SCANNER_PORT:'9',
        FILES_DRAFT_QUOTA_BYTES:'1000000',CLASSROOMS_ENABLED:'1',CLASSROOMS_QUOTA_BYTES:'100000000',
        CLASSROOMS_SIGNING_KEY:randomBytes(32).toString('base64url'),CLASSROOMS_DELIVERY_KEY:randomBytes(32).toString('base64url'),
        AI_ENABLED:'true',AI_BACKEND:'gemini-developer',AI_MODEL:'synthetic',AI_API_KEY:'synthetic-only',AI_DAILY_ACTOR_REQUESTS:'5',AI_DAILY_GLOBAL_REQUESTS:'20',
        AI_MAX_INPUT_TOKENS:'1000',AI_MAX_OUTPUT_TOKENS:'100',AI_DAILY_BUDGET_USD:'1',AI_INPUT_USD_PER_MILLION:'2',AI_OUTPUT_USD_PER_MILLION:'3',
        AI_DEADLINE_MS:'30000',AI_MAX_CONCURRENCY:'1',AI_MAX_DISPATCHES:'1',AI_MAX_JOB_AGE_MS:'300000'};
      const app=await createApplication(readConfiguration(env),{foxy:{textProvider:fakeProvider}});
      try { await app.init(); assert.equal(captured.length,1); const projection=captured[0];
        assert.equal(Object.hasOwn(projection,'apiKey'),false); assert.equal(Object.hasOwn(projection,'backend'),false);
        for(const key of ['model','maxInputTokens','maxOutputTokens','deadlineMs','maxConcurrency','maxJobAgeMs','dailyActorRequests','dailyGlobalRequests','inputUsdPerMillion','outputUsdPerMillion','dailyBudgetUsd']) assert.ok(Object.hasOwn(projection,key),key);
      } finally {await app.close();}
    });
  } finally {moduleMock.restore();}
});
