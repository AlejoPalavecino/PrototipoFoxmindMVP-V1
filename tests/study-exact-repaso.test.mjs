import test from 'node:test';
import assert from 'node:assert/strict';
import {studyReviewAvailability} from '../apps/web/src/features/study/model/study-time.ts';
import {planExam} from '../src/core/domain/study/engine.ts';
import {componentWithPorts} from './foxmind-3d-flows-loader.test.mjs';
import {descendants,hookView} from './agenda-ui-helpers.test.mjs';

test('el repaso reparte disponibilidad antes del examen en la zona elegida',()=>{
 const actual=studyReviewAvailability({start:'2026-11-20',exam:'2026-11-26',count:3,time:'17:00',minutes:25,zone:'America/Argentina/Buenos_Aires'});
 assert.deepEqual(actual,[{start:'2026-11-20T20:00:00.000Z',minutes:25},{start:'2026-11-22T20:00:00.000Z',minutes:25},{start:'2026-11-25T20:00:00.000Z',minutes:25}]);
});
test('rechaza sesiones que se pisan, fechas inválidas y horarios fuera del día',()=>{
 const valid={start:'2026-11-20',exam:'2026-11-26',count:3,time:'17:00',minutes:25,zone:'America/Argentina/Buenos_Aires'};
 for(const change of [{exam:'2026-11-20'},{exam:'2026-11-21'},{start:'2026-02-30'},{count:1},{count:6},{time:'23:50'}])assert.throws(()=>studyReviewAvailability({...valid,...change}));
});

test('el formulario crea exactamente las sesiones elegidas, con duración completa y rotación de temas',async()=>{
 const {StudyExamPlanner}=componentWithPorts('apps/web/src/features/study/practice/study-practice.tsx',{});
 for(const [topicCount,count] of [[1,3],[2,5],[5,2]]){
  const topics=Array.from({length:topicCount},(_,index)=>({id:`topic-${index}`,title:`Tema ${index+1}`}));
  let saved,request,prepared;
  const view=hookView(StudyExamPlanner,{detail:{folder:{name:'Mi repaso',units:[{topics}]},exams:[]},busy:false,onDirtyChange(){},onPrepared:id=>{prepared=id;},run:async(action,data)=>{
   assert.equal(action,'PLAN_EXAM');request=data;saved=planExam({...data,topics,now:'2030-01-01T00:00:00Z'});return {result:{exam:{id:'exam',...saved}}};
  }});
  try{await view.flush();descendants(view.tree,node=>node.type==='input'&&node.props.placeholder)[0].props.onChange({target:{value:'Preparar evaluación'}});
   const dates=descendants(view.tree,node=>node.type==='input'&&node.props.type==='date');dates[0].props.onChange({target:{value:'2030-01-10'}});dates[1].props.onChange({target:{value:'2030-01-20'}});
   descendants(view.tree,node=>node.type==='input'&&node.props.type==='number')[0].props.onChange({target:{value:String(count)}});
   await view.flush();
   for(let index=0;index<topics.length;index++){descendants(view.tree,node=>node.type==='input'&&node.props.type==='checkbox')[index].props.onChange({target:{checked:true}});await view.flush();}
   descendants(view.tree,node=>node.type==='form')[0].props.onSubmit({preventDefault(){}});await view.flush();
   assert.equal(saved.sessions.length,count,`${topicCount} temas / ${count} sesiones`);assert.equal(request.sessionCount,count);assert.equal(prepared,'exam');
   assert.deepEqual(saved.sessions.map(session=>session.minutes),Array(count).fill(25));
   assert.deepEqual(saved.sessions.map(session=>session.topicIds),Array.from({length:count},(_,index)=>[topics[index%topics.length].id]));
   assert.deepEqual(saved.sessions.map(session=>session.startAt),request.availability.map(slot=>slot.start));
  }finally{view.close();}
 }
});
