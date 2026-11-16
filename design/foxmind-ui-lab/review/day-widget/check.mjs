import {Browser,sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const dir=path.resolve('.test-artifacts/ui-lab/day-widget');await mkdir(dir,{recursive:true});
const contrastSource=await readFile(new URL('../iteration-2/contrast-check.mjs',import.meta.url),'utf8');
const contrastFn=new Function('return (()=>{'+contrastSource.split('const result=await p.eval(()=>{')[1].split('});\n report.screens.push')[0]+'})')();
const b=await Browser.launch(),report={checks:[],contrast:[],failures:[]};
try{
 for(const width of [1440,768,390,320]){const p=await b.newPage({width,height:width===1440?1000:900,reducedMotion:true});
  for(const role of ['docente','estudiante']){await p.goto(`http://127.0.0.1:4173/?day-check=${width}-${role}#${role}/inicio`,{settleMs:80});
   const durations=await p.eval(()=>[...document.querySelectorAll('.planner-event-meta small')].map(e=>e.textContent));assert.deepEqual(durations,['1 h','30 min']);
   assert.equal(await p.eval(()=>document.documentElement.scrollWidth<=innerWidth+1),true);report.checks.push(`${role} ordered events/duration/layout ${width}`);
   await p.eval(()=>window.scrollTo(0,document.querySelector('.day-planner').getBoundingClientRect().top+scrollY-(innerWidth<1000?140:60)));
   await p.screenshot({path:path.join(dir,`${width}-${role}.png`),format:'png'});
  }
  // The test uses a disposable browser profile; no user data is reset.
  await p.eval(()=>document.querySelector('[data-action=new-event]').click());await p.eval(()=>{const f=document.querySelector('#event-form');f.elements.title.value='Lectura compartida y conversación sobre todas las ideas que encontramos en el capítulo';f.elements.time.value='11:00';f.elements.end.value='12:30';document.querySelector('[name=color][value=violet]').click();f.requestSubmit();});
  assert.equal(await p.eval(()=>document.querySelector('.planner-event-card.event-violet small').textContent),'1 h 30 min');report.checks.push(`new event duration ${width}`);
  let saved=await p.eval(()=>JSON.parse(localStorage.getItem('foxmind-ui-lab-v1')));
  for(const color of ['blue','green','orange','rose','violet','slate']){await p.eval(color=>{const s=JSON.parse(localStorage.getItem('foxmind-ui-lab-v1'));s.events.find(e=>e.time==='11:00').color=color;localStorage.setItem('foxmind-ui-lab-v1',JSON.stringify(s));},color);await p.goto(`http://127.0.0.1:4173/?color=${width}-${color}#estudiante/inicio`,{settleMs:50});const c=await p.eval(contrastFn);report.contrast.push({width,color,count:c.count,failures:c.failures});assert.equal(c.failures.length,0);assert.equal(await p.eval(()=>document.documentElement.scrollWidth<=innerWidth+1),true);}
  report.checks.push(`six colors and long title ${width}`);await p.eval(()=>window.scrollTo(0,document.querySelector('.day-planner').getBoundingClientRect().top+scrollY-140));await p.screenshot({path:path.join(dir,`${width}-long-title.png`),format:'png'});
  await p.eval(()=>{const s=JSON.parse(localStorage.getItem('foxmind-ui-lab-v1'));s.events=[];localStorage.setItem('foxmind-ui-lab-v1',JSON.stringify(s));});await p.goto(`http://127.0.0.1:4173/?empty=${width}#estudiante/inicio`,{settleMs:50});assert.ok(await p.eval(()=>document.querySelector('.planner-empty')&&document.querySelector('[data-action=new-event]')));assert.equal(await p.eval(()=>document.querySelectorAll('.planner-event-card').length),0);report.checks.push(`empty state ${width}`);
  await p.eval(()=>window.scrollTo(0,document.querySelector('.day-planner').getBoundingClientRect().top+scrollY-140));await p.screenshot({path:path.join(dir,`${width}-empty.png`),format:'png'});
  saved.events=saved.events.filter(e=>e.time!=='11:00');await p.eval(s=>localStorage.setItem('foxmind-ui-lab-v1',JSON.stringify(s)),saved);
  assert.equal(p.consoleErrors.length,0);await p.close();
 }
}catch(e){report.failures.push(e.stack);}finally{await b.close();}
await writeFile(path.join(dir,'check.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,contrastSamples:report.contrast.reduce((n,c)=>n+c.count,0),failures:report.failures},null,2));process.exit(report.failures.length?1:0);
