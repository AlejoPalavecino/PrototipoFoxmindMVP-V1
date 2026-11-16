import {Browser,sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const dir=path.resolve('.test-artifacts/ui-lab/participation-polish'),url=pathToFileURL(path.join(dir,'before.html')).href;
const b=await Browser.launch(),data=[];
try{
 const p=await b.newPage({width:1440,height:900,reducedMotion:true});
 await p.goto(url+'#docente/aula/actividades',{settleMs:80});
 data.push({badges:await p.eval(()=>[...document.querySelectorAll('.activity-collection-tabs button')].map(e=>{const s=e.querySelector('span'),a=e.getBoundingClientRect(),r=s.getBoundingClientRect(),css=getComputedStyle(s);return{text:e.textContent,delta:r.y+r.height/2-a.y-a.height/2,display:css.display,lineHeight:css.lineHeight,fontSize:css.fontSize,verticalAlign:css.verticalAlign};}))});
 await p.screenshot({path:path.join(dir,'before-badges.png'),format:'png'});
 for(const width of [1440,390]) {
  await p.setViewport({width,height:900});
  for(const [hash,name] of [['#estudiante/actividad-detalle','overview'],['#estudiante/actividad','question'],['#docente/corregir','grading']]) {
   await p.eval(h=>location.hash=h,hash);await sleep(70);
   data.push({width,name,...await p.eval(()=>({scroll:document.documentElement.scrollHeight,footer:document.querySelector('.focus-footer')?.getBoundingClientRect().top,questionBottom:document.querySelector('.student-question')?.getBoundingClientRect().bottom,gradeTop:document.querySelector('#grade')?.getBoundingClientRect().top}))});
   await p.screenshot({path:path.join(dir,`before-${name}-${width}.png`),format:'png'});
  }
 }
}finally{await b.close();}
await writeFile(path.join(dir,'baseline.json'),JSON.stringify(data,null,2));console.log(data);
