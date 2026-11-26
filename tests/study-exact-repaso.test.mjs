import test from 'node:test';
import assert from 'node:assert/strict';
import * as studyTime from '../apps/web/src/features/study/model/study-time.ts';
import {componentWithPorts} from './foxmind-3d-flows-loader.test.mjs';
import {descendants,hookView} from './agenda-ui-helpers.test.mjs';
const {studyReviewAvailability}=studyTime;

test('el repaso reparte disponibilidad antes del examen en la zona elegida',()=>{
 const actual=studyReviewAvailability({start:'2026-11-20',exam:'2026-11-26',count:3,time:'17:00',minutes:25,zone:'America/Argentina/Buenos_Aires',now:Date.parse('2026-11-18T15:00Z')});
 assert.deepEqual(actual,[{start:'2026-11-20T20:00:00.000Z',minutes:25},{start:'2026-11-22T20:00:00.000Z',minutes:25},{start:'2026-11-25T20:00:00.000Z',minutes:25}]);
});

test('el inicio sugerido respeta la hora local y un horario vencido indica los dos ajustes posibles',()=>{
 const zone='America/Argentina/Buenos_Aires', now='2026-11-18T01:20:00Z';
 assert.equal(studyTime.studyReviewStartDate('2026-11-17T19:59:00Z',zone,'17:00'),'2026-11-17');
 assert.equal(studyTime.studyReviewStartDate(now,zone,'17:00'),'2026-11-18');
 const options={start:'2026-11-17',exam:'2026-11-24',count:3,time:'17:00',minutes:25,zone,now:Date.parse(now)};
 assert.throws(()=>studyReviewAvailability(options),/elegí una fecha de inicio futura o un horario posterior/i);
 assert.equal(studyReviewAvailability({...options,start:'2026-11-18'})[0].start,'2026-11-18T20:00:00.000Z');
 assert.equal(studyReviewAvailability({...options,time:'22:30'})[0].start,'2026-11-18T01:30:00.000Z');
});
test('rechaza sesiones que se pisan, fechas inválidas y horarios fuera del día',()=>{
 const valid={start:'2026-11-20',exam:'2026-11-26',count:3,time:'17:00',minutes:25,zone:'America/Argentina/Buenos_Aires',now:Date.parse('2026-11-18T15:00Z')};
 for(const change of [{exam:'2026-11-20'},{exam:'2026-11-21'},{start:'2026-02-30'},{count:1},{count:6},{time:'23:50'}])assert.throws(()=>studyReviewAvailability({...valid,...change}));
});

test('el formulario avanza por fecha, temas y horarios y envía a Gemini los temas y las ventanas exactas',async()=>{
 const {StudyExamPlanner}=componentWithPorts('apps/web/src/features/study/practice/study-practice.tsx',{});
 for(const [topicCount,count] of [[1,3],[2,5],[5,2]]){
  const topics=Array.from({length:topicCount},(_,index)=>({id:`topic-${index}`,title:`Tema ${index+1}`}));
  let request;
  const view=hookView(StudyExamPlanner,{detail:{folder:{name:'Mi repaso',units:[{topics}]},exams:[]},busy:false,onDirtyChange(){},
   onGenerate:data=>{request=data;},run:async()=>assert.fail('El formulario inicia una generación y espera el resultado por chat')});
  try{await view.flush();descendants(view.tree,node=>node.type==='input'&&node.props.placeholder)[0].props.onChange({target:{value:'Preparar evaluación'}});
   const dates=descendants(view.tree,node=>node.type==='input'&&node.props.type==='date');dates[0].props.onChange({target:{value:'2030-01-10'}});dates[1].props.onChange({target:{value:'2030-01-20'}});
   await view.flush();
   const next=async()=>{descendants(view.tree,node=>node.type==='button'&&[node.props.children].flat().includes('Siguiente '))[0].props.onClick();await view.flush();};
   const stage=()=>descendants(view.tree,node=>node.props?.className==='study-plan-stage'&&!node.props.hidden).length===1&&descendants(view.tree,node=>node.props?.['aria-current']==='step')[0];
   // Enter on the first step moves forward instead of generating.
   descendants(view.tree,node=>node.type==='form')[0].props.onSubmit({preventDefault(){}});await view.flush();
   assert.equal(request,undefined,'no genera antes del último paso');
   assert.match(JSON.stringify(stage().props.children),/Temas/);
   next();await view.flush();
   assert.match(JSON.stringify(stage().props.children),/Temas/,'sin temas no avanza');
   for(let index=0;index<topics.length;index++){descendants(view.tree,node=>node.type==='input'&&node.props.type==='checkbox')[index].props.onChange({target:{checked:true}});await view.flush();}
   await next();
   assert.match(JSON.stringify(stage().props.children),/Horarios/);
   descendants(view.tree,node=>node.type==='input'&&node.props.type==='number')[0].props.onChange({target:{value:String(count)}});
   await view.flush();
   descendants(view.tree,node=>node.type==='form')[0].props.onSubmit({preventDefault(){}});await view.flush();
   assert.equal(request.kind,'REVIEW_PLAN');
   assert.equal(request.message,'Preparar evaluación');
   assert.deepEqual(request.topicIds,topics.map(topic=>topic.id));
   const {availability, examAt, timeZone}=request.review;
   assert.equal(availability.length,count,`${topicCount} temas / ${count} sesiones`);
   assert.deepEqual(availability.map(slot=>slot.minutes),Array(count).fill(25));
   assert.ok(availability.every(slot=>Date.parse(slot.start)+slot.minutes*60000<=Date.parse(examAt)));
   assert.equal(studyTime.studyLocalMinute(examAt,timeZone),'2030-01-20T17:00');
  }finally{view.close();}
 }
});

