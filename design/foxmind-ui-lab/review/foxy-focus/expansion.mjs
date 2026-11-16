import assert from 'node:assert/strict';
import {Browser,sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
import {writeFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';import path from 'node:path';
const b=await Browser.launch(),checks=[],errors=[];let p;
const click=s=>p.eval(s=>document.querySelector(s).click(),s);
const fill=(s,v)=>p.eval(({s,v})=>{const e=document.querySelector(s);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},{s,v});
const check=async(n,f)=>{assert.ok(await p.eval(f),n);checks.push(n);};
const wait=async s=>{for(let i=0;i<100;i++){if(await p.eval(s=>!!document.querySelector(s),s))return;await sleep(60);}throw Error('Missing '+s);};
try{
 p=await b.newPage({width:1440,height:900,reducedMotion:true});await p.goto(pathToFileURL(path.resolve('design/foxmind-ui-lab/01-foxmind.html')).href+'?expansion#docente/foxy',{settleMs:80});
 await check('First chat opens with compact navigation',()=>document.querySelector('#app').classList.contains('nav-compact'));
 await check('Chat uses nearly all remaining width and height',()=>{const c=document.querySelector('.fx-conversation').getBoundingClientRect();return c.width>1300&&c.height>770;});
 await fill('#fx-message','Un borrador que no se pierde');await click('[data-action=nav-toggle]');
 await check('Expand preserves draft and updates accessible state',()=>document.querySelector('#fx-message').value==='Un borrador que no se pierde'&&document.querySelector('[data-action=nav-toggle]').getAttribute('aria-expanded')==='true');
 await p.goto(pathToFileURL(path.resolve('design/foxmind-ui-lab/01-foxmind.html')).href+'?expansion-reloaded#docente/foxy',{settleMs:80});
 await check('Navigation preference survives reload',()=>!document.querySelector('#app').classList.contains('nav-compact'));
 await click('[data-action=nav-toggle]');
 await check('Compact navigation uses icons and photo, with accessible names',()=>{const links=[...document.querySelectorAll('.sidebar .nav-group a')];return links.every(e=>e.getAttribute('aria-label')&&e.querySelector('svg'))&&!!document.querySelector('.account img.profile-photo');});
 await fill('#fx-message','Explicá la luz con un ejemplo');await p.eval(()=>document.querySelector('[data-form=fx-chat]').requestSubmit());await sleep(1700);
 await check('Every message has the correct avatar',()=>[...document.querySelectorAll('.fx-message')].every(e=>!!e.querySelector(e.classList.contains('user')?'img.profile-photo':'img.fx-foxy-avatar')));
 await click('[data-action=fx-tray][data-value=tools]');await click('[data-action=fx-tool][data-kind=map]');await fill('#fx-brief','Un esquema de la luz y sus relaciones');await p.eval(()=>document.querySelector('#fx-tool-form').requestSubmit());
 await check('Generation stays in chat without blocking modal',()=>!document.querySelector('dialog').open&&!!document.querySelector('.fx-generation[role=status]'));
 const phases=[];for(let i=0;i<3;i++){phases.push(await p.eval(()=>document.querySelector('.fx-generation strong')?.textContent));await sleep(900);}
 assert.equal(new Set(phases).size,3);checks.push('Progress changes across three friendly phases');
 await wait('.fx-message [data-action=fx-creation]');await check('Result stays in conversation until requested',()=>!document.querySelector('dialog').open);
 await click('.fx-message [data-action=fx-creation]');await check('Generated result remains editable and shareable',()=>!!document.querySelector('[data-action=fx-edit]')&&!!document.querySelector('[data-action=fx-share]'));
 await click('[data-action=fx-close]');
 await p.screenshot({path:path.resolve('.test-artifacts/ui-lab/foxy-focus/expanded-chat-final.png'),format:'png'});
 errors.push(...p.consoleErrors);
}catch(e){errors.push(e.stack);}finally{await b.close();}
await writeFile('.test-artifacts/ui-lab/foxy-focus/expansion.json',JSON.stringify({checks,errors},null,2));console.log({checks:checks.length,errors});process.exit(errors.length?1:0);
