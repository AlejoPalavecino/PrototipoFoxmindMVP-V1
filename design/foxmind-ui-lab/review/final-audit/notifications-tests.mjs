// Canonical URLs now contain resource identity; compare pathname while retaining resource/state assertions.
import assert from 'node:assert/strict';import {Browser,sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';import {writeFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';import path from 'node:path';
const b=await Browser.launch(),checks=[],errors=[];let p;const url=pathToFileURL(path.resolve('design/foxmind-ui-lab/01-foxmind.html')).href;
const act=(a,x='')=>p.eval(s=>{const e=document.querySelector(s);e.focus();e.click();},`[data-action=${a}]${x}`);
const check=async(n,f)=>{assert.ok(await p.eval(f),n);checks.push(n);};
const route=async r=>{await p.eval(r=>location.hash=r,r);await sleep(50);};
const fail=()=>p.eval(()=>{window.goodSet=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new DOMException('Full','QuotaExceededError');};}),restore=()=>p.eval(()=>Storage.prototype.setItem=window.goodSet);
try{
 p=await b.newPage({width:1440,height:900,reducedMotion:true});await p.goto(url+'?notices#docente/avisos',{settleMs:40});
 await check('Inbox has state and type filters',()=>!!document.querySelector('[data-action=nt-read-filter]')&&!!document.querySelector('[data-action=nt-kind-filter]'));
 await check('Count agrees with visible unread items',()=>document.querySelector('[data-notice-count]').textContent==String(document.querySelectorAll('.nt-row.unread').length));
 await act('nt-toggle','[data-id=delivery-r1]');await check('Individual reading persists and retains focus',()=>JSON.parse(localStorage.getItem('foxmind-ui-lab-v1')).noticeCenter.read.docente['delivery-r1']&&document.activeElement.dataset.id==='delivery-r1');
 await act('nt-read-filter','[data-value=unread]');await check('Unread filter hides read rows',()=>!document.querySelector('[data-notice-id=delivery-r1]')&&document.querySelectorAll('.nt-row.read').length===0);
 await act('nt-read-all');await check('All-read empty state is useful and accessible',()=>!!document.querySelector('.nt-empty [data-action=nt-reset]')&&!document.querySelector('[data-notice-count]')&&document.activeElement.dataset.action==='nt-read-filter');
 await route('#estudiante/avisos');await check('Reading states are separate by role',()=>document.querySelectorAll('.nt-row.unread').length===2);
 await act('nt-open','[data-id=grade-contrast]');await sleep(50);await check('Feedback opens its own published result',()=>location.hash.split('?')[0]==='#estudiante/resultado'&&JSON.parse(localStorage.getItem('foxmind-ui-lab-v1')).currentActivityId==='contrast');
 await route('#estudiante/avisos');await act('nt-open','[data-id=invite-creative]');await check('Opening invitation does not enroll',()=>document.querySelector('dialog').open&&!!document.querySelector('[data-action=confirm-join]')&&!JSON.parse(localStorage.getItem('foxmind-ui-lab-v1')).classes.some(c=>c.id==='creative'));await act('close');
 await act('nt-kind-filter','[data-value=agenda]');await check('Type filter isolates agenda',()=>document.querySelectorAll('.nt-row').length===1&&document.querySelector('.nt-row').textContent.includes('repaso'));
 await act('nt-open','[data-id=event-3]');await check('Event opens its own detail',()=>document.querySelector('dialog').open&&document.querySelector('dialog').textContent.includes('Repaso de exposición'));await act('close');
 await act('nt-reset').catch(async()=>act('nt-kind-filter','[data-value=all]'));
 await act('nt-toggle','[data-id=grade-contrast]');await fail();await act('nt-toggle','[data-id=grade-contrast]');await check('Failed read rolls back and reports red error',()=>document.querySelector('[data-notice-id=grade-contrast]').classList.contains('unread')&&document.querySelector('#toast').dataset.tone==='error');
 await act('nt-open','[data-id=grade-contrast]');await check('Failed open does not leave inbox or consume read state',()=>location.hash.split('?')[0]==='#estudiante/avisos'&&document.querySelector('[data-notice-id=grade-contrast]').classList.contains('unread'));await restore();
 await p.eval(()=>{const s=JSON.parse(localStorage.getItem('foxmind-ui-lab-v1'));s.classes.find(c=>c.id==='photo').roster=[];localStorage.setItem('foxmind-ui-lab-v1',JSON.stringify(s));});await p.goto(url+'?notices-revoked#estudiante/avisos',{settleMs:40});
 await act('nt-open','[data-id=grade-contrast]');await check('Missing access keeps inbox and unread with recoverable red state',()=>location.hash.split('?')[0]==='#estudiante/avisos'&&!!document.querySelector('dialog .notice.error')&&document.querySelector('[data-notice-id=grade-contrast]').classList.contains('unread'));await act('close');
 await route('#docente/avisos');await act('nt-read-filter','[data-value=all]');await act('nt-open','[data-id=delivery-r1]');await sleep(40);await check('Teacher opens the correct delivery',()=>location.hash.split('?')[0]==='#docente/corregir'&&JSON.parse(localStorage.getItem('foxmind-ui-lab-v1')).currentReviewId==='r1');
 await p.eval(()=>{const s=JSON.parse(localStorage.getItem('foxmind-ui-lab-v1'));s.reviews.push({id:'new-demo',name:'Marina',title:'Entrega nueva',classId:'bio',state:'pending',received:'Ahora'});localStorage.setItem('foxmind-ui-lab-v1',JSON.stringify(s));});await p.goto(url+'?notices-new#docente/avisos',{settleMs:40});await check('New delivery appears unread',()=>!!document.querySelector('[data-notice-id=delivery-new-demo].unread'));
 errors.push(...p.consoleErrors);
}catch(e){errors.push(e.stack);}finally{await b.close();}
await writeFile('.test-artifacts/ui-lab/final-audit/adapted/account-notifications/notifications.json',JSON.stringify({checks,errors},null,2));console.log({checks:checks.length,errors});process.exit(errors.length?1:0);
