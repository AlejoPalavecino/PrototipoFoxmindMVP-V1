import {spawn} from 'node:child_process';
import {readFile,writeFile,open,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {parseEnv} from 'node:util';
import {setTimeout as delay} from 'node:timers/promises';
import {requireLocalOwner,localAppPorts} from './local-app-environment.mjs';
import {seedFoxyBrowser} from './foxy-browser-seed.mjs';

const root=resolve(import.meta.dirname,'..'),folder=resolve(root,'.test-artifacts/local-app'),file=name=>resolve(folder,name);
process.chdir(root);
const owner=requireLocalOwner(JSON.parse(await readFile(file('owner.json'),'utf8'))),env=parseEnv(await readFile('.env','utf8'));
let api,web,office;const handles=[];
const state=async value=>writeFile(file('status.json'),JSON.stringify({state:value,project:owner.project,supervisorPid:process.pid,apiPid:api?.pid,webPid:web?.pid,officePid:office?.pid}),{mode:0o600});
async function start(args,name,environment){const log=await open(file(name+'.log'),'a',0o600);handles.push(log);const child=spawn(process.execPath,args,{cwd:root,env:environment,windowsHide:true,stdio:['ignore',log.fd,log.fd]});child.on('error',()=>{});return child;}
async function ready(child,url){for(let i=0;i<100;i++){if(child.exitCode!==null||child.signalCode!==null)throw Error('Owned process exited');try{const r=await fetch(url,{signal:AbortSignal.timeout(800)});await r.arrayBuffer();if(r.ok)return;}catch{}await delay(200);}throw Error('Owned readiness unavailable');}
async function close(child){if(!child||child.exitCode!==null||child.signalCode!==null)return;child.kill();for(let i=0;i<50&&child.exitCode===null&&child.signalCode===null;i++)await delay(100);if(child.exitCode===null&&child.signalCode===null)throw Error('Owned child stop unavailable');}
let failed=false;
try{
  await state('STARTING');
  // S12: only this broker may run the disposable Office converter; the API reaches it over loopback with a token.
  if(owner.ports.office!==undefined&&env.FILES_OFFICE_CONVERTER_TOKEN)office=await start([resolve(root,'scripts/office-converter-broker.mjs')],'office',{...process.env,FOXMIND_OFFICE_BROKER_PORT:String(owner.ports.office),FOXMIND_OFFICE_BROKER_TOKEN:env.FILES_OFFICE_CONVERTER_TOKEN});
  api=await start(['--env-file=.env',resolve(root,'.build/api/apps/api/src/main.js')],'api',{...process.env,...env});
  await ready(api,env.FOXMIND_API_ORIGIN+'/api/v1/health/ready');
  const webEnv={...process.env,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',FOXMIND_API_ORIGIN:env.FOXMIND_API_ORIGIN,...(env.FOXMIND_PROXY_CLIENT_KEY?{FOXMIND_PROXY_CLIENT_KEY:env.FOXMIND_PROXY_CLIENT_KEY}:{})};
  for(const key of Object.keys(webEnv))if(key.startsWith('AI_'))delete webEnv[key];
  web=await start(['node_modules/next/dist/bin/next','start','apps/web','--hostname','127.0.0.1','--port',String(localAppPorts(owner).web)],'web',webEnv);
  await ready(web,env.APP_ORIGIN+'/sign-in');
  try{await access(file('accounts.json'));}
  catch(error){if(error.code!=='ENOENT')throw error;const account=await seedFoxyBrowser({origin:env.APP_ORIGIN,inbox:`http://127.0.0.1:${owner.ports.inbox}`,directory:folder,suffix:'gemini-local'});await writeFile(file('accounts.json'),JSON.stringify({origin:env.APP_ORIGIN,...account}),{mode:0o600});}
  await state('READY');
  let stopping=false;process.once('SIGINT',()=>{stopping=true;});process.once('SIGTERM',()=>{stopping=true;});
  while(!stopping){if(api.exitCode!==null||web.exitCode!==null||(office&&office.exitCode!==null))throw Error('Owned process stopped unexpectedly');try{await access(file('stop'));break;}catch{}await delay(250);}
}catch{failed=true;console.error('Local app supervisor failed; private process logs contain sanitized startup diagnostics');}
finally{try{await close(web);await close(api);await close(office);}catch{failed=true;}for(const handle of handles)await handle.close();await state(failed?'FAILED':'STOPPED');}
