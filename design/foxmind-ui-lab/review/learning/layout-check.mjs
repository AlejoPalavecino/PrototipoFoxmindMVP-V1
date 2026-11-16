import {Browser,sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const out=path.resolve('.test-artifacts/ui-lab/learning');await mkdir(out,{recursive:true});
const url=pathToFileURL(path.resolve('design/foxmind-ui-lab/01-foxmind.html')).href;
const b=await Browser.launch(),results=[];
try {
 const p=await b.newPage({width:1440,height:1000,reducedMotion:true});await p.goto(url+'?layout=8#docente/aula/plan',{settleMs:50});
 for(const width of [1440,768,390,320]){
  await p.setViewport({width,height:1000});
  for(const role of ['docente','estudiante'])for(const section of ['plan','muro','biblioteca','actividades','progreso','integrantes',...(role==='docente'?['historial','ajustes']:[])]){
   await p.eval(hash=>location.hash=hash,`#${role}/aula/${section}`);await sleep(60);
   const metrics=await p.eval(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,wide:[...document.querySelectorAll('#main *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+2&&!e.closest('.room-nav,.table')}).map(e=>e.className).slice(0,10),images:[...document.images].filter(i=>!i.complete||!i.naturalWidth).length}));
   results.push({width,role,section,...metrics});
   if([1440,390].includes(width)&&['plan','actividades'].includes(section))await p.screenshot({path:path.join(out,`${role}-${section}-${width}.png`),format:'png'});
  }
  await p.eval(()=>location.hash='#docente/aula/actividades');await sleep(60);
  await p.eval(()=>document.querySelector('[data-action=new-activity]').click());await sleep(60);
  results.push({width,section:'author-scope',...await p.eval(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1}))});
  if([1440,390].includes(width))await p.screenshot({path:path.join(out,`author-scope-${width}.png`),format:'png'});
 }
 results.push({consoleErrors:p.consoleErrors});
}finally{await b.close();}
await writeFile(path.join(out,'layout.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results.filter(r=>r.overflow||r.images||r.consoleErrors?.length)));console.log('Layout screens: '+(results.length-1));
process.exit(results.some(r=>r.overflow||r.images||r.consoleErrors?.length)?1:0);
