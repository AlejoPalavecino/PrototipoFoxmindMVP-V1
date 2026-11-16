import {Browser,sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
import {writeFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';import path from 'node:path';
const out=path.resolve('.test-artifacts/ui-lab/participation-polish'),url=pathToFileURL(path.resolve('design/foxmind-ui-lab/01-foxmind.html')).href;
const browser=await Browser.launch(),report={checks:[],layouts:[],keyboard:[],errors:[]};let p;
const check=(name,pass)=>report.checks.push({name,pass:!!pass});
async function click(s){await p.eval(s=>document.querySelector(s).click(),s);await sleep(40);}
try{p=await browser.newPage({width:1440,height:706,reducedMotion:true});await p.goto(url+'?edges#estudiante/actividad',{settleMs:60});
 check('All three options visible at 1440 by 706',await p.eval(()=>document.querySelector('.student-options label:last-child').getBoundingClientRect().bottom<document.querySelector('.focus-footer').getBoundingClientRect().top));
 for(const width of [1440,390,320])for(const mode of ['normal','long'])for(const route of ['estudiante/actividad','docente/corregir']){
  await p.setViewport({width,height:706});await p.eval(h=>location.hash=h,'#'+route);await sleep(40);
  if(mode==='long')await p.eval(()=>{for(const e of document.querySelectorAll('.student-question h2,.student-options label span,.grading-workspace h1,.grade-criteria label b,.review-work>.learning-instructions'))e.textContent+=' '+('Una explicación extensa para relacionar los ejemplos con lo que aprendimos. ').repeat(10);});
  await p.eval(()=>window.scrollTo(0,document.documentElement.scrollHeight));await sleep(40);
  report.layouts.push({width,mode,route,...await p.eval(()=>{const f=document.querySelector('.focus-footer')?.getBoundingClientRect(),box=document.querySelector('.student-question,.review-editor')?.getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth+1,contentBehindFooter:!!(f&&box&&box.bottom>f.top+1),footerOutside:!!f&&f.bottom>innerHeight+1};})});
 }
 await p.setViewport({width:1440,height:706});await p.eval(()=>location.hash='#docente/crear');await sleep(40);
 await click('[data-compose=method][value=ai]');await p.eval(()=>{document.querySelector('[data-compose=topic]').focus();});
 for(let i=0;i<24;i++){await p.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await sleep(35);report.keyboard.push(await p.eval(()=>{const e=document.activeElement,r=e.getBoundingClientRect(),f=document.querySelector('.focus-footer')?.getBoundingClientRect();return {id:e.id||e.dataset.action||e.name,covered:!!(e.closest('main')&&f&&r.bottom>f.top+1)};}));}
 check('Author keyboard fields remain above fixed footer',!report.keyboard.some(x=>x.covered));
 await p.eval(()=>location.hash='#docente/corregir');await sleep(40);await p.eval(()=>document.querySelector('#grading-tab-rubric').focus());await p.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});check('Grading tabs support arrow navigation',await p.eval(()=>document.activeElement.id==='grading-tab-feedback'&&!document.querySelector('#grading-panel-feedback').hidden));
 await p.eval(()=>location.hash='#docente/agenda');await sleep(40);await click('[data-action=new-event]');await p.eval(()=>{document.querySelector('#f-title').value='Evento de prueba';window.original=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('Synthetic quota');};document.querySelector('#event-form').requestSubmit();});check('Failed event save stays open with red error',await p.eval(()=>document.querySelector('#dialog').open&&document.querySelector('#toast').dataset.tone==='error'));await p.eval(()=>Storage.prototype.setItem=window.original);report.consoleErrors=p.consoleErrors;
}catch(e){report.errors.push(e.stack);}finally{await browser.close();}
await writeFile(path.join(out,'edge-layout.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));process.exit(report.errors.length||report.checks.some(c=>!c.pass)||report.layouts.some(c=>c.overflow||c.contentBehindFooter||c.footerOutside)||report.consoleErrors?.length?1:0);
