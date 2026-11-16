import {Browser,sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const dir=path.resolve('.test-artifacts/ui-lab/final-audit/adapted/teaching-polish');
const url=pathToFileURL(path.resolve('design/foxmind-ui-lab/01-foxmind.html')).href;
const b=await Browser.launch(),report={checks:[],screens:[],errors:[]};
const check=(name,pass)=>report.checks.push({name,pass:!!pass});let p,run=0;
async function fixture(s,hash='#docente/aula/progreso') {
 await p.eval(s=>localStorage.setItem('foxmind-ui-lab-v1',JSON.stringify(s)),s);
 await p.goto(url+`?states=${++run}${hash}`,{settleMs:60});
}
try {
 p=await b.newPage({width:1440,height:1000,reducedMotion:true});
 await p.goto(url+'?states=base#docente/aula/plan',{settleMs:60});
 for(let i=0;i<2;i++){await p.eval(()=>document.querySelector('[data-action=teaching-mark-topic]').click());await sleep(50);}
 const seed=await p.eval(()=>JSON.parse(localStorage.getItem('foxmind-ui-lab-v1')));
 await fixture(seed);
 check('Seed progress counts actual work and published grades',await p.eval(()=>document.querySelector('.room-metrics').textContent.includes('3 / 18')&&document.querySelector('.room-metrics').textContent.includes('38%')&&document.querySelector('.room-grade-summary b').textContent.includes('8,5')));
 const graded=structuredClone(seed);
 graded.reviews.push({id:'test-zero',name:'Tomás',classId:'photo',activityId:'light',title:'Descubriendo la luz',state:'published',publishedFeedback:{grade:0}});
 graded.reviews.find(r=>r.id==='r2').state='saved';
 graded.reviewSaved={r2:{grade:10}};
 await fixture(graded);
 check('Published zero included; private ten excluded',await p.eval(()=>document.querySelector('.room-grade-summary b').textContent.includes('4,25')&&document.querySelector('.room-grade-summary span').textContent.includes('2 calificaciones')));
 check('Private review is distinguished in chart',await p.eval(()=>[...document.querySelectorAll('.room-stacked-bar')].some(e=>e.getAttribute('aria-label').includes('1 revisiones privadas'))));
 const empty=structuredClone(seed);
 Object.assign(empty.classes[0],{roster:[],units:[],unitTopics:[[]],topics:0,taught:0,taughtTopicIds:[]});
 empty.activities=[];empty.reviews=[];empty.submitted={};empty.materials=[];empty.libraryItems=[];
 for(const role of ['docente','estudiante'])for(const tab of ['plan','biblioteca','actividades','progreso']) {
  const roleEmpty=structuredClone(empty);if(role==='estudiante')roleEmpty.classes[0].roster=['Marina'];await fixture(roleEmpty,`#${role}/aula/${tab}`);
  check(`Honest empty ${role}/${tab}`,await p.eval(()=>!/(NaN|undefined|Infinity)/.test(document.querySelector('#main').textContent)));
  if(role==='docente'&&tab==='progreso')check('Empty progress provides next steps and no invented chart',await p.eval(()=>document.querySelector('.room-grades-empty').textContent.includes('Todavía no hay notas')&&document.querySelector('.room-student-list').textContent.includes('Invitá')&&document.querySelector('.room-metrics').textContent.includes('0 / 0')));
 }
 const long=structuredClone(seed),c=long.classes[0];
 c.name='Laboratorio de fotografía, narrativa visual y experimentación creativa';
 c.subject='Comunicación visual y expresión artística';c.group='Turno tarde · grupo avanzado';
 c.roster=['Marina','Tomás','Valentina María del Carmen Fernández'];
 c.units=['Explorar la luz natural y construir relatos con imágenes','Composición y análisis de escenas en movimiento'];
 c.unitTopics=[['Comprender la exposición y los cambios de luz en distintos momentos del día','Experimentación con contrastes en escenas cotidianas'],['Construir una narrativa visual con planos y encuadres variados']];
 long.activities.filter(a=>a.classId==='photo').forEach(a=>a.title='Una investigación fotográfica sobre nuestra comunidad y las diferentes maneras de contar una historia');
 long.libraryItems.filter(m=>m.classId==='photo').forEach(m=>{m.title='Guía de trabajo y observación de escenas con luz natural: recursos y ejemplos para explorar';m.fileName='guia_de_observacion_con_ejemplos_y_actividades_complementarias.pdf';});
 for(const width of [1440,1024,768,390,320]) {
  await p.setViewport({width,height:width>768?1000:900});
  for(const role of ['docente','estudiante'])for(const tab of ['plan','biblioteca','actividades','progreso','integrantes']) {
   await fixture(long,`#${role}/aula/${tab}`);
   const geometry=await p.eval(()=>{
    const overlaps=[];
    for(const group of document.querySelectorAll('.room-compact-header,.room-identity,.room-section-nav,.room-metrics,.room-charts-grid,.room-student-row,.teaching-topic-head,.teaching-library-controls')) {
     const els=[...group.children].filter(e=>e.getClientRects().length);
     for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){
      const a=els[i].getBoundingClientRect(),b=els[j].getBoundingClientRect();
      if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2)overlaps.push(group.className);
     }
    }
    return {overflow:document.documentElement.scrollWidth>innerWidth+1,overlaps,cutoff:[...document.querySelectorAll('#main h1,#main h2,#main h3,#main h4,.room-quick-link small')].filter(e=>e.getClientRects().length&&e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).textOverflow!=='ellipsis').map(e=>e.textContent)};
   });
   report.screens.push({width,role,tab,...geometry});
   if([1440,390,320].includes(width)&&role==='docente'&&['plan','progreso'].includes(tab))await p.screenshot({path:path.join(dir,`long-${tab}-${width}.png`),format:'png'});
  }
 }
 report.consoleErrors=p.consoleErrors;
}catch(e){report.errors.push(e.stack);report.consoleErrors=p?.consoleErrors;}finally{await b.close();}
await writeFile(path.join(dir,'states.json'),JSON.stringify(report,null,2));
const failures=report.screens.filter(s=>s.overflow||s.overlaps.length||s.cutoff.length);
console.log(JSON.stringify({checks:report.checks.length,failed:report.checks.filter(c=>!c.pass),screens:report.screens.length,failures,errors:report.errors,consoleErrors:report.consoleErrors}));
process.exit(report.checks.some(c=>!c.pass)||failures.length||report.errors.length||report.consoleErrors?.length?1:0);
