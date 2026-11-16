import assert from 'node:assert/strict';import {Browser,sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';import {writeFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';import path from 'node:path';
const b=await Browser.launch(),checks=[],errors=[];let p;const url=pathToFileURL(path.resolve('design/foxmind-ui-lab/01-foxmind.html')).href;
const act=(a,x='')=>p.eval(s=>document.querySelector(s).click(),`[data-action=${a}]${x}`);
const check=async(name,fn)=>checks.push({name,pass:!!(await p.eval(fn))});
const route=async r=>{await p.eval(r=>location.hash=r,r);await sleep(50);};
try{
 p=await b.newPage({width:1440,height:900,reducedMotion:true});await p.goto(url+'?notice-transitions#estudiante/aula/muro',{settleMs:40});await act('new-post');
 await p.eval(()=>{const f=document.querySelector('form[data-form=post]');f.elements.title.value='Mi consulta sintética';f.elements.body.value='¿Podemos usar una fotografía propia?';f.requestSubmit();});await route('#estudiante/avisos');
 await check('Student post never becomes a teacher announcement',()=>!document.querySelector('[data-notice-id=wall-photo]').textContent.includes('Mi consulta sintética'));
 await act('nt-open','[data-id=invite-creative]');await act('confirm-join');await sleep(40);await route('#estudiante/avisos');
 await check('Accepted invitation has a current action',()=>document.querySelector('[data-action=nt-open][data-id=invite-creative]').textContent.includes('Entrar al aula'));
 await act('nt-open','[data-id=invite-creative]');await sleep(40);await check('Accepted invitation opens joined classroom',()=>location.hash==='#estudiante/aula/plan'&&JSON.parse(localStorage.getItem('foxmind-ui-lab-v1')).selectedClass==='creative');
 await route('#docente/aulas');await p.eval(()=>document.querySelector('[data-class=photo]').click());await sleep(40);await route('#docente/aula/ajustes');await act('archive-class');await act('confirm-archive');await sleep(40);await route('#docente/avisos');await act('nt-open','[data-id=member-photo]');await sleep(40);
 await check('Teacher can consult members of archived classroom',()=>location.hash==='#docente/aula/integrantes'&&!document.querySelector('dialog').open);
 errors.push(...p.consoleErrors);
}catch(e){errors.push(e.stack);}finally{await b.close();}
await writeFile('.test-artifacts/ui-lab/account-notifications/transitions.json',JSON.stringify({checks,errors},null,2));console.log({checks:checks.length,failures:checks.filter(c=>!c.pass),errors});process.exit(errors.length||checks.some(c=>!c.pass)?1:0);
