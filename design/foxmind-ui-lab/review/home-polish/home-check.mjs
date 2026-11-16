import {Browser,sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const dir=path.resolve('.test-artifacts/ui-lab/home-polish');await mkdir(dir,{recursive:true});
// Reuse the previous iteration's solid-background contrast calculation without changing its threshold.
const contrastSource=await readFile(new URL('../iteration-2/contrast-check.mjs',import.meta.url),'utf8');
const contrastFn=new Function('return (()=>{'+contrastSource.split('const result=await p.eval(()=>{')[1].split('});\n report.screens.push')[0]+'})')();
const browser=await Browser.launch(),report={checks:[],screens:[],failures:[],errors:[]};
const record=(name,pass,detail)=>{report.checks.push({name,pass,detail});if(!pass)report.failures.push(name);};
const cardStyles=()=>[...document.querySelectorAll('.class-card,.class-cover,.class-body,.class-body h3,.class-bottom,.class-grid')].map(el=>{const c=getComputedStyle(el);return {cls:el.className,tag:el.tagName,...Object.fromEntries(['width','height','display','gridTemplateColumns','padding','gap','fontSize','fontWeight','backgroundColor','border','borderRadius','boxShadow','color'].map(k=>[k,c[k]]))};});
try{
 for(const width of [1440,768,390,320]){
  const p=await browser.newPage({width,height:width===1440?1000:844,reducedMotion:true});
  await p.goto(pathToFileURL(path.join(dir,'before.html')).href+'#docente/inicio',{settleMs:100});await p.eval(()=>document.fonts.ready);const baseline=await p.eval(cardStyles);
  for(const role of ['docente','estudiante']){
   await p.goto(`http://127.0.0.1:4173/?home-check=${width}-${role}#${role}/inicio`,{settleMs:100});await p.eval(()=>document.fonts.ready);
   const structure=await p.eval(()=>({h1:document.querySelectorAll('main h1').length,inHero:!!document.querySelector('.home-welcome h1'),oldHead:!!document.querySelector('main>.page-head'),overflow:document.documentElement.scrollWidth>innerWidth+1,brokenImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).length}));
   record(`${role} structure ${width}`,structure.h1===1&&structure.inHero&&!structure.oldHead&&!structure.overflow&&!structure.brokenImages,structure);
   record(`${role} classroom styling unchanged ${width}`,JSON.stringify(baseline)===JSON.stringify(await p.eval(cardStyles)));
   const contrast=await p.eval(contrastFn);report.screens.push({role,width,context:'home',...contrast});
   const screenshot=`${width}-${role}-home.png`;await p.screenshot({path:path.join(dir,screenshot),format:'png'});
  }
  await p.eval(()=>document.querySelector('[data-action="new-event"]').click());
  const bounds=await p.eval(()=>{const d=document.querySelector('dialog').getBoundingClientRect(),f=document.querySelector('.dialog-footer').getBoundingClientRect();return {x:d.x,right:d.right,top:d.top,bottom:d.bottom,height:innerHeight,width:innerWidth,footer:f.bottom,unlabelled:[...document.querySelectorAll('dialog input,dialog select,dialog textarea')].filter(el=>!el.labels.length).length};});
  record(`event form fits ${width}`,bounds.x>=0&&bounds.right<=width+1&&bounds.top>=0&&bounds.bottom<=bounds.height+1&&bounds.footer<=bounds.height+1&&!bounds.unlabelled,bounds);
  for(const color of ['blue','green','orange','rose','violet','slate']){await p.eval(key=>document.querySelector(`[name=color][value=${key}]`).click(),color);const contrast=await p.eval(contrastFn);report.screens.push({role:'estudiante',width,context:'event-'+color,...contrast});}
  await p.screenshot({path:path.join(dir,`${width}-event-form.png`),format:'png'});
  // Only this disposable test profile is changed for empty-state checks.
  await p.eval(()=>{document.querySelector('[name=title]').value='QA temporal';document.querySelector('#event-form').requestSubmit();});
  const nonEmptyState=await p.eval(()=>{const state=JSON.parse(localStorage.getItem('foxmind-ui-lab-v1'));state.events=state.events.filter(e=>e.title!=='QA temporal');return JSON.stringify(state);});
  await p.eval(()=>{const state=JSON.parse(localStorage.getItem('foxmind-ui-lab-v1'));state.reviews.forEach(r=>r.state='published');state.activities.forEach(a=>a.state='graded');localStorage.setItem('foxmind-ui-lab-v1',JSON.stringify(state));});
  for(const role of ['docente','estudiante']){await p.goto(`http://127.0.0.1:4173/?empty=${width}-${role}#${role}/inicio`,{settleMs:80});const state=await p.eval(()=>({text:document.querySelector('.home-priorities').textContent,continue:!!document.querySelector('[data-action=continue-first]'),overflow:document.documentElement.scrollWidth>innerWidth+1}));record(`${role} empty ${width}`,state.text.includes(role==='docente'?'Tus devoluciones están al día':'Un buen momento para explorar')&&!state.overflow&&(role==='docente'||!state.continue),state);}
  await p.eval(value=>localStorage.setItem('foxmind-ui-lab-v1',value),nonEmptyState);report.errors.push(...p.consoleErrors);await p.close();
 }
}catch(error){report.failures.push(error.stack);}finally{await browser.close();}
const contrastFailures=report.screens.flatMap(s=>s.failures.map(f=>({role:s.role,width:s.width,context:s.context,...f})));report.contrastFailures=contrastFailures;
await writeFile(path.join(dir,'home-check.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({checks:report.checks.length,failedChecks:report.checks.filter(c=>!c.pass),screens:report.screens.length,textSamples:report.screens.reduce((n,s)=>n+s.count,0),contrastFailures:[...new Map(contrastFailures.map(f=>[f.text+'|'+f.ratio,f])).values()],errors:report.errors,failures:report.failures},null,2));
process.exit(report.failures.length||contrastFailures.length||report.errors.length?1:0);
