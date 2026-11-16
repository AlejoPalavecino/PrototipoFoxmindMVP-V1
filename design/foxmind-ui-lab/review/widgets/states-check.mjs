import {Browser,sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const dir=path.resolve('.test-artifacts/ui-lab/widgets');await mkdir(dir,{recursive:true});
const browser=await Browser.launch(),checks=[];let failure;
try{
 const p=await browser.newPage({width:1440,height:1000,reducedMotion:true});await p.goto('http://127.0.0.1:4173/?widget-test#docente/inicio',{settleMs:80});
 assert.equal(await p.eval(()=>[...document.querySelectorAll('.review-group')].map(g=>g.querySelectorAll('[data-action=review]').length).join(',')),'2,1');checks.push('all three deliveries grouped by work');
 for(const [id,name] of [['r1','Marina'],['r2','Tomás'],['r3','Sofía']]){await p.eval(id=>document.querySelector(`[data-action=review][data-id=${id}]`).click(),id);await sleep(50);assert.ok((await p.eval(()=>document.querySelector('h1').textContent)).includes(name));await p.eval(()=>location.hash='#docente/inicio');await sleep(50);}checks.push('each delivery opens the correct student');
 await p.eval(()=>window.scrollTo(0,200));await p.eval(()=>document.querySelector('[data-action=home-queries]').click());assert.equal(await p.eval(()=>document.activeElement.dataset.action),'home-queries');assert.equal(await p.eval(()=>scrollY),200);checks.push('tab preserves scroll and keyboard focus');await p.eval(()=>document.querySelector('[data-action=home-reviews]').click());
 await p.eval(()=>document.querySelector('[data-action=new-event]').click());await p.eval(()=>{document.querySelector('[name=title]').value='QA widget';document.querySelector('#event-form').requestSubmit();});
 await p.eval(()=>{const s=JSON.parse(localStorage.getItem('foxmind-ui-lab-v1'));s.reviews[0].state='saved';s.reviewDraft.r1={grade:'8',feedback:'Devolución de prueba'};s.answers.light={0:'1'};s.activities.find(a=>a.id==='life').state='graded';localStorage.setItem('foxmind-ui-lab-v1',JSON.stringify(s));});
 await p.goto('http://127.0.0.1:4173/?saved#docente/inicio',{settleMs:60});assert.ok((await p.eval(()=>document.querySelector('[data-id=r1][data-action=review]').textContent)).includes('Devolución guardada · privada'));checks.push('private saved feedback remains visible');
 await p.screenshot({path:path.join(dir,'teacher-saved.png'),format:'png'});
 for(const width of [1440,768,390,320]){await p.setViewport({width,height:1000});await p.goto(`http://127.0.0.1:4173/?single=${width}#estudiante/inicio`,{settleMs:60});
  assert.equal(await p.eval(()=>document.querySelectorAll('.learning-tile').length),1);assert.ok((await p.eval(()=>document.querySelector('.learning-state').textContent)).includes('Borrador guardado'));
  assert.equal(await p.eval(()=>{const d=document.querySelector('.learning-deck').getBoundingClientRect(),c=document.querySelector('.learning-tile').getBoundingClientRect();return Math.abs(c.width-d.width)<2&&document.documentElement.scrollWidth<=innerWidth+1;}),true);checks.push(`single activity fills widget at ${width}`);
  await p.screenshot({path:path.join(dir,`${width}-single-draft.png`),format:'png'});
 }
 await p.eval(()=>document.querySelector('.learning-tile [data-action=open-activity]').click());await sleep(50);assert.equal(await p.eval(()=>document.querySelector('h1').textContent),'Descubriendo la luz');checks.push('saved activity opens its own workspace');
 assert.equal(p.consoleErrors.length,0);checks.push('no runtime errors');
}catch(error){failure=error.stack;}finally{await browser.close();}
await writeFile(path.join(dir,'states.json'),JSON.stringify({checks,failure:failure||null},null,2));console.log(JSON.stringify({checks,failure:failure||null},null,2));process.exit(failure?1:0);
