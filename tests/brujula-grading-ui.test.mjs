import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
import { gradingView } from './helpers/audit-grade-dto.mjs';
const criteria=[{name:'Contenido',description:'Evidencias pertinentes',weight:60},{name:'Claridad',description:'Explicación',weight:40}];
const find=(v,label)=>descendants(v.tree,e=>e.props['aria-label']===label)[0];
const button=(v,label)=>descendants(v.tree,e=>e.type==='button'&&e.props.children===label)[0];
test('criteria scoring calculates exact suggestion and saves final override separately from base',async()=>{
 const {GradingEditor}=loadTsModule('apps/web/src/features/grading/ui/GradingEditor.tsx');
 const calls=[],data=structuredClone(gradingView);data.activity.evaluationRubric=criteria;
 Object.assign(data.grade,{rubricSnapshot:null,rubricMarks:[],suggestedGrade:null,calculatedGrade:'6.00',finalGrade:'6.00',finalGradeOverride:null});
 const api={call:async(path,method,payload)=>{calls.push({path,method,payload});return data;},fileUrl:()=>''};
 const v=hookView(GradingEditor,{api,roomId:'room',attemptId:'attempt',onClose(){},onChanged:async()=>{}});await v.flush();
 const scoring=descendants(v.tree,e=>e.type?.name==='BrujulaRubricScoring')[0];assert.ok(scoring,'editable criteria widget');
 scoring.props.onChange(0,'8');await v.flush();descendants(v.tree,e=>e.type?.name==='BrujulaRubricScoring')[0].props.onChange(1,'5');await v.flush();
 assert.equal(find(v,'Nota final').props.value,'6,00'); // suggestion does not silently become final
 button(v,'Usar nota sugerida').props.onClick();await v.flush();assert.equal(find(v,'Nota final').props.value,'6,80');
 find(v,'Nota final').props.onChange({target:{value:'9,25'}});await v.flush();
 await button(v,'Guardar corrección privada').props.onClick();await v.flush();
 const saved=calls.find(x=>x.method==='POST');assert.equal(saved.payload.overallGrade,'6.00');assert.equal(saved.payload.finalGradeOverride,'9.25');
 assert.deepEqual(saved.payload.rubricMarks,[{criterionIndex:0,score:'8'},{criterionIndex:1,score:'5'}]);
 assert.equal(calls.some(x=>x.path.endsWith('/publish-grade')),false);v.close();
});
test('weighted criteria widget labels all scores and preserves valid zero/pending states',()=>{
 const {BrujulaRubricScoring}=loadTsModule('apps/web/src/features/grading/ui/brujula-grading-rubric.tsx');
 const html=renderToStaticMarkup(BrujulaRubricScoring({criteria,marks:{0:'0',1:'10'},disabled:false,onChange(){}}));
 assert.match(html,/Contenido/);assert.match(html,/60%/);assert.match(html,/4,00/);assert.match(html,/Puntaje de Contenido/);
 const pending=renderToStaticMarkup(BrujulaRubricScoring({criteria,marks:{0:'0',1:''},disabled:true,onChange(){}}));assert.match(pending,/Completá los criterios/);assert.doesNotMatch(pending,/4,00/);
});
test('published results show stored rubric snapshot and never current/private activity criteria',async()=>{
 const {PublishedResult}=loadTsModule('apps/web/src/features/grading/ui/PublishedResult.tsx');
 const data={status:'published',activity:{title:'Título',evaluationRubric:[{name:'Privado actual'}]},grade:{finalGrade:'8',publishedAt:'2026-11-05T12:00:00Z',isEffective:true,rubricSnapshot:criteria,rubricMarks:[{criterionIndex:0,score:'8'},{criterionIndex:1,score:'7'}],overallFeedback:null},questions:[],attachments:[]};
 const v=hookView(PublishedResult,{api:{call:async()=>data},roomId:'room',attemptId:'attempt'});await v.flush();
 const html=renderToStaticMarkup(v.tree);assert.match(html,/Contenido/);assert.match(html,/60%/);assert.doesNotMatch(html,/Privado actual/);v.close();
});

