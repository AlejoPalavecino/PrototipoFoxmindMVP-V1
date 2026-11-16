/* Shared, synthetic curriculum/activity model. No API or production data. */
function curriculumUnits(c=classroom()){
 if(!c)return [];
 if(c.unitTopics?.length)return c.units.map((title,i)=>({id:c.id+'-u'+i,title,topics:(c.unitTopics[i]||[]).map((name,j)=>({id:c.id+'-u'+i+'-t'+j,title:name}))}));
 const names=topicMap[c.id]||c.units||['Primer tema','Segundo tema'];
 return Array.from({length:Math.ceil(names.length/4)},(_,i)=>({id:c.id+'-u'+i,title:c.id==='photo'?['La luz','Mirar y componer'][i]||`Unidad ${i+1}`:`Unidad ${i+1}`,topics:names.slice(i*4,i*4+4).map((title,j)=>({id:c.id+'-u'+i+'-t'+j,title}))}));
}
const curriculumTopics=c=>curriculumUnits(c).flatMap(u=>u.topics.map(t=>({...t,unitId:u.id,unitTitle:u.title})));
function learningQuestions(a=activity()){const source=a?.spec?.questions;return (source||questions).map((q,i)=>({id:q.id||'q'+i,title:q.title,hint:q.hint||'',kind:q.kind||(q.text?'text':'single'),options:q.options||[],correct:q.correct||[0],points:q.points??1}));}
function learningRubric(a=activity()){return Array.isArray(a?.spec?.rubric)?a.spec.rubric:[{id:'reason',title:typeof a?.spec?.rubric==='string'?a.spec.rubric:'Análisis y fundamentación',description:'Relacionar lo aprendido con ejemplos y explicar las decisiones.',weight:100}];}
function learningTopics(a=activity()){
 if(Array.isArray(a?.spec?.topics))return a.spec.topics;
 const indexes={light:[0],observe:[0,1],contrast:[1],life:[0]}[a?.id]||[];
 const topics=curriculumTopics(state.classes.find(c=>c.id===a?.classId));
 return indexes.map(i=>topics[i]).filter(Boolean);
}
function learningInstructions(a=activity()){return a?.spec?.instructions||(a?.type==='Trabajo práctico'?'Elegí una escena y tomá tres fotografías con distinta exposición. Contanos qué cambiaste y qué efecto buscaste en cada una. Podés usar la cámara de tu celular.':'Leé el material del tema y respondé las preguntas. En las respuestas escritas, explicá tu razonamiento con tus propias palabras.');}
const learningObjective=a=>a?.spec?.objective||'Relacionar las ideas del tema con ejemplos y explicar tus decisiones.';
function learningReceipt(a=activity()){return state.submitted[a?.id];}
function learningReviewActivity(r){return state.activities.find(a=>a.id===r?.activityId)||state.activities.find(a=>a.classId===r?.classId&&a.title===r?.title);}
function learningInit(){state.activityDrafts??=[];state.workFiles??={};state.workComments??={};state.reviewSaved??={};for(const r of state.reviews){r.activityId??=learningReviewActivity(r)?.id;const draft=state.reviewDraft[r.id];if(draft&&r.state==='saved'&&!state.reviewSaved[r.id])state.reviewSaved[r.id]=structuredClone(draft);}if(state.tpFile&&!state.workFiles.observe)state.workFiles.observe=[{name:state.tpFile,size:0,status:'ready',example:true}];if(state.tpComment&&!state.workComments.observe)state.workComments.observe=state.tpComment;}
