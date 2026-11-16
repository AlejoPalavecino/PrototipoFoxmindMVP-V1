import assert from 'node:assert/strict';
import {Browser,sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
import {writeFile,mkdir} from 'node:fs/promises';import {pathToFileURL} from 'node:url';import path from 'node:path';
const b=await Browser.launch(),checks=[],errors=[],geometry=[];let p;
const root=path.resolve('.test-artifacts/ui-lab/chat-toolbar');await mkdir(root,{recursive:true});
const act=(a,x='')=>p.eval(s=>document.querySelector(s).click(),`[data-action=${a}]${x}`);
const check=async(n,f)=>{assert.ok(await p.eval(f),n);checks.push(n);};
const sidebarFits=()=>{const sb=document.querySelector('.sidebar'),label=sb.querySelector('.nav-label'),links=[...sb.querySelectorAll('.class-link')],lr=label.getBoundingClientRect();return sb.scrollWidth<=sb.clientWidth&&links.every(e=>{const r=e.getBoundingClientRect(),text=e.querySelector('span:last-child'),tr=text.getBoundingClientRect();return r.top>=lr.bottom&&r.right<=sb.getBoundingClientRect().right&&text.scrollWidth<=text.clientWidth+1&&tr.right<=r.right+1;});};
try{
 p=await b.newPage({width:1440,height:900,reducedMotion:true});await p.goto(pathToFileURL(path.resolve('design/foxmind-ui-lab/01-foxmind.html')).href+'?toolbar#docente/foxy',{settleMs:60});
 for(const role of ['docente','estudiante']){
  await p.eval(h=>location.hash=h,'#'+role+'/'+(role==='docente'?'foxy':'estudio'));await sleep(35);
  if(await p.eval(()=>document.querySelector('[data-action=nav-toggle]').getAttribute('aria-expanded')==='false'))await act('nav-toggle');
  await check(role+': expanded classroom list is vertical and complete',sidebarFits);
  await p.screenshot({path:path.join(root,role+'-expanded.png'),format:'png'});
  await p.setViewport({width:1024,height:706});await check(role+': expanded classrooms fit narrower desktop',sidebarFits);
  await check(role+': profile remains visible on short desktop',()=>document.querySelector('.sidebar .account').getBoundingClientRect().bottom<=innerHeight);
  await p.screenshot({path:path.join(root,role+'-expanded-short.png'),format:'png'});
  await p.setViewport({width:1440,height:900});
  await check(role+': no duplicate visible title bar',()=>!document.querySelector('.fx-topbar')&&!!document.querySelector('.foxy-space h1.sr-only'));
  await check(role+': all controls share one row and New chat is last',()=>{const ctx=document.querySelector('.fx-context-launch').getBoundingClientRect(),buttons=[...document.querySelectorAll('.fx-context-strip [data-action=fx-tray],.fx-context-strip [data-action=new-chat]')];return buttons.length===4&&buttons.at(-1).textContent.includes('Nuevo chat')&&buttons.every(b=>Math.abs((b.getBoundingClientRect().top+b.getBoundingClientRect().height/2)-(ctx.top+ctx.height/2))<2);});
  await p.eval(()=>{const e=document.querySelector('#fx-message');e.value='Conservar esta idea';e.dispatchEvent(new Event('input',{bubbles:true}));});
  await act('nav-toggle');await check(role+': collapsed rail hides classroom shortcuts',()=>!document.querySelector('.sidebar .class-link').getClientRects().length);
  await check(role+': toggle keeps draft',()=>document.querySelector('#fx-message').value==='Conservar esta idea');
  for(const width of [1440,1024,900,768,390,320]){
   await p.setViewport({width,height:width>=1024?706:844});
   await check(role+': header and composer fit '+width,()=>{const d=document.documentElement,c=document.querySelector('.fx-composer').getBoundingClientRect(),h=document.querySelector('.fx-context-strip').getBoundingClientRect(),els=[...document.querySelectorAll('.fx-context-launch,.fx-shortcuts>button,.fx-new-conversation')];return d.scrollWidth<=innerWidth&&d.scrollHeight<=innerHeight+1&&c.bottom<=innerHeight+1&&els.every(e=>{const r=e.getBoundingClientRect();return r.left>=h.left&&r.right<=h.right+1&&r.top>=h.top&&r.bottom<=h.bottom+1;})&&document.querySelector('.fx-new-conversation span').getClientRects().length>0;});
   geometry.push(await p.eval(()=>({width:innerWidth,role:document.title,header:document.querySelector('.fx-context-strip').getBoundingClientRect().height,chat:document.querySelector('.fx-conversation').getBoundingClientRect().height})));
   if([1440,390,320].includes(width))await p.screenshot({path:path.join(root,role+'-'+width+'.png'),format:'png'});
  }
  await p.setViewport({width:390,height:844});await act('menu');await check(role+': mobile classrooms complete',sidebarFits);await act('menu');
  for(const value of ['history','tools','creations']){await act('fx-tray',`[data-value=${value}]`);await check(role+': '+value+' remains accessible',()=>document.querySelector('dialog').open);await act('fx-tray-close');}
  await check(role+': panels retain draft',()=>document.querySelector('#fx-message').value==='Conservar esta idea');
  await act('new-chat');await check(role+': explicit New chat starts an empty conversation',()=>document.querySelector('#fx-message').value===''&&!document.querySelector('.fx-message'));
  await p.setViewport({width:1440,height:900});
 }
 errors.push(...p.consoleErrors);
}catch(e){errors.push(e.stack);}finally{await b.close();}
await writeFile(path.join(root,'checks.json'),JSON.stringify({checks,errors,geometry},null,2));console.log({checks:checks.length,errors});process.exit(errors.length?1:0);
