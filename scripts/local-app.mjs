import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {parseEnv} from 'node:util';
import {randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile,unlink,open} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
import {P4_IMAGES,P4_SCANNER_START} from './p4-services.mjs';
import {MAILPIT_IMAGE} from './mailpit-test-runtime.mjs';
import {updateEnvironment,requireLocalOwner,stopLocalContainers} from './local-app-environment.mjs';

const root=resolve(import.meta.dirname,'..'),folder=resolve(root,'.test-artifacts/local-app'),execute=promisify(execFile);
process.chdir(root);await mkdir(folder,{recursive:true});
const file=name=>resolve(folder,name),json=async name=>JSON.parse(await readFile(file(name),'utf8'));
const save=async(name,value)=>writeFile(file(name),JSON.stringify(value,null,2),{mode:0o600});
async function command(executable,args,environment=process.env,timeout=240000){
  try{const result=await execute(executable,args,{cwd:root,env:environment,windowsHide:true,timeout,maxBuffer:8*1024*1024});return result.stdout.trim();}
  catch{throw Error('Local command failed: '+(executable==='docker'?'Docker services':args[0]));}
}
async function available(port=0){const server=createServer();await new Promise((done,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',done);});const selected=server.address().port;await new Promise(done=>server.close(done));return selected;}
async function stop(){
  const state=await json('status.json').catch(()=>null);if(!state||state.state==='STOPPED')return;
  if(state.state==='FAILED'){await available(3000);await available(3001);return;}
  if(state.project!==(await json('owner.json')).project)throw Error('Foreign local supervisor');
  try{process.kill(state.supervisorPid,0);}catch{throw Error('Local supervisor missing; inspect owned processes before restarting');}
  await writeFile(file('stop'),'stop');
  for(let i=0;i<80;i++){if((await json('status.json')).state==='STOPPED')return;await delay(125);}
  throw Error('Local supervisor stop not confirmed');
}
async function up(){
  const original=await readFile('.env','utf8'),existing=parseEnv(original);
  if(!existing.AI_API_KEY?.trim()||existing.AI_ENABLED!=='true')throw Error('Configure the existing root Gemini key and AI_ENABLED=true first');
  if(await command('git',['check-ignore','.env'])!=='.env')throw Error('Root .env must remain ignored');
  let owner=await json('owner.json').catch(error=>{if(error.code!=='ENOENT')throw error;return null;});
  if(owner)requireLocalOwner(owner);
  await stop();await available(3000);await available(3001);
  if(!owner){
    owner={project:'foxmind-local-'+randomBytes(8).toString('hex'),ports:{}};
    for(const service of ['database','storage','scanner','smtp','inbox'])owner.ports[service]=await available();
    await save('owner.json',owner);
  }
  const environment={...existing};
  const defaults={LOCAL_POSTGRES_PASSWORD:randomBytes(32).toString('hex'),FILES_S3_ACCESS_KEY_ID:randomBytes(16).toString('hex'),FILES_S3_SECRET_ACCESS_KEY:randomBytes(32).toString('hex'),AUTH_CSRF_HMAC_KEY:randomBytes(32).toString('base64url'),AUTH_ABUSE_HMAC_KEY:randomBytes(32).toString('base64url'),AUTH_OUTBOX_KEYS_JSON:JSON.stringify({local:randomBytes(32).toString('base64')}),AUTH_OUTBOX_ACTIVE_KEY_ID:'local',CLASSROOMS_SIGNING_KEY:randomBytes(32).toString('base64url'),CLASSROOMS_DELIVERY_KEY:randomBytes(32).toString('base64url')};
  for(const [key,value]of Object.entries(defaults))if(!environment[key])environment[key]=value;
  const updates={...Object.fromEntries(Object.keys(defaults).map(k=>[k,environment[k]])),DATABASE_URL:`postgresql://postgres:${environment.LOCAL_POSTGRES_PASSWORD}@127.0.0.1:${owner.ports.database}/foxmind_local`,NODE_ENV:'development',API_PORT:'3001',APP_ORIGIN:'http://127.0.0.1:3000',AUTH_LOCAL_HTTP:'true',AUTH_TRUSTED_PROXY_CIDRS:'',MAIL_SMTP_PORT:String(owner.ports.smtp),FILES_ENABLED:'1',FILES_S3_ENDPOINT:`http://127.0.0.1:${owner.ports.storage}`,FILES_S3_REGION:'us-east-1',FILES_S3_BUCKET:'foxmind-private',FILES_SCANNER_HOST:'127.0.0.1',FILES_SCANNER_PORT:String(owner.ports.scanner),FILES_DRAFT_QUOTA_BYTES:'200000000',CLASSROOMS_ENABLED:'1',CLASSROOMS_QUOTA_BYTES:'1000000000',FOXMIND_API_ORIGIN:'http://127.0.0.1:3001'};
  if(existing.DATABASE_URL&&existing.DATABASE_URL!==updates.DATABASE_URL)throw Error('Root .env points to another database; refusing to replace it');
  await writeFile('.env',updateEnvironment(original,updates));Object.assign(environment,updates);
  await save('s3.json',{identities:[{name:'local-backend',credentials:[{accessKey:environment.FILES_S3_ACCESS_KEY_ID,secretKey:environment.FILES_S3_SECRET_ACCESS_KEY}],actions:['Admin','Read','Write','List']}]});
  // Linux ClamAV rejects CRLF values from a Windows checkout.
  for(const name of ['clamd','freshclam'])await writeFile(file(name+'.conf'),(await readFile('config/p4-'+name+'.conf','utf8')).replace(/\r\n/g,'\n'));
  const label={'foxmind.local.owner':owner.project},mount=(source,target)=>({type:'bind',source:resolve(root,source),target,read_only:true});
  const published=(service,target)=>[`127.0.0.1:${owner.ports[service]}:${target}`];
  const health=(test,retries=60)=>({test,interval:'2s',timeout:'2s',retries});
  const compose={services:{
    database:{image:P4_IMAGES.database,labels:label,environment:{POSTGRES_PASSWORD:environment.LOCAL_POSTGRES_PASSWORD,POSTGRES_DB:'foxmind_local'},ports:published('database',5432),volumes:['database:/var/lib/postgresql/data'],healthcheck:health(['CMD','pg_isready','-U','postgres','-d','foxmind_local'])},
    storage:{image:P4_IMAGES.storage,labels:label,command:['mini','-dir=/data','-s3.config=/config/s3.json','-bucket=foxmind-private','-admin.ui=false','-webdav=false'],ports:published('storage',8333),volumes:['storage:/data',mount('.test-artifacts/local-app/s3.json','/config/s3.json')],healthcheck:health(['CMD','wget','-q','-O','/dev/null','http://127.0.0.1:9333/cluster/status'])},
    scanner:{image:P4_IMAGES.scanner,labels:label,entrypoint:['/bin/sh','-c'],command:[P4_SCANNER_START],ports:published('scanner',3310),volumes:['signatures:/var/lib/clamav',mount('.test-artifacts/local-app/clamd.conf','/etc/clamav/clamd.conf'),mount('.test-artifacts/local-app/freshclam.conf','/etc/clamav/p4-freshclam.conf')],healthcheck:health(['CMD','clamdscan','--ping=1','--config-file=/etc/clamav/clamd.conf'],100),mem_limit:'4g'},
    mail:{image:MAILPIT_IMAGE,labels:label,environment:{MP_DATABASE:'/data/mailpit.db',MP_DISABLE_VERSION_CHECK:'true'},ports:[...published('smtp',1025),...published('inbox',8025)],volumes:['mail:/data'],healthcheck:health(['CMD','/mailpit','readyz'])}
  },volumes:Object.fromEntries(['database','storage','signatures','mail'].map(name=>[name,{labels:label}]))};
  const ids=(await command('docker',['ps','-aq','--filter','label=com.docker.compose.project='+owner.project])).split(/\s+/).filter(Boolean);
  for(const id of ids){const found=await command('docker',['inspect','--format','{{index .Config.Labels "foxmind.local.owner"}}',id]);if(found!==owner.project)throw Error('Foreign Docker resource');}
  await save('compose.json',compose);
  console.log('Starting owned persistent PostgreSQL/storage/scanner/Mailpit');
  await command('docker',['compose','--project-name',owner.project,'--file',file('compose.json'),'up','--detach','--wait','--wait-timeout','220']);
  console.log('Migrating owned local database');
  await command(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{...process.env,...environment},60000);
  console.log('Building API and web from this checkout');
  await command(process.execPath,['scripts/build-api.mjs'],process.env,60000);
  await command(process.execPath,['node_modules/next/dist/bin/next','build','apps/web'],{...process.env,NEXT_TELEMETRY_DISABLED:'1'},180000);
  await unlink(file('stop')).catch(e=>{if(e.code!=='ENOENT')throw e;});
  await save('status.json',{state:'STARTING',project:owner.project});
  const output=await open(file('supervisor.log'),'a',0o600);
  const supervisor=spawn(process.execPath,[resolve(root,'scripts/local-app-supervisor.mjs')],{cwd:root,detached:true,windowsHide:true,stdio:['ignore',output.fd,output.fd]});supervisor.unref();await output.close();
  for(let i=0;i<240;i++){
    const state=await json('status.json');if(state.state==='READY'){console.log(JSON.stringify({ready:true,origin:environment.APP_ORIGIN,apiOrigin:environment.FOXMIND_API_ORIGIN,provider:'Gemini real from root .env',accountsFile:'.test-artifacts/local-app/accounts.json'}));return;}
    if(state.state==='FAILED')throw Error('Local app failed; inspect private supervisor log');await delay(250);
  }
  throw Error('Local app startup timeout');
}
try{
  const action=process.argv[2]??'up';
  if(action==='up'||action==='restart')await up();
  else if(action==='stop'){
    await stop();
    const owner=await json('owner.json').catch(error=>{if(error.code!=='ENOENT')throw error;return null;});
    await stopLocalContainers(owner,command);
    console.log('Owned API/web and Docker containers stopped; volumes and data retained');
  }
  else if(action==='status'){const state=await json('status.json');console.log(JSON.stringify({state:state.state,origin:'http://127.0.0.1:3000',apiOrigin:'http://127.0.0.1:3001'}));}
  else throw Error('Usage: local-app.mjs up|restart|stop|status');
}catch(error){console.error(error.message);process.exitCode=1;}
