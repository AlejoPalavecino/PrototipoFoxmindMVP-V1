import assert from 'node:assert/strict';
import {Browser,sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
import {writeFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';import path from 'node:path';
const b=await Browser.launch(),checks=[],errors=[];let p;
const url=pathToFileURL(path.resolve('design/foxmind-ui-lab/01-foxmind.html')).href;
const act=(a,x='')=>p.eval(s=>{const e=document.querySelector(s);e.focus();e.click();},`[data-action=${a}]${x}`);
const check=async(name,fn)=>checks.push({name,pass:!!(await p.eval(fn))});
const wait=async s=>{for(let i=0;i<100;i++){if(await p.eval(s=>!!document.querySelector(s),s))return;await sleep(50);}throw Error('Missing '+s);};
try{
 p=await b.newPage({width:1440,height:900,reducedMotion:true});await p.goto(url+'?library-regressions#docente/foxy',{settleMs:40});
 await act('fx-attach');await act('fx-file-example');await p.eval(()=>document.querySelector('#fx-attach-form').requestSubmit());
 await p.eval(()=>document.querySelector('[data-action=fx-library-remove]').focus());await wait('[data-status=ready]');
 await check('Preparation preserves focused remove action',()=>document.activeElement.matches('[data-action=fx-library-remove]'));
 await act('fx-library-filter','[data-value=private]');await check('Filter keeps keyboard focus after rerender',()=>document.activeElement.matches('[data-action=fx-library-filter][data-value=private]'));
 await act('fx-tray-close');await p.eval(()=>location.hash='#estudiante/estudio');await sleep(40);await p.eval(()=>history.back());await sleep(50);await act('fx-library');await p.eval(()=>history.forward());await sleep(50);
 await check('History navigation closes private panel from previous role',()=>location.hash==='#estudiante/estudio'&&!document.querySelector('dialog').open);
 await p.eval(()=>{const s=JSON.parse(localStorage.getItem('foxmind-ui-lab-v1'));s.classes.find(c=>c.id==='photo').name='Fotografía <em>y luz</em>';s.folders[0].linkedClassId='photo';s.selectedFolder=0;localStorage.setItem('foxmind-ui-lab-v1',JSON.stringify(s));});await p.goto(url+'?library-regressions-name#estudiante/estudio',{settleMs:40});
 await check('Classroom name is literal text in accessible hint',()=>!document.querySelector('#fx-context-hint em')&&document.querySelector('#fx-context-hint').textContent.includes('<em>y luz</em>'));
 await p.eval(()=>{const s=JSON.parse(localStorage.getItem('foxmind-ui-lab-v1'));s.classArchived.push('photo');s.foxySpace.threads.find(t=>t.role==='docente').context.classId='photo';localStorage.setItem('foxmind-ui-lab-v1',JSON.stringify(s));});await p.goto(url+'?library-regressions-archived#docente/foxy',{settleMs:40});
 await p.eval(()=>{const e=document.querySelector('#fx-message');e.value='Explicame esta idea';e.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('.fx-composer').requestSubmit();});await sleep(1650);
 await check('New reply excludes archived classroom subject',()=>!document.querySelector('.fx-message:not(.user)').textContent.includes('sobre Fotografía'));
 await act('fx-tray','[data-value=tools]');await act('fx-tool','[data-kind=notes]');await check('New tool uses only available context',()=>!document.querySelector('.fx-scope-banner').textContent.includes('Fotografía')&&!document.querySelector('[name=fx-tool-topic]'));
 errors.push(...p.consoleErrors);
}catch(e){errors.push(e.stack);}finally{await b.close();}
await writeFile('.test-artifacts/ui-lab/context-library/regressions.json',JSON.stringify({checks,errors},null,2));console.log({checks:checks.length,failures:checks.filter(c=>!c.pass),errors});process.exit(errors.length||checks.some(c=>!c.pass)?1:0);
