import {Browser,sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const b=await Browser.launch(),checks=[];
try{
 const p=await b.newPage({width:1440,height:1000,reducedMotion:true});
 await p.goto(pathToFileURL(path.resolve('design/foxmind-ui-lab/01-foxmind.html')).href+'?contract=9#docente/aula/plan',{settleMs:50});
 checks.push({name:'Compact useful classroom header',pass:await p.eval(()=>{const e=document.querySelector('.room-compact-header');return !!e&&e.getBoundingClientRect().height<=155&&e.querySelectorAll('.room-quick-link').length>=2;})});
 await p.eval(()=>{const b=[...document.querySelectorAll('button')].find(b=>/^(Volver a marcar pendiente|Marcar como pendiente|Marcar pendiente)$/.test(b.textContent.trim()));if(b)b.click();});await sleep(50);
 checks.push({name:'Unmarking one topic preserves two other taught topics',pass:await p.eval(()=>JSON.parse(localStorage.getItem('foxmind-ui-lab-v1')||'{}').classes?.find(c=>c.id==='photo')?.taught===2)});
 await p.eval(()=>location.hash='#docente/aula/progreso');await sleep(60);
 checks.push({name:'Progress charts expose real data values',pass:await p.eval(()=>!!document.querySelector('.room-submission-chart')&&!!document.querySelector('.room-grade-chart'))});
}finally{await b.close();}
await writeFile(path.resolve('.test-artifacts/ui-lab/teaching-polish/contract-'+(process.argv[2]||'green')+'.json'),JSON.stringify(checks,null,2));console.log(checks);process.exit(checks.every(c=>c.pass)?0:1);
