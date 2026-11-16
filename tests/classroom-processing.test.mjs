import test from 'node:test';
import assert from 'node:assert/strict';
import { wizard, advance, nodes, button, text, ready, initialDraft, readStructuredPlan } from './helpers/wizard-reference/component-harness.mjs';
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const pick=async(f)=>{nodes(f.view,n=>n.type==='input'&&n.props.type==='file')[0].props.onChange({target:{files:[new File(['plan'],'programa.pdf')],value:''}});await f.view.flush();};
const chooseAi=async(f)=>{await advance(f.view);nodes(f.view,n=>n.type==='input'&&n.props.name==='plan-method'&&n.props.value==='ai')[0].props.onChange();await f.view.flush();await advance(f.view);};
const focused=f=>{assert.equal(nodes(f.view,n=>n.type==='form').length,0);assert.ok(button(f.view,'Volver al programa'));};

test('subida pendiente muestra diálogo enfocado indeterminado y aprobación vuelve al programa',async()=>{
 const upload=deferred();const f=await wizard({upload:()=>upload.promise});try{
  await advance(f.view);await pick(f);focused(f);assert.match(text(f.view.tree),/Recibiendo tu programa/);
  const progress=nodes(f.view,n=>n.props.role==='progressbar')[0];assert.equal(progress.props['aria-valuenow'],undefined);
  assert.equal(nodes(f.view,n=>n.props['aria-current']==='step').length,1);
  upload.resolve(ready('replacement'));await f.view.flush();
  assert.equal(nodes(f.view,n=>n.type==='form')[0].props['data-wizard-step'],1);assert.match(text(f.view.tree),/Tu programa está listo/);
  assert.equal(f.uploads.length,1);assert.ok(f.extractionInputs.every(x=>x.readyFileId===undefined));
 }finally{upload.resolve(ready('replacement'));f.close();}
});
test('archivo pendiente confirma recepción, permite volver y consultar sin volver a subir',async()=>{
 const f=await wizard({upload:async()=>({...ready('pending'),ready:false,validation:'PENDING',scan:'PENDING'})});try{
  await advance(f.view);await pick(f);focused(f);assert.match(text(f.view.tree),/Dejándolo listo para trabajar/);
  button(f.view,'Volver al programa').props.onClick();await f.view.flush();assert.match(text(f.view.tree),/No hace falta volver a subirlo/);
  button(f.view,'Ver estado').props.onClick();await f.view.flush();focused(f);assert.equal(f.uploads.length,1);
 }finally{f.close();}
});
test('fallo de subida conserva el plan previo y ofrece regreso sin falso éxito',async()=>{
 const f=await wizard({upload:async()=>{throw new Error('No se pudo subir el archivo');}});try{
  await advance(f.view);await pick(f);focused(f);assert.ok(nodes(f.view,n=>n.props.role==='alert').length);assert.match(text(f.view.tree),/No se pudo subir/);assert.equal(nodes(f.view,n=>n.props.role==='progressbar').length,0);
  button(f.view,'Volver al programa').props.onClick();await f.view.flush();assert.match(text(f.view.tree),/Tu programa está listo/);assert.equal(f.published.length,0);
 }finally{f.close();}
});
test('SENDING QUEUED RUNNING mantienen una misma solicitud al volver y reabrir; READY exige aplicar',async()=>{
 const state={view:null};const f=await wizard({extractionState:state});try{
  await chooseAi(f);focused(f);assert.match(text(f.view.tree),/Enviando tu solicitud/);
  state.view={id:'job',planFileId:'approved',state:'QUEUED'};f.view.rerender();await f.view.flush();assert.match(text(f.view.tree),/Esperando el análisis/);
  button(f.view,'Volver al programa').props.onClick();await f.view.flush();assert.match(text(f.view.tree),/puede continuar en el servidor/);
  assert.equal(f.extractionInputs.at(-1).readyFileId,'approved');button(f.view,'Ver estado').props.onClick();await f.view.flush();focused(f);
  state.view={...state.view,state:'RUNNING'};f.view.rerender();await f.view.flush();assert.match(text(f.view.tree),/Preparando una propuesta/);
  state.view={...state.view,state:'READY',proposal:{units:[{name:'Propuesta',topics:[{name:'Tema sugerido'}]}],warnings:[]}};f.view.rerender();await f.view.flush();
  // Back stayed on Programa. Continuing reuses the hook instead of dispatching another request.
  await advance(f.view);assert.equal(nodes(f.view,n=>n.type==='form')[0].props['data-wizard-step'],2);
  assert.match(text(f.view.tree),/1 unidad sugerida/);await advance(f.view);assert.match(text(f.view.tree),/aplicá la propuesta/);
  assert.equal(f.published.length,0);assert.ok(!f.calls.some(([path])=>path.endsWith('/apply')));
  const sourceChanges=f.extractionInputs.map(x=>x.readyFileId).filter((x,i,values)=>i===0||x!==values[i-1]);assert.deepEqual(sourceChanges,[undefined,'approved']);
 }finally{f.close();}
});
test('FAILED muestra error real, reintento explícito y ruta manual conserva unidades',async()=>{
 let retries=0,cancels=0;const state={view:{id:'job',state:'FAILED',retryable:true,error:'AI_RATE_LIMITED'},retry:async()=>{retries++;},cancel:()=>{cancels++;}};
 const f=await wizard({extractionState:state});try{await chooseAi(f);focused(f);assert.match(text(f.view.tree),/muchas solicitudes/);assert.equal(retries,0);button(f.view,'Volver a intentar').props.onClick();await f.view.flush();assert.equal(retries,1);button(f.view,'Armarlo a mano').props.onClick();await f.view.flush();assert.equal(cancels,1);assert.deepEqual(readStructuredPlan(f.view),initialDraft().payload.units);assert.equal(f.extractionInputs.at(-1).readyFileId,undefined);assert.equal(f.published.length,0);}finally{f.close();}
});
test('unmount ignora la respuesta tardía de subida sin guardar el archivo nuevo',async()=>{
 const upload=deferred();const f=await wizard({upload:()=>upload.promise});await advance(f.view);await pick(f);const before=f.calls.length;f.close();upload.resolve(ready('late'));await f.view.flush();assert.equal(f.calls.length,before);assert.ok(!f.calls.some(([,method,input])=>method==='PATCH'&&input.payload.planFileId==='late'));
});