test('using suggestion persists its exact override; zero remains valid',async()=>{
 const {GradingEditor}=loadTsModule('apps/web/src/features/grading/ui/GradingEditor.tsx');
 const data=structuredClone(gradingView),calls=[];data.activity.evaluationRubric=criteria;
 Object.assign(data.grade,{rubricSnapshot:criteria,rubricMarks:[{criterionIndex:0,score:'0'},{criterionIndex:1,score:'0'}],calculatedGrade:'6.00',finalGrade:'9.00',finalGradeOverride:'9.00'});
 const v=hookView(GradingEditor,{api:{call:async(p,m,b)=>{calls.push({p,m,b});return data;}},roomId:'room',attemptId:'attempt',onClose(){},onChanged:async()=>{}});await v.flush();
 assert.equal(find(v,'Nota final').props.value,'9,00');button(v,'Usar nota sugerida').props.onClick();await v.flush();assert.equal(find(v,'Nota final').props.value,'0,00');
 button(v,'Guardar corrección privada').props.onClick();await v.flush();assert.equal(calls.find(x=>x.m==='POST').b.finalGradeOverride,'0.00');v.close();
});
test('legacy grading preserves old payload and invalid criterion disables save',async()=>{
 const {GradingEditor}=loadTsModule('apps/web/src/features/grading/ui/GradingEditor.tsx');
 const data=structuredClone(gradingView),calls=[];
 const v=hookView(GradingEditor,{api:{call:async(p,m,b)=>{calls.push({p,m,b});return data;}},roomId:'room',attemptId:'attempt',onClose(){},onChanged:async()=>{}});await v.flush();
 assert.ok(find(v,'Calificación general'));assert.equal(find(v,'Nota final'),undefined);
 button(v,'Guardar corrección privada').props.onClick();await v.flush();const body=calls.find(x=>x.m==='POST').b;
 assert.equal('rubricMarks' in body,false);assert.equal('finalGradeOverride' in body,false);v.close();
 data.activity.evaluationRubric=criteria;
 const w=hookView(GradingEditor,{api:{call:async()=>data},roomId:'room',attemptId:'attempt',onClose(){},onChanged:async()=>{}});await w.flush();
 descendants(w.tree,e=>e.type?.name==='BrujulaRubricScoring')[0].props.onChange(0,'11');await w.flush();assert.equal(button(w,'Guardar corrección privada').props.disabled,true);w.close();
});
test('published rubric is immutable and pending student result exposes no rubric',async()=>{
 const {GradingEditor}=loadTsModule('apps/web/src/features/grading/ui/GradingEditor.tsx');
 const data=structuredClone(gradingView);data.canSave=false;data.archived=true;data.activity.evaluationRubric=[{name:'Current private',description:'',weight:100}];
 Object.assign(data.grade,{isPublished:true,rubricSnapshot:criteria,rubricMarks:[],finalGrade:'7'});
 const v=hookView(GradingEditor,{api:{call:async()=>data},roomId:'room',attemptId:'attempt',onClose(){},onChanged:async()=>{}});await v.flush();
 assert.equal(descendants(v.tree,e=>e.type?.name==='BrujulaRubricScoring').length,0);assert.equal(find(v,'Nota final'),undefined);assert.equal(button(v,'Guardar corrección privada'),undefined);v.close();
 const {PublishedResult}=loadTsModule('apps/web/src/features/grading/ui/PublishedResult.tsx');
 const w=hookView(PublishedResult,{api:{call:async()=>({status:'pending',attemptId:'attempt',grade:{rubricSnapshot:criteria}})},roomId:'room',attemptId:'attempt'});await w.flush();
 const html=renderToStaticMarkup(w.tree);assert.match(html,/pendiente de publicación/);assert.doesNotMatch(html,/Contenido|Evidencias pertinentes/);w.close();
});

test('new assignment suggestion becomes a persisted final only through explicit acceptance, then survives reload',async()=>{
 const {GradingEditor}=loadTsModule('apps/web/src/features/grading/ui/GradingEditor.tsx');
 const data=structuredClone(gradingView),calls=[];data.activity.evaluationRubric=criteria;
 Object.assign(data.grade,{rubricSnapshot:null,rubricMarks:[],suggestedGrade:null,calculatedGrade:null,finalGrade:null,finalGradeOverride:null});
 const api={call:async(p,m,b)=>{
  calls.push({p,m,b});
  if(m==='POST') { // apply the backend contract: final = override ?? calculatedGrade, not suggestedGrade
   const final=b.finalGradeOverride??b.overallGrade;
   Object.assign(data.grade,{id:'saved',rubricSnapshot:criteria,rubricMarks:b.rubricMarks,suggestedGrade:'6.80',calculatedGrade:b.overallGrade,finalGradeOverride:b.finalGradeOverride,finalGrade:final,pending:final===null});
  }
  return structuredClone(data);
 }};
 const v=hookView(GradingEditor,{api,roomId:'room',attemptId:'attempt',onClose(){},onChanged:async()=>{}});await v.flush();
 descendants(v.tree,e=>e.type?.name==='BrujulaRubricScoring')[0].props.onChange(0,'8');await v.flush();
 descendants(v.tree,e=>e.type?.name==='BrujulaRubricScoring')[0].props.onChange(1,'5');await v.flush();
 assert.equal(find(v,'Nota final').props.value,''); // no fabricated final before acceptance
 button(v,'Usar nota sugerida').props.onClick();await v.flush();assert.equal(find(v,'Nota final').props.value,'6,80');
 button(v,'Guardar corrección privada').props.onClick();await v.flush();assert.equal(data.grade.finalGradeOverride,'6.80');assert.equal(data.grade.finalGrade,'6.80');
 button(v,'Recargar corrección').props.onClick();await v.flush();assert.equal(find(v,'Nota final').props.value,'6,80');
 assert.equal(button(v,'Publicar calificación').props.disabled,false);assert.equal(calls.some(x=>x.p.endsWith('/publish-grade')),false);
 button(v,'Usar nota calculada').props.onClick();await v.flush();assert.equal(find(v,'Nota final').props.value,'');
 button(v,'Guardar corrección privada').props.onClick();await v.flush();assert.equal(data.grade.finalGradeOverride,null);assert.equal(data.grade.finalGrade,null);v.close();
});
