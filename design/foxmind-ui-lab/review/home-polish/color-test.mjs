import {Browser,sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
const out=path.resolve('.test-artifacts/ui-lab/home-polish');await mkdir(out,{recursive:true});
const b=await Browser.launch(),checks=[];let failure;
try{const p=await b.newPage({width:1440,height:1000,reducedMotion:true});await p.goto('http://127.0.0.1:4173/?color-test#docente/inicio',{settleMs:80});
 await p.eval(()=>document.querySelector('[data-action="new-event"]').click());
 assert.equal(await p.eval(()=>document.querySelectorAll('input[name="color"]').length),6,'Event form must offer six named color choices');checks.push('six named choices');
 await p.eval(()=>{const title=document.querySelector('[name="title"]');title.value='Lectura de prueba';document.querySelector('[name=time]').value='08:00';document.querySelector('[name=end]').value='08:30';title.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[name="color"][value="violet"]').click();});
 assert.equal(await p.eval(()=>document.querySelector('.event-color-preview').dataset.color),'violet');checks.push('live preview reflects selection');
 await p.eval(()=>document.querySelector('#event-form').requestSubmit());await sleep(70);
 let saved=await p.eval(()=>JSON.parse(localStorage.getItem('foxmind-ui-lab-v1')).events.find(e=>e.title==='Lectura de prueba'));assert.equal(saved.color,'violet');checks.push('saved color');
 assert.equal(await p.eval(id=>document.querySelector(`.today-widget [data-id="${id}"]`)?.classList.contains('event-violet'),saved.id),true);checks.push('home color');
 await p.goto('http://127.0.0.1:4173/?color-reload#docente/agenda',{settleMs:80});
 assert.equal(await p.eval(()=>[...document.querySelectorAll('.cell-event.event-violet')].some(e=>e.textContent.includes('Lectura de prueba'))),true);checks.push('month color after reload');
 for(const view of ['week','day']){await p.eval(v=>document.querySelector(`[data-action="calendar-view"][data-value="${v}"]`).click(),view);assert.equal(await p.eval(id=>[...document.querySelectorAll(`.calendar [data-id="${id}"]`)].some(e=>e.classList.contains('event-violet')),saved.id),true);checks.push(view+' color');}
 await p.eval(id=>document.querySelector(`.calendar [data-id="${id}"]`).click(),saved.id);await p.eval(()=>document.querySelector('[data-action="edit-event"]').click());
 assert.equal(await p.eval(()=>document.querySelector('[name="color"]:checked').value),'violet');checks.push('edit preserves selection');
 await p.eval(()=>{document.querySelector('[name="color"][value="rose"]').click();document.querySelector('#event-form').requestSubmit();});await sleep(60);
 saved=await p.eval(()=>JSON.parse(localStorage.getItem('foxmind-ui-lab-v1')).events.find(e=>e.title==='Lectura de prueba'));assert.equal(saved.color,'rose');assert.equal(saved.type,'Personal');checks.push('edit color independent of type');
 assert.equal(p.consoleErrors.length,0);checks.push('no runtime exception');
}catch(error){failure=error.message;}finally{await b.close();}
const result={checks,failure:failure||null};await writeFile(path.join(out,'color-test.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(failure)process.exitCode=1;