test('error de consulta de IA se recupera consultando sin reintentar generación',async()=>{
 let refreshes=0,retries=0;const state={view:{id:'job',state:'RUNNING',retryable:false},message:'No pudimos consultar el análisis',messageError:true,refresh:async()=>{refreshes++;state.message='';state.messageError=false;},retry:async()=>{retries++;}};
 const f=await wizard({extractionState:state});try{await chooseAi(f);focused(f);assert.match(text(f.view.tree),/No pudimos consultar el estado del análisis/);assert.match(text(f.view.tree),/sin iniciar otra generación/);assert.doesNotMatch(text(f.view.tree),/Tus unidades siguen disponibles/);button(f.view,'Consultar análisis').props.onClick();await f.view.flush();f.view.rerender();await f.view.flush();assert.equal(refreshes,1);assert.equal(retries,0);assert.ok(nodes(f.view,n=>n.props.role==='progressbar').length);assert.equal(f.extractionInputs.at(-1).readyFileId,'approved');}finally{f.close();}
});
test('consulta de archivo fallida permite reconsultar y aprobación termina la espera sin otra subida',async()=>{
 let fail=true;const f=await wizard({upload:async()=>({...ready('pending'),ready:false,validation:'PENDING',scan:'PENDING'}),fileStatus:async id=>{if(id==='approved')return ready(id);if(fail)throw new Error('No se pudo consultar el archivo');return ready(id);}});
 try{await advance(f.view);await pick(f);button(f.view,'Volver al programa').props.onClick();await f.view.flush();button(f.view,'Consultar estado').props.onClick();await f.view.flush();assert.match(text(f.view.tree),/No se pudo consultar el archivo/);button(f.view,'Ver estado').props.onClick();await f.view.flush();focused(f);assert.ok(nodes(f.view,n=>n.props.role==='alert').length);fail=false;button(f.view,'Consultar estado').props.onClick();await f.view.flush();assert.match(text(f.view.tree),/Tu programa está listo/);assert.equal(f.uploads.length,1);assert.equal(f.published.length,0);}finally{f.close();}
});
