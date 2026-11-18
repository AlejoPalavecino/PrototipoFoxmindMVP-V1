import { loadEnvFile } from 'node:process';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, readdir, readFile, open, unlink } from 'node:fs/promises';
import pg from 'pg';
import sharp from 'sharp';
import { resolve } from 'node:path';
import { withP4Services } from './p4-services.mjs';
import { withMailpit } from './mailpit-test-runtime.mjs';
import { identityTestEnvironment } from './p33-identity-test-env.mjs';
import { seedFoxyBrowser } from './foxy-browser-seed.mjs';
import { freePort, startWeb, webReady, closeWeb, waitForStop } from './activity-ai-real-runtime.mjs';

async function main() {
  const synthetic=process.argv.includes('--synthetic'), live=process.argv.includes('--live-authorized');
  const id=process.argv.find(x=>x.startsWith('--attempt-id='))?.slice(13);
  if (synthetic===live || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id??'')) throw new Error('Explicit mode and unique attempt required');
  if (Object.keys(process.env).some(k => k.startsWith('AI_') || k === 'FOXY_PRIVATE_ASSET_QUOTA_BYTES')) throw new Error('Inherited AI configuration forbidden');
  await mkdir('.test-artifacts',{recursive:true}); const guard=await open(resolve('.test-artifacts',`foxy-browser-${id}.receipt`),'wx',0o600); try {await guard.writeFile('STARTED');await guard.sync();} finally {await guard.close();}
  if (!synthetic) loadEnvFile('.env.foxy-test');
  const ai = synthetic ? {AI_ENABLED:'true',AI_IMAGE_ENABLED:'true',AI_DIAGRAM_ENABLED:'true',FOXY_PRIVATE_ASSET_QUOTA_BYTES:'10485760',AI_IMAGE_MAX_INPUT_TOKENS:'65536',AI_IMAGE_MAX_OUTPUT_TOKENS:'4096',AI_IMAGE_INPUT_USD_PER_MILLION:'0.25',AI_IMAGE_TEXT_OUTPUT_USD_PER_MILLION:'1.5',AI_IMAGE_OUTPUT_USD_PER_MILLION:'30',AI_BACKEND:'gemini-developer',AI_MODEL:'gemini-3.1-flash-lite',AI_API_KEY:'synthetic',AI_DAILY_ACTOR_REQUESTS:'5',AI_DAILY_GLOBAL_REQUESTS:'10',AI_MAX_INPUT_TOKENS:'65536',AI_MAX_OUTPUT_TOKENS:'4096',AI_DAILY_BUDGET_USD:'1',AI_INPUT_USD_PER_MILLION:'0.25',AI_OUTPUT_USD_PER_MILLION:'1.5',AI_DEADLINE_MS:'30000',AI_MAX_CONCURRENCY:'1',AI_MAX_DISPATCHES:'1',AI_MAX_JOB_AGE_MS:'300000'} : Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('AI_') || k === 'FOXY_PRIVATE_ASSET_QUOTA_BYTES'));
  for (const key of Object.keys(ai)) delete process.env[key];
  const directory=resolve('.test-artifacts',`foxy-browser-${randomBytes(8).toString('hex')}`); await mkdir(directory,{recursive:true});
  await withP4Services(runtime => withMailpit(async mail => {
    let app, web;
    try {
      const pool = new pg.Pool({connectionString:runtime.databaseUrl});
      try { for (const name of (await readdir('prisma/migrations')).filter(x => /^\d+_/.test(x)).sort()) await pool.query(await readFile(`prisma/migrations/${name}/migration.sql`,'utf8')); }
      finally { await pool.end(); }
      const {createApplication}=await import('../.build/api/apps/api/src/application.js');
      const {readConfiguration}=await import('../.build/api/apps/api/src/configuration.js');
      const port=await freePort(),origin=`http://127.0.0.1:${port}`,infra=runtime.infrastructure;
      const env={...identityTestEnvironment(),...ai,DATABASE_URL:runtime.databaseUrl,APP_ORIGIN:origin,MAIL_SMTP_PORT:String(mail.smtpPort),FILES_ENABLED:'1',FILES_S3_ENDPOINT:infra.endpoint,FILES_S3_REGION:infra.region,FILES_S3_BUCKET:infra.bucket,FILES_S3_ACCESS_KEY_ID:infra.accessKeyId,FILES_S3_SECRET_ACCESS_KEY:infra.secretAccessKey,FILES_SCANNER_HOST:infra.scannerHost,FILES_SCANNER_PORT:String(infra.scannerPort),FILES_DRAFT_QUOTA_BYTES:'20000000',CLASSROOMS_ENABLED:'1',CLASSROOMS_QUOTA_BYTES:'100000000',CLASSROOMS_SIGNING_KEY:randomBytes(32).toString('base64url'),CLASSROOMS_DELIVERY_KEY:randomBytes(32).toString('base64url')};
      const config=readConfiguration(env);
      const {createGeminiFoxyImageAdapter}=await import("../.build/api/apps/api/src/modules/foxy/visuals/infrastructure/providers/foxy-image-adapter.js");
      const {createGeminiFoxyDiagramAdapter}=await import("../.build/api/apps/api/src/modules/foxy/visuals/infrastructure/providers/foxy-diagram-adapter.js");
      const providers={};
      for (const kind of ['IMAGE','DIAGRAM']) {
        const profile=config.foxyVisual?.configuration.profiles[kind]; if (!profile || !config.ai) throw new Error('Missing visual configuration');
        const deadlineMs=kind==='IMAGE'?config.foxyVisual.imageProviderDeadlineMs:config.foxyVisual.providerDeadlineMs;
        const opts={apiKey:config.ai.apiKey,configuration:{model:profile.model,profileVersion:profile.profileVersion,maxInputTokens:profile.maxInputTokens,maxOutputTokens:profile.maxOutputTokens,deadlineMs}};
        const png=synthetic && kind==='IMAGE'?await sharp({create:{width:40,height:30,channels:3,background:'#228866'}}).png().toBuffer():null;
        const graph={schemaVersion:'foxy-diagram-v1',title:'Ciclo del agua',description:'Esquema sintético',direction:'TOP_DOWN',nodes:[{id:'agua',label:'Agua'},{id:'vapor',label:'Vapor'}],edges:[{from:'agua',to:'vapor',label:'evaporación'}]};
        const adapter=synthetic?{countTokens:async()=>12,generate:async()=>kind==='IMAGE'?{bytes:png,declaredMimeType:'image/png',usage:{inputTokens:12,outputTokens:20}}:{diagram:graph,usage:{inputTokens:12,outputTokens:20}}}:kind==='IMAGE'?createGeminiFoxyImageAdapter(opts):createGeminiFoxyDiagramAdapter(opts);
        let counted=false,dispatched=false;
        providers[kind]={async countTokens(input){if(counted) throw new Error('Repeated count refused'); counted=true; return adapter.countTokens(input);},async generate(input){if(dispatched) throw new Error('Repeated dispatch refused'); dispatched=true; const receipt=await open(resolve(directory,`${kind}.receipt`),'wx',0o600); try {await receipt.writeFile('DISPATCHING');await receipt.sync();} finally {await receipt.close();} return adapter.generate(input);}};
      }
      const refuse=new Proxy({}, {get:()=>async()=>{throw new Error('Other AI disabled in fixture');}});
      app=await createApplication(config,{ai:{provider:refuse,activityProvider:refuse},foxy:{textProvider:null,visualProviders:providers}}); await app.listen(0,'127.0.0.1');
      web=startWeb(port,`http://127.0.0.1:${app.getHttpServer().address().port}`); await webReady(web,origin);
      const image=await seedFoxyBrowser({origin,inbox:mail.httpOrigin,directory,suffix:'image'});
      const diagram=await seedFoxyBrowser({origin,inbox:mail.httpOrigin,directory,suffix:'diagram'});
      const verify=new pg.Pool({connectionString:runtime.databaseUrl});
      try {const {rows}=await verify.query('SELECT (SELECT count(*) FROM classroom_curriculum_extractions)::int extraction,(SELECT count(*) FROM activity_ai_generations)::int activity,(SELECT count(*) FROM ai_usage_daily)::int usage');if(Object.values(rows[0]).some(x=>x!==0))throw new Error('Unexpected startup AI work');} finally {await verify.end();}
      const stopFile=resolve(directory,'stop'); await writeFile(resolve(directory,'fixture.json'),JSON.stringify({image,diagram,origin,stopFile}),{mode:0o600});
      console.log(JSON.stringify({origin,fixturePath:resolve(directory,'fixture.json'),stopFile}));
      await waitForStop(stopFile);
    } finally { try { await unlink(resolve(directory,'fixture.json')).catch(error=>{if(error.code!=='ENOENT')throw error;}); } finally { try { await closeWeb(web); } finally { await app?.close(); } } }
  }),{databaseName:'foxy_browser_real_test'});
}
main().catch(()=>{console.error('FOXY_BROWSER_FIXTURE_FAILED');process.exitCode=1});
