import {Browser,sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
import {writeFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';import path from 'node:path';
const before=process.argv.includes('before'),dir=path.resolve('.test-artifacts/ui-lab/agenda-polish'),url=pathToFileURL(path.resolve(before?path.join(dir,'before.html'):'design/foxmind-ui-lab/01-foxmind.html')).href;
const b=await Browser.launch(),report={checks:[],errors:[]};let p;
const check=(name,pass)=>report.checks.push({name,pass:!!pass});
const click=async s=>{await p.eval(s=>{const e=document.querySelector(s);if(!e)throw Error(s);e.click();},s);await sleep(35);};
try{p=await b.newPage({width:1440,height:900,reducedMotion:true});await p.goto(url+'?contract#docente/agenda',{settleMs:50});
 await click('[data-action=calendar-view][data-value=day]');check('Day view lists each event once',await p.eval(()=>document.querySelectorAll('main [data-action=event-detail][data-id="1"]').length===1));
 await click('[data-action=calendar-view][data-value=week]');await click('[data-action=month-next]');check('Next week moves by seven days',await p.eval(()=>document.querySelector('main').textContent.includes('16')&&!document.querySelector('main h2').textContent.includes('Diciembre')));
 await click('[data-action=new-event]');check('Type choices are visible without dropdown',await p.eval(()=>!document.querySelector('#event-type')&&document.querySelectorAll('input[name=type]').length===3));
 await p.eval(()=>{const f=document.querySelector('#event-form');f.querySelector('[name=title]').value='   ';f.requestSubmit();});check('Whitespace title rejected',await p.eval(()=>document.querySelector('#dialog').open&&document.querySelector('#event-error').textContent.length>0));

}catch(e){report.errors.push(e.stack);}finally{await b.close();}
await writeFile(path.join(dir,before?'contracts-red.json':'contracts-green.json'),JSON.stringify(report,null,2));console.log(report);process.exit(report.errors.length||report.checks.some(c=>!c.pass)?1:0);

