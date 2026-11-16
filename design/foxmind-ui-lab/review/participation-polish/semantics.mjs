import {Browser,sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
import {writeFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';import path from 'node:path';
const dir=path.resolve('.test-artifacts/ui-lab/participation-polish'),before=process.argv.includes('before');
const url=pathToFileURL(path.resolve(before?path.join(dir,'before.html'):'design/foxmind-ui-lab/01-foxmind.html')).href;
const b=await Browser.launch(),report={checks:[],errors:[]};let p;
const check=(name,pass)=>report.checks.push({name,pass:!!pass});
const act=async a=>{await p.eval(a=>{const e=document.querySelector('[data-action="'+a+'"]');if(!e)throw Error(a);e.click();},a);await sleep(40);};
try{
 p=await b.newPage({width:1440,height:900,reducedMotion:true});await p.goto(url+'?semantics=10#docente/inicio',{settleMs:80});
 await act('tour');await act('demo-error');await sleep(2850);
 const state=await p.eval(()=>{const d=document.querySelector('dialog'),n=d.querySelector('.class-process-error,.notice.error,.class-ready-note'),color=n?getComputedStyle(n).color:'';return{title:d.querySelector('h2')?.textContent||d.textContent,color,background:n&&getComputedStyle(n).backgroundColor,alert:n?.getAttribute('role')};});
 report.planError=state;const rgb=state.color.match(/\d+/g)?.map(Number)||[];
 check('Plan failure uses red foreground',rgb[0]>rgb[1]+40&&rgb[0]>rgb[2]+40);
 check('Plan failure title states failed operation',state.title.includes('No pudimos preparar el plan'));
 check('Plan error is announced',state.alert==='alert');
 await p.screenshot({path:path.join(dir,(before?'before':'after')+'-plan-error.png'),format:'png'});
 if(!before){
  await act('retry-plan');await sleep(2850);check('Retry restores wizard without error',await p.eval(()=>!!document.querySelector('.class-builder')&&!document.querySelector('.class-process-error')));
  await p.eval(()=>{document.querySelector('#dialog').close();location.hash='#estudiante/actividad';});await sleep(70);
  await p.eval(()=>{window.savedSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new Error('Synthetic quota');};const e=document.querySelector('[data-response]');e.checked=true;e.dispatchEvent(new Event('input',{bubbles:true}));});
  check('Storage error toast is red and announced',await p.eval(()=>{const e=document.querySelector('#toast'),c=getComputedStyle(e).backgroundColor.match(/\d+/g).map(Number);return e.dataset.tone==='error'&&e.getAttribute('role')==='alert'&&c[0]>c[1]+40}));
  check('Draft failure is not labelled saved',await p.eval(()=>document.querySelector('#learning-save-state').dataset.tone==='error'&&document.querySelector('#learning-save-state').textContent.includes('No pudimos guardar')));
  await p.eval(()=>{Storage.prototype.setItem=window.savedSetItem;const e=document.querySelector('[data-response]');e.checked=true;e.dispatchEvent(new Event('input',{bubbles:true}));});
  await act('save-leave');check('Successful save toast is green',await p.eval(()=>{const e=document.querySelector('#toast'),c=getComputedStyle(e).backgroundColor.match(/\d+/g).map(Number);return e.dataset.tone==='success'&&c[1]>c[0]+30}));
  report.consoleErrors=p.consoleErrors;
 }
}catch(e){report.errors.push(e.stack);report.consoleErrors=p?.consoleErrors;}finally{await b.close();}
await writeFile(path.join(dir,'semantics-'+(before?'red':'green')+'.json'),JSON.stringify(report,null,2));console.log(report);process.exit(report.checks.some(c=>!c.pass)||report.errors.length||report.consoleErrors?.length?1:0);
