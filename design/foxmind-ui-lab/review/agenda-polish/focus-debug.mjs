import {Browser,sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
const b=await Browser.launch(),p=await b.newPage({width:1440,height:900});
await p.goto('file:///C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/design/foxmind-ui-lab/01-foxmind.html?focus-debug#docente/agenda',{settleMs:30});
await p.eval(()=>document.querySelector('[data-action=new-event]').click());
await p.eval(()=>{const e=document.querySelector('[name=title]');e.value='Prueba';e.dispatchEvent(new Event('input',{bubbles:true}));});
await p.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await sleep(40);
console.log(await p.eval(()=>({open:document.querySelector('dialog').open,active:document.activeElement.outerHTML})));
for(let i=0;i<10;i++){await p.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await sleep(30);console.log(await p.eval(()=>({active:document.activeElement.tagName,id:document.activeElement.id,action:document.activeElement.dataset.action,dialog:!!document.activeElement.closest('dialog')})));}
await b.close();
