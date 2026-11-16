import {Browser,sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const dir=path.resolve('.test-artifacts/ui-lab/teaching-polish'),url=pathToFileURL(path.resolve('design/foxmind-ui-lab/01-foxmind.html')).href;
const src=await readFile(new URL('../iteration-2/contrast-check.mjs',import.meta.url),'utf8');
const contrastFn=new Function('return (()=>{'+src.split('const result=await p.eval(()=>{')[1].split('});\n report.screens.push')[0]+'})')();
const b=await Browser.launch(),report={screens:[],errors:[]};
try{
 const p=await b.newPage({width:1440,height:1000,reducedMotion:true});await p.goto(url+'?layout=9#docente/aula/plan',{settleMs:60});
 for(const width of [1440,1024,768,390,320]){
  await p.setViewport({width,height:width>768?1000:900});
  for(const role of ['docente','estudiante'])for(const tab of ['plan','muro','biblioteca','actividades','progreso','integrantes',...(role==='docente'?['historial','ajustes']:[])]){
   await p.eval(h=>location.hash=h,`#${role}/aula/${tab}`);await sleep(50);
   const layout=await p.eval(()=>{
    const overlaps=[];for(const group of document.querySelectorAll('.room-compact-header,.room-section-nav,.room-metrics,.room-charts-grid,.room-student-row,.teaching-topic-head,.teaching-library-controls')){
     const els=[...group.children].filter(e=>e.getClientRects().length);for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){const a=els[i].getBoundingClientRect(),b=els[j].getBoundingClientRect();if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2)overlaps.push(group.className);}
    }
    return {overflow:document.documentElement.scrollWidth>innerWidth+1,overlaps,cutoff:[...document.querySelectorAll('#main h1,#main h2,#main h3,#main h4,.room-quick-link small,.room-student-row dd')].filter(e=>e.getClientRects().length&&e.scrollWidth>e.clientWidth+2).map(e=>e.textContent),images:[...document.images].filter(i=>!i.complete||!i.naturalWidth).length,headerHeight:document.querySelector('.room-compact-header')?.getBoundingClientRect().height};
   });
   const contrast=await p.eval(contrastFn);report.screens.push({width,role,tab,...layout,contrastCount:contrast.count,contrastFailures:contrast.failures});
   if([1440,390,320].includes(width)&&['plan','biblioteca','progreso'].includes(tab))await p.screenshot({path:path.join(dir,`${role}-${tab}-${width}.png`),format:'png'});
  }
 }
 report.consoleErrors=p.consoleErrors;
}catch(e){report.errors.push(e.stack);}finally{await b.close();}
await writeFile(path.join(dir,'layout.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({screens:report.screens.length,failures:report.screens.filter(s=>s.overflow||s.overlaps.length||s.cutoff.length||s.images),contrastCount:report.screens.reduce((n,s)=>n+s.contrastCount,0),contrastFailures:report.screens.flatMap(s=>s.contrastFailures.map(f=>({width:s.width,role:s.role,tab:s.tab,...f}))),errors:report.errors,consoleErrors:report.consoleErrors}));process.exit(report.errors.length||report.consoleErrors?.length||report.screens.some(s=>s.overflow||s.overlaps.length||s.cutoff.length||s.images||s.contrastFailures.length)?1:0);
