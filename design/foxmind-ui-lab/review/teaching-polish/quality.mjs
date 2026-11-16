import {Browser,sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const out=path.resolve('.test-artifacts/ui-lab/teaching-polish'),url=pathToFileURL(path.resolve('design/foxmind-ui-lab/01-foxmind.html')).href;
const before=pathToFileURL(path.join(out,'before.html')).href;
const b=await Browser.launch(),report={checks:[],keyboard:[],errors:[]};let p;
const check=(name,pass,detail)=>report.checks.push({name,pass:!!pass,detail});
const click=async s=>{await p.eval(s=>{const el=document.querySelector(s);if(!el)throw Error('Missing '+s);el.focus();el.click();},s);await sleep(45);};
const act=a=>click(`[data-action="${a}"]`);
const snapshot=()=>{
 return [...document.querySelectorAll('#main *')].map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {tag:e.tagName,cls:typeof e.className==='string'?e.className:'',text:[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(''),size:[r.x,r.y,r.width,r.height].map(n=>Math.round(n*100)/100),color:s.color,background:s.backgroundColor,border:s.border,font:s.font,padding:s.padding,gap:s.gap,display:s.display};});
};
try{
 const old=await b.newPage({width:1440,height:1000,reducedMotion:true});p=await b.newPage({width:1440,height:1000,reducedMotion:true});
 for(const width of [1440,768,390,320]){
  await old.setViewport({width,height:1000});await p.setViewport({width,height:1000});
  for(const role of ['docente','estudiante'])for(const view of ['inicio','aulas']){
   await old.goto(before+`?preserve=${width}-${role}-${view}#${role}/${view}`,{settleMs:40});await p.goto(url+`?preserve=${width}-${role}-${view}#${role}/${view}`,{settleMs:40});await old.eval(()=>document.fonts.ready);await p.eval(()=>document.fonts.ready);
   const a=await old.eval(snapshot),c=await p.eval(snapshot);check(`Preserve ${width} ${role}/${view}`,JSON.stringify(a)===JSON.stringify(c));
  }
 }
 await old.close();await p.setViewport({width:1440,height:706});
 await p.eval(()=>location.hash='#docente/aulas');await sleep(50);await act('new-class');check('Timezone visible without expansion',await p.eval(()=>!!document.querySelector('.class-zone-info')&&getComputedStyle(document.querySelector('.class-zone-info')).display!=='none'&&!document.querySelector('details')));await act('close');
 await p.eval(()=>location.hash='#docente/aula/actividades');await sleep(50);await act('new-activity');
 for(let i=0;i<27;i++){
  await p.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await sleep(30);
  const v=await p.eval(()=>{const e=document.activeElement,r=e.getBoundingClientRect(),f=document.querySelector('.focus-footer')?.getBoundingClientRect(),h=document.querySelector('.focus-header')?.getBoundingClientRect();return {name:e.getAttribute('aria-label')||e.textContent.slice(0,40)||e.outerHTML.slice(0,100),inMain:!!e.closest('main'),y:r.y,bottom:r.bottom,footer:f?.top,header:h?.bottom,covered:!!(e.closest('main')&&((r.bottom>(f?.top||innerHeight)+1)||(r.y<(h?.bottom||0)-1)))};});report.keyboard.push(v);
 }
 check('Keyboard focus remains above fixed footer',!report.keyboard.some(k=>k.covered));
 await click('[data-compose=topic][value="photo-u0-t0"]');await click('[data-compose=type][value="Cuestionario"]');await click('[data-compose=method][value="ai"]');await act('tour');await act('demo-error');await sleep(1900);check('AI error keeps scope and offers retry',await p.eval(()=>document.querySelector('dialog').textContent.includes('Tus temas y tus cambios siguen acá')&&!!document.querySelector('[data-action=compose-generate]')));await act('compose-generate');await sleep(1900);await click('[data-action=compose-tab][data-tab=preguntas]');check('AI quiz retry produces editable questions',await p.eval(()=>document.querySelectorAll('[data-compose=question-title]').length===1));
 await act('compose-save');await act('leave-focus');await sleep(50);await act('new-activity');await click('[data-compose=topic][value="photo-u0-t0"]');await click('[data-compose=type][value="Trabajo práctico"]');await click('[data-compose=method][value="ai"]');await act('compose-next');await sleep(1900);await click('[data-action=compose-tab][data-tab=rubrica]');check('AI TP produces rubric and no questionnaire',await p.eval(()=>!!document.querySelector('[data-compose=rubric-title]')&&!document.querySelector('[data-compose=question-title]')));await act('compose-save');await act('leave-focus');await sleep(50);await act('new-activity');await click('[data-compose=topic][value="photo-u0-t0"]');await click('[data-compose=type][value="Evaluación"]');await click('[data-compose=method][value="manual"]');await act('compose-next');check('Manual evaluation starts with blank title',await p.eval(()=>document.querySelector('#compose-title').value===''));await click('[data-action=compose-tab][data-tab=preguntas]');check('Manual evaluation opens blank question editor',await p.eval(()=>!!document.querySelector('[data-action=compose-add-question]')));
 await act('leave-focus');check('Dirty author exit requires decision',await p.eval(()=>document.querySelector('dialog').open&&!!document.querySelector('[data-action=compose-save-exit]')));
 const focused=[];for(let i=0;i<12;i++){await p.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});focused.push(await p.eval(()=>!!document.activeElement.closest('dialog')));}check('Dialog traps keyboard focus',focused.every(Boolean));await p.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await sleep(40);check('Escape closes and restores trigger focus',await p.eval(()=>!document.querySelector('dialog').open&&document.activeElement.dataset.action==='leave-focus'));
 const html=await readFile(path.resolve('design/foxmind-ui-lab/01-foxmind.html'),'utf8');let parsed=0;for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)){new Function(m[1]);parsed++;}check('Embedded scripts parse',parsed===2);check('Standalone assets embedded',!/<script[^>]+src=|<link[^>]+stylesheet|(?:src|href)="https?:/.test(html));check('No disclosures in final HTML',!/<details\b|<summary\b/.test(html));report.consoleErrors=p.consoleErrors;
}catch(e){report.errors.push(e.stack);console.error(e.stack);}finally{await b.close();}
await writeFile(path.join(out,'quality.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,failed:report.checks.filter(c=>!c.pass),keyboardCovered:report.keyboard.filter(k=>k.covered),errors:report.errors,consoleErrors:report.consoleErrors}));process.exit(report.checks.some(c=>!c.pass)||report.errors.length||report.consoleErrors?.length?1:0);
