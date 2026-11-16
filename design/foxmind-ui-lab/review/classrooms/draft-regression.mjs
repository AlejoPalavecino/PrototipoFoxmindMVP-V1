import {Browser} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {writeFile} from 'node:fs/promises';
const b=await Browser.launch();const results=[];
try{const p=await b.newPage({width:1440,height:1000,reducedMotion:true});await p.goto(pathToFileURL(path.resolve('design/foxmind-ui-lab/01-foxmind.html')).href+'#docente/aulas');
await p.eval(()=>document.querySelector('[data-action=new-class]').click());
await p.eval(()=>{for(const [key,value]of Object.entries({name:'Aula de prueba',subject:'Arte',group:'2.º A'})){const el=document.querySelector(`[data-wizard=${key}]`);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));}document.querySelector('[data-action=wizard-next]').click();document.querySelector('[data-action=wizard-save]').click();});
const first=await p.eval(()=>JSON.parse(localStorage.getItem('foxmind-ui-lab-v1')).drafts);
results.push({check:'Draft retains step 2',pass:first.length===1&&first[0].savedStep===1,actual:first[0].savedStep});
await p.eval(()=>document.querySelector('[data-action=collection][data-value=drafts]').click());await p.eval(()=>{document.querySelector('[data-action=resume-wizard]').click();document.querySelector('[data-action=wizard-save]').click();});
const count=await p.eval(()=>JSON.parse(localStorage.getItem('foxmind-ui-lab-v1')).drafts.length);results.push({check:'Saving resumed draft updates same item',pass:count===1,actual:count});
}finally{await b.close();}
await writeFile(path.resolve('.test-artifacts/ui-lab/classrooms/draft-'+(process.argv[2]||'green')+'.json'),JSON.stringify(results,null,2));console.log(results);process.exit(results.every(r=>r.pass)?0:1);
