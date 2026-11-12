import {randomBytes} from 'node:crypto';
import {readFile,readdir,writeFile,unlink,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import pg from 'pg';
import sharp from 'sharp';
import {withP4Services} from './p4-services.mjs';
import {withMailpit} from './mailpit-test-runtime.mjs';
import {identityTestEnvironment} from './p33-identity-test-env.mjs';
import {seedFoxyBrowser} from './foxy-browser-seed.mjs';
import {freePort,startWeb,webReady,closeWeb,waitForStop} from './activity-ai-real-runtime.mjs';
import {activityProvider,aiEnvironment} from './activity-ai-live-provider.mjs';
import {studyPreviewProvider} from './study-preview-provider.mjs';
const studySynthetic=process.env.FOXMIND_STUDY_PREVIEW==='synthetic';
const directory=resolve('.test-artifacts',(studySynthetic?'study-preview-':'documentation-preview-')+randomBytes(8).toString('hex')); await mkdir(directory,{recursive:true});
const refuse=new Proxy({}, {get:()=>async()=>{throw Object.assign(new Error('Synthetic provider unavailable for this branch'),{code:'AI_UNAVAILABLE'});}});
await withP4Services(runtime=>withMailpit(async mail=>{
 let app,web;
 try{
  const pool=new pg.Pool({connectionString:runtime.databaseUrl});
  try{for(const name of (await readdir('prisma/migrations')).filter(x=>/^\d+_/.test(x)).sort())await pool.query(await readFile(`prisma/migrations/${name}/migration.sql`,'utf8'));}finally{await pool.end();}
  const {createApplication}=await import('../.build/api/apps/api/src/application.js');
  const {readConfiguration}=await import('../.build/api/apps/api/src/configuration.js');
  const port=await freePort(),origin=`http://127.0.0.1:${port}`,infra=runtime.infrastructure;
  const env={...identityTestEnvironment(),...aiEnvironment,AI_DEADLINE_MS:'30000',AI_IMAGE_ENABLED:'true',AI_DIAGRAM_ENABLED:'true',AI_IMAGE_MAX_INPUT_TOKENS:'65536',AI_IMAGE_MAX_OUTPUT_TOKENS:'4096',AI_IMAGE_INPUT_USD_PER_MILLION:'0.25',AI_IMAGE_TEXT_OUTPUT_USD_PER_MILLION:'1.5',AI_IMAGE_OUTPUT_USD_PER_MILLION:'30',FOXY_PRIVATE_ASSET_QUOTA_BYTES:'10485760',DATABASE_URL:runtime.databaseUrl,APP_ORIGIN:origin,MAIL_SMTP_PORT:String(mail.smtpPort),FILES_ENABLED:'1',FILES_S3_ENDPOINT:infra.endpoint,FILES_S3_REGION:infra.region,FILES_S3_BUCKET:infra.bucket,FILES_S3_ACCESS_KEY_ID:infra.accessKeyId,FILES_S3_SECRET_ACCESS_KEY:infra.secretAccessKey,FILES_SCANNER_HOST:infra.scannerHost,FILES_SCANNER_PORT:String(infra.scannerPort),FILES_DRAFT_QUOTA_BYTES:'20000000',CLASSROOMS_ENABLED:'1',CLASSROOMS_QUOTA_BYTES:'100000000',CLASSROOMS_SIGNING_KEY:randomBytes(32).toString('base64url'),CLASSROOMS_DELIVERY_KEY:randomBytes(32).toString('base64url')};
  const png=await sharp({create:{width:400,height:300,channels:3,background:'#b8490c'}}).png().toBuffer();
  const graph={schemaVersion:'foxy-diagram-v1',title:'Ciclo del agua',description:'Referencia de prueba',direction:'TOP_DOWN',nodes:[{id:'agua',label:'Agua'},{id:'vapor',label:'Vapor'}],edges:[{from:'agua',to:'vapor',label:'evaporación'}]};
  const visualProviders={IMAGE:{countTokens:async()=>12,generate:async()=>({bytes:png,declaredMimeType:'image/png',usage:{inputTokens:12,outputTokens:20}})},DIAGRAM:{countTokens:async()=>12,generate:async()=>({diagram:graph,usage:{inputTokens:12,outputTokens:20}})}};
  const textProvider={countTokens:async()=>100,generate:async input=>{
    const source=input.sources.find(item=>item.kind==='ATTACHMENT');
    const document=source&&input.documents.find(item=>source.documentKeys.includes(item.documentKey));
    const attached=!!document&&(document.document.kind==='pdf'?document.document.bytes.byteLength>0:!!document.document.text.trim());
    return {json:{schemaVersion:'foxy-text-response-v1',status:'READY',title:'Guía de exposición',
      markdown:attached?'Documento privado recibido por el proveedor sintético.':'## La luz\nLa exposición depende de la apertura y del tiempo. Compará dos situaciones y justificá tu respuesta.',
      references:attached?[{sourceKey:source.sourceKey,documentKey:document.documentKey,page:document.pageCount?1:null}]:[],
      warnings:['Contenido de proveedor sintético para verificación de interfaz.'],missingInformation:[]},inputTokens:100,outputTokens:100};
  }};
  const provider={countStudyPlanTokens:async()=>100,extractStudyPlan:async()=>({json:{units:[{name:'La luz',topics:[{name:'Exposición'},{name:'Contraste'}]}],warnings:[]},inputTokens:100,outputTokens:80})};
  app=await createApplication(readConfiguration(env),{ai:{provider,activityProvider,studentProvider:refuse,gradingProvider:refuse},foxy:{textProvider,visualProviders},...(studySynthetic?{study:{provider:studyPreviewProvider}}:{})});await app.listen(0,'127.0.0.1');
  web=startWeb(port,`http://127.0.0.1:${app.getHttpServer().address().port}`);await webReady(web,origin);
  const account=await seedFoxyBrowser({origin,inbox:mail.httpOrigin,directory,suffix:'estado-actual'});
  await writeFile(resolve(directory,'fixture.json'),JSON.stringify({origin,inbox:mail.httpOrigin,...account,studyProvider:studySynthetic?'synthetic':'default',stopFile:resolve(directory,'stop')}),{mode:0o600});
  console.log(JSON.stringify({ready:true,origin,provider:'synthetic',roles:2,fixturePath:resolve(directory,'fixture.json'),stopFile:resolve(directory,'stop')}));
  await waitForStop(resolve(directory,'stop'));
 }finally{await unlink(resolve(directory,'fixture.json')).catch(e=>{if(e.code!=='ENOENT')throw e;});await closeWeb(web);await app?.close();}
}),{databaseName:'documentation_current_test'});
