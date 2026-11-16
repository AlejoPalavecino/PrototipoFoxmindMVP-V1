import {Browser,sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';import {writeFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';import path from 'node:path';
const b=await Browser.launch(),checks=[],errors=[],geometry=[];
try{const p=await b.newPage({width:1440,height:900,reducedMotion:true});const url=pathToFileURL(path.resolve('design/foxmind-ui-lab/01-foxmind.html')).href;
 for(const width of [1440,1024,768,390,320])for(const role of ['docente','estudiante']){
  await p.setViewport({width,height:900});await p.goto(url+'?compact='+width+role+'#'+role+'/inicio',{settleMs:30});await p.eval(()=>document.fonts.ready);
  const m=await p.eval(()=>{const cards=[...document.querySelectorAll('.planner-event-card')];return {heights:cards.map(c=>c.getBoundingClientRect().height),overflow:document.documentElement.scrollWidth>innerWidth+1,content:cards.every(c=>c.scrollHeight<=c.clientHeight+1)};});
  geometry.push({width,role,...m});checks.push({name:width+' '+role,pass:m.heights.every(h=>h>=64&&h<=103)&&!m.overflow&&m.content});
  if(width===1440||width===390)await p.screenshot({path:path.resolve('.test-artifacts/ui-lab/foxy-focus/home-'+role+'-'+width+'.png'),fullPage:true,format:'png'});
  await p.eval(()=>document.querySelector('.planner-event-card').click());checks.push({name:'Event details '+width+' '+role,pass:await p.eval(()=>document.querySelector('dialog').open&&document.querySelector('dialog').textContent.includes('Clase de fotografía'))});await p.eval(()=>document.querySelector('[data-action=close]').click());
 }
 for(const width of [1440,1024,768,390,320]){const pair=geometry.filter(x=>x.width===width);checks.push({name:'Role parity '+width,pass:JSON.stringify(pair[0].heights)===JSON.stringify(pair[1].heights)});}
 errors.push(...p.consoleErrors);
}catch(e){errors.push(e.stack);}finally{await b.close();}
await writeFile('.test-artifacts/ui-lab/foxy-focus/home-compact.json',JSON.stringify({checks,geometry,errors},null,2));console.log({checks:checks.length,failed:checks.filter(c=>!c.pass),geometry,errors});process.exit(errors.length||checks.some(c=>!c.pass)?1:0);
