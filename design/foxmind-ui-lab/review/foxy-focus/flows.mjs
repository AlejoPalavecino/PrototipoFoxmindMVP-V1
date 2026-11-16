import assert from 'node:assert/strict';
import {Browser,sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
import {writeFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';import path from 'node:path';
const b=await Browser.launch(),checks=[],errors=[];let p;
const act=(name,extra='')=>p.eval(s=>{const e=document.querySelector(s);assertUI(e&&e.getClientRects().length,'Visible action '+s);e.focus();e.click();function assertUI(v,m){if(!v)throw Error(m);}},`[data-action="${name}"]${extra}`);
const fill=(s,v)=>p.eval(({s,v})=>{const e=document.querySelector(s);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},{s,v});
const check=async(name,test)=>{assert.ok(await p.eval(test),name);checks.push(name);};
async function wait(s){for(let i=0;i<60;i++){if(await p.eval(s=>!!document.querySelector(s),s))return;await sleep(60);}throw Error('Missing '+s);}
async function key(key,code){await p.send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:key==='Tab'?9:27});await p.send('Input.dispatchKeyEvent',{type:'keyUp',key,code});}
try{
 p=await b.newPage({width:1440,height:900,reducedMotion:true});await p.goto(pathToFileURL(path.resolve('design/foxmind-ui-lab/01-foxmind.html')).href+'?focus-test#docente/foxy',{settleMs:40});
 await check('No permanent history or tool columns',()=>![...document.querySelectorAll('.fx-history,.fx-tools')].some(e=>e.getClientRects().length));
 await check('Chat is at least 1000px wide at desktop',()=>document.querySelector('.fx-conversation').getBoundingClientRect().width>=1000);
 await fill('#fx-message','Una idea antes de elegir el contexto');await act('fx-tray','[data-value=history]');await check('History opens as a modal panel',()=>document.querySelector('dialog.fx-tray-dialog')?.open);
 let trapped=true;for(let i=0;i<12;i++){await key('Tab','Tab');trapped&&=await p.eval(()=>!!document.activeElement.closest('dialog'));}assert.ok(trapped);checks.push('Keyboard focus stays in panel');
 await key('Escape','Escape');await check('Escape returns to history trigger without losing draft',()=>!document.querySelector('dialog').open&&document.activeElement.dataset.value==='history'&&document.querySelector('#fx-message').value.includes('Una idea'));
 await act('fx-context');await check('General explains its boundary',()=>document.querySelector('.fx-context-preview').textContent.includes('no usa información de tus aulas'));
 await act('fx-context-mode','[data-value=classroom]');await act('fx-context-class','[data-id=photo]');await check('Classroom shows all three context groups',()=>document.querySelectorAll('.fx-context-counts>button').length===3&&document.querySelector('.fx-context-preview').textContent.includes('contexto vigente'));
 await act('fx-context-section','[data-value=activities]');await check('Classroom activity titles are visible',()=>document.querySelector('.fx-context-items').textContent.includes('Descubriendo'));
 await act('fx-context-apply');await check('Context applied and unsent idea carried to new chat',()=>document.querySelector('.fx-context-strip').textContent.includes('Fotografía')&&document.querySelector('#fx-message').value.includes('Una idea'));
 await p.eval(()=>document.querySelector('.fx-composer').requestSubmit());await wait('.fx-thinking');for(let i=0;i<50;i++){if(await p.eval(()=>document.querySelectorAll('.fx-message').length===2))break;await sleep(50);}
 await check('Sent message snapshots plan, materials and activities',()=>{const s=JSON.parse(localStorage.getItem('foxmind-ui-lab-v1')),t=s.foxySpace.threads.find(t=>t.id===s.foxySpace.active.docente),c=t.messages[0].context;return c.kind==='classroom'&&c.topicIds.length>=8&&c.sourceIds.length>=1&&c.activityIds.length>=1;});
 await act('fx-tray','[data-value=history]');await fill('#fx-history-search','imposiblexyz');await check('History search gives actionable empty state',()=>document.querySelector('#fx-tray-content').textContent.includes('No encontramos'));await fill('#fx-history-search','');await act('fx-thread');await check('Selecting a conversation closes the panel',()=>!document.querySelector('dialog').open);
 await act('fx-tray','[data-value=tools]');await act('fx-tool','[data-kind=notes]');await check('Tool inherits classroom topics',()=>document.querySelectorAll('[name=fx-tool-topic]:checked').length>=8);await fill('#fx-brief','Un apunte para explorar luz y exposición');await p.eval(()=>document.querySelector('#fx-tool-form').requestSubmit());await wait('.fx-message [data-action=fx-creation]');await act('fx-creation');await wait('.fx-reader');await act('fx-close');
 await act('fx-tray','[data-value=creations]');await act('fx-creation');await act('fx-share');await check('Direct classroom publication remains available',()=>!!document.querySelector('[data-action=fx-share-confirm]'));await act('close');
 await p.eval(()=>location.hash='#estudiante/estudio');await sleep(40);await check('Student context identifies current folder',()=>document.querySelector('.fx-context-strip').textContent.includes('carpeta'));
 await act('fx-context');await check('Student context can optionally link an available classroom',()=>!!document.querySelector('[data-action=fx-context-mode]')&&document.querySelector('.fx-context-preview').textContent.includes('Mi rincón'));await act('close');
 await act('fx-tray','[data-value=tools]');await check('Student tools expose study plan only in panel',()=>!!document.querySelector('#fx-tray-content [data-kind=study-plan]')&&!document.querySelector('[data-kind=activity]'));
 await act('fx-tool','[data-kind=study-plan]');await check('Study plan flow still opens',()=>!!document.querySelector('#fx-plan-form'));await act('close');
 errors.push(...p.consoleErrors);
}catch(e){errors.push(e.stack);}finally{await b.close();}
await writeFile('.test-artifacts/ui-lab/foxy-focus/flows.json',JSON.stringify({checks,errors},null,2));console.log({checks:checks.length,errors});process.exit(errors.length?1:0);
