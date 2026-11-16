import {Browser} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
import {writeFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';import path from 'node:path';
const b=await Browser.launch(),checks=[];let p;
try{p=await b.newPage({width:390,height:706,reducedMotion:true});await p.goto(pathToFileURL(path.resolve('design/foxmind-ui-lab/01-foxmind.html')).href+'?compact-week#docente/agenda',{settleMs:50});await p.eval(()=>document.querySelector('[data-value=week]').click());
checks.push({name:'Week starts with event days, without empty rows before them',pass:await p.eval(()=>document.querySelectorAll('.agenda-week-group').length===1&&document.querySelector('.agenda-week-group').id==='agenda-week-2026-11-13')});
await p.eval(()=>document.querySelector('[data-action=agenda-week-day][data-date="2026-11-12"]').click());checks.push({name:'Selecting an empty day reveals it and preserves event days',pass:await p.eval(()=>document.querySelectorAll('.agenda-week-group').length===2&&document.querySelector('#agenda-week-2026-11-12 .agenda-week-free')&&document.querySelectorAll('.agenda-event').length===2)});
await p.eval(()=>document.querySelector('[data-action=agenda-add-date][data-date="2026-11-12"]').click());checks.push({name:'Empty weekday creates on the chosen date',pass:await p.eval(()=>document.querySelector('[name=date]').value==='2026-11-12')});
}finally{await b.close();}
await writeFile('.test-artifacts/ui-lab/agenda-polish/week-'+(process.argv[2]||'green')+'.json',JSON.stringify(checks,null,2));console.log(checks);process.exit(checks.some(c=>!c.pass)?1:0);