test('repetir un plan recupera el pedido y permite elegir nuevas fechas y temas vigentes',async()=>{
 const {StudyExamPlanner}=componentWithPorts('apps/web/src/features/study/practice/study-practice.tsx',{});
 const liveTopic={id:'vigente',title:'Metafase'};
 const view=hookView(StudyExamPlanner,{detail:{folder:{name:'Mitosis',units:[{topics:[liveTopic]}]},exams:[]},
  busy:false,onDirtyChange(){},onGenerate(){},
  initialRequest:{message:'Evaluación de mitosis',topicIds:['vigente','borrado'],review:{ timeZone:'UTC', examAt:'2020-05-05T11:00Z',
   availability:[{start:'2020-05-01T11:00Z',minutes:40},{start:'2020-05-02T11:00Z',minutes:40}] }}});
 try{
  await view.flush();
  const inputs=descendants(view.tree,node=>node.type==='input');
  assert.equal(inputs.find(node=>node.props.placeholder).props.value,'Evaluación de mitosis');
  assert.equal(inputs.filter(node=>node.props.type==='date')[1].props.value,'');
  assert.equal(inputs.find(node=>node.props.type==='time').props.value,'11:00');
  assert.equal(inputs.find(node=>node.props.type==='number').props.value,2);
  assert.equal(inputs.find(node=>node.props.type==='checkbox').props.checked,true);
 }finally{view.close();}
});

test('el primer paso del repaso no avanza sin propósito ni con una evaluación anterior al inicio',async()=>{
 const {StudyExamPlanner}=componentWithPorts('apps/web/src/features/study/practice/study-practice.tsx',{});
 const view=hookView(StudyExamPlanner,{detail:{folder:{name:'Mi repaso',units:[{topics:[{id:'t',title:'Luz'}]}]},exams:[]},busy:false,onDirtyChange(){},onGenerate:()=>assert.fail('no genera')});
 const current=()=>JSON.stringify(descendants(view.tree,node=>node.props?.['aria-current']==='step')[0].props.children);
 const next=async()=>{descendants(view.tree,node=>node.type==='button'&&[node.props.children].flat().includes('Siguiente '))[0].props.onClick();await view.flush();};
 const notice=()=>descendants(view.tree,node=>node.type?.name==='Notice').map(node=>node.props.children).join(' ');
 try{
  await view.flush();
  await next();
  assert.match(current(),/Fecha/);assert.match(notice(),/para qué te estás preparando/);
  descendants(view.tree,node=>node.type==='input'&&node.props.placeholder)[0].props.onChange({target:{value:'Parcial'}});
  const dates=descendants(view.tree,node=>node.type==='input'&&node.props.type==='date');
  dates[0].props.onChange({target:{value:'2030-02-10'}});dates[1].props.onChange({target:{value:'2030-02-01'}});
  await view.flush();await next();
  assert.match(current(),/Fecha/);assert.match(notice(),/después del primer día/);
  descendants(view.tree,node=>node.type==='input'&&node.props.type==='date')[1].props.onChange({target:{value:'2030-02-20'}});
  await view.flush();await next();
  assert.match(current(),/Temas/);
  descendants(view.tree,node=>node.type==='button'&&node.props.children==='Elegir todos')[0].props.onClick();await view.flush();
  assert.equal(descendants(view.tree,node=>node.type==='input'&&node.props.type==='checkbox')[0].props.checked,true);
  descendants(view.tree,node=>node.type==='button'&&node.props['aria-label']==='Volver al paso 1: Fecha')[0].props.onClick();await view.flush();
  assert.match(current(),/Fecha/);
  assert.equal(descendants(view.tree,node=>node.type==='input'&&node.props.placeholder)[0].props.value,'Parcial','volver conserva lo elegido');
 }finally{view.close();}
});

test('pasar al último paso no reutiliza el botón Siguiente como envío del formulario',async()=>{
 // El navegador decide si un clic envía el formulario después de que React re-renderiza:
 // si el mismo elemento pasa de type=button a submit durante el clic, se genera el plan sin ver el paso 3.
 const {StudyExamPlanner}=componentWithPorts('apps/web/src/features/study/practice/study-practice.tsx',{});
 const view=hookView(StudyExamPlanner,{detail:{folder:{name:'Mi repaso',units:[{topics:[{id:'t',title:'Luz'}]}]},exams:[]},busy:false,onDirtyChange(){},onGenerate(){},
  initialRequest:{message:'Parcial',topicIds:['t']}});
 const action=()=>descendants(view.tree,node=>node.type==='footer')[0];
 const primary=()=>[action().props.children].flat(Infinity).filter(Boolean).find(node=>node.props?.className==='primary');
 try{
  await view.flush();
  descendants(view.tree,node=>node.type==='input'&&node.props.type==='date')[1].props.onChange({target:{value:'2031-03-01'}});await view.flush();
  primary().props.onClick();await view.flush();
  const next=primary();
  assert.equal(next.key,'next');assert.equal(next.props.type,'button');
  next.props.onClick();await view.flush();
  const submit=primary();
  assert.equal(submit.props.type,'submit');
  assert.notEqual(submit.key,next.key,'React crea un botón nuevo para enviar');
 }finally{view.close();}
});
