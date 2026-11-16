import assert from 'node:assert/strict';
import {Browser,sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
import {writeFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';import path from 'node:path';
const b=await Browser.launch(),checks=[],errors=[];let p;
const act=(a,x='')=>p.eval(s=>document.querySelector(s).click(),`[data-action=${a}]${x}`);
const check=async(n,f)=>{assert.ok(await p.eval(f),n);checks.push(n);};
const wait=async s=>{for(let i=0;i<100;i++){if(await p.eval(s=>!!document.querySelector(s),s))return;await sleep(60);}throw Error('Missing '+s);};
const tool=async()=>{await act('fx-tray','[data-value=tools]');await act('fx-tool','[data-kind=map]');await act('fx-tool-example');};
const submit=()=>p.eval(()=>document.querySelector('#fx-tool-form').requestSubmit());
const fail=()=>p.eval(()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new DOMException('Full','QuotaExceededError');};});
const restore=()=>p.eval(()=>Storage.prototype.setItem=window.originalSet);
try{
 p=await b.newPage({width:1440,height:900,reducedMotion:true});const url=pathToFileURL(path.resolve('design/foxmind-ui-lab/01-foxmind.html')).href+'?generation#docente/foxy';await p.goto(url,{settleMs:60});
 await tool();await fail();await submit();await check('Failure to start retains brief in red form error',()=>document.querySelector('dialog').open&&document.querySelector('#fx-brief').value.length>10&&!document.querySelector('#fx-form-error').hidden);await restore();await submit();
 await act('fx-generation-stop');await sleep(2900);await check('Stop prevents late creation',()=>{const s=JSON.parse(localStorage.getItem('foxmind-ui-lab-v1'));return s.foxySpace.creations.length===0&&s.foxySpace.threads[0].generation.status==='stopped';});
 await act('fx-generation-retry');await fail();await wait('.fx-generation-notice.error');await check('Save failure is red and retains request',()=>document.querySelector('.fx-generation-notice').classList.contains('error')&&document.querySelector('.fx-message.user').textContent.includes('Prepará'));await restore();await act('fx-generation-retry');await wait('.fx-message [data-action=fx-creation]');
 await check('Retry stores only one creation and one request',()=>{const s=JSON.parse(localStorage.getItem('foxmind-ui-lab-v1'));return s.foxySpace.creations.length===1&&s.foxySpace.threads[0].messages.filter(m=>m.who==='user').length===1;});
 await tool();await submit();await act('new-chat');await sleep(2900);await check('Switching chat keeps result in original thread',()=>{const s=JSON.parse(localStorage.getItem('foxmind-ui-lab-v1'));const active=s.foxySpace.threads.find(t=>t.id===s.foxySpace.active.docente);return active.messages.length===0&&s.foxySpace.threads.some(t=>t.id!==active.id&&t.messages.filter(m=>m.creationId).length===2);});
 await tool();await submit();await p.goto(url.replace('?generation#','?generation-reloaded#'),{settleMs:60});await check('Reload shows interrupted job with retry',()=>!!document.querySelector('.fx-generation-notice')&&!document.querySelector('.fx-generation')&&!!document.querySelector('[data-action=fx-generation-retry]'));await act('fx-generation-retry');await wait('.fx-message [data-action=fx-creation]');
 await p.eval(()=>location.hash='#estudiante/estudio');await sleep(50);await tool();await submit();await p.eval(()=>location.hash='#docente/foxy');await sleep(2900);await check('Role switch preserves student creation scope',()=>{const s=JSON.parse(localStorage.getItem('foxmind-ui-lab-v1'));const c=s.foxySpace.creations[0];return c.role==='estudiante'&&c.scope.startsWith('estudiante/')&&!document.querySelector('.fx-message [data-id="'+c.id+'"]');});
 await p.setViewport({width:390,height:740});await check('Mobile uses one app header',()=>document.querySelector('.mobile-header').getClientRects().length===0&&!!document.querySelector('.fx-mobile-menu').getClientRects().length);await act('menu');await check('Mobile navigation opens with text and profile photo',()=>document.querySelector('.sidebar').classList.contains('open')&&!!document.querySelector('.account .profile-photo')&&document.querySelector('.sidebar .brand>span').getClientRects().length>0);await act('menu');
 errors.push(...p.consoleErrors);
}catch(e){errors.push(e.stack);}finally{await b.close();}
await writeFile('.test-artifacts/ui-lab/foxy-focus/generation.json',JSON.stringify({checks,errors},null,2));console.log({checks:checks.length,errors});process.exit(errors.length?1:0);
