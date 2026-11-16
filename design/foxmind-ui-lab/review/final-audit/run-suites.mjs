import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const dir=path.resolve('.test-artifacts/ui-lab/final-audit');await mkdir(dir,{recursive:true});
const hash=createHash('sha256').update(await readFile('design/foxmind-ui-lab/01-foxmind.html')).digest('hex');
const suites={
 'final-audit':['teaching-journeys','teaching-quality','teaching-states','shared-flows','agenda-quality','participation-quality','context-regressions','notifications-tests','notification-transitions'],
 'classrooms':['check','draft-regression'],
 'teaching-polish':['contract-check'],
 'participation-polish':['author-intent-check','journeys','semantics','edge-layout'],
 'agenda-polish':['contracts','journeys','week-compact'],
 'foxy-focus':['flows','quality','generation','home-compact','practice-regression','toolbar'],
 'context-library':['flows','quality','wizard'],
 'account-notifications':['profile-tests','component-bounds','low-height']
};
const all=Object.entries(suites).flatMap(([group,files])=>files.map(f=>`${group}/${f}.mjs`));
const requested=process.argv.slice(2),queue=requested.length?all.filter(x=>requested.some(q=>x.includes(q))):all,results=[];
async function run(file){const start=Date.now(),name=file.replaceAll('/','-').replace('.mjs','');let output='';
 const code=await new Promise(resolve=>{const child=spawn(process.execPath,[path.resolve('design/foxmind-ui-lab/review',file)],{cwd:process.cwd(),shell:false,windowsHide:true});
 const timer=setTimeout(()=>{child.kill();output+='\nAUDIT TIMEOUT';},180000);child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>output+=c);child.on('error',e=>output+=e.stack);child.on('close',code=>{clearTimeout(timer);resolve(code);});});
 await writeFile(path.join(dir,name+'.log'),output);const item={file,code,pass:code===0,ms:Date.now()-start,log:name+'.log'};results.push(item);console.log(JSON.stringify(item));
}
// Serial within a group: some historical suites write the same evidence directory.
await Promise.all([0,1].map(async()=>{while(queue.length){const group=queue[0].split('/')[0],batch=queue.filter(x=>x.startsWith(group+'/'));for(const item of batch)queue.splice(queue.indexOf(item),1);for(const item of batch)await run(item);}}));
await writeFile(path.join(dir,requested.length?'suites-selected.json':'suites.json'),JSON.stringify({candidateSha256:hash,runAt:new Date().toISOString(),results},null,2));
console.log(JSON.stringify({suites:results.length,passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).map(x=>x.file),hash}));process.exitCode=results.some(x=>!x.pass)?1:0;
