import test from 'node:test';
import assert from 'node:assert/strict';
import {componentWithPorts} from './foxmind-3d-flows-loader.test.mjs';
import {descendants,hookView} from './agenda-ui-helpers.test.mjs';

const label=node=>Array.isArray(node.props.children)?node.props.children.filter(x=>typeof x==='string').join(''):node.props.children;
const button=(tree,text)=>descendants(tree,node=>node.type==='button'&&label(node)===text)[0];
const practice={id:'p',title:'Práctica real',status:'ACTIVE',questions:[{id:'q1',prompt:'Primera pregunta',type:'SINGLE',options:[{id:'a',text:'Primera opción'}]},{id:'q2',prompt:'Segunda pregunta',type:'DEVELOPMENT'}],answers:{q1:['a']}};
const previousWindow=globalThis.window;
test.before(()=>{globalThis.window={addEventListener(){},removeEventListener(){}};});
test.after(()=>{globalThis.window=previousWindow;});

test('la práctica muestra una pregunta por vez y revisar conserva las respuestas',async()=>{
 const {StudyPracticeView}=componentWithPorts('apps/web/src/features/study/ui/study-practice.tsx',{});
 const calls=[];const view=hookView(StudyPracticeView,{practice,busy:false,run:async(...args)=>calls.push(args),onDirtyChange(){},onNewAttempt:async()=>{},onClose(){}});
 try{await view.flush();
  assert.equal(descendants(view.tree,node=>node.type==='fieldset').length,1);
  button(view.tree,'Siguiente').props.onClick();await view.flush();
  assert.equal(descendants(view.tree,node=>node.type==='textarea').length,1);
  button(view.tree,'Revisar').props.onClick();await view.flush();
  assert.equal(descendants(view.tree,node=>node.type==='h2'&&node.props.children==='Revisá tus respuestas').length,1);
  assert.equal(button(view.tree,'Finalizar').props.disabled,true);
  assert.deepEqual(calls,[]);
 }finally{view.close();}
});

test('finalizar exige confirmación y guarda antes de cerrar el intento',async()=>{
 const {StudyPracticeView}=componentWithPorts('apps/web/src/features/study/ui/study-practice.tsx',{});
 const calls=[];const view=hookView(StudyPracticeView,{practice:{...practice,answers:{q1:['a'],q2:'Respuesta guardada'}},busy:false,run:async(...args)=>calls.push(args),onDirtyChange(){},onNewAttempt:async()=>{},onClose(){}});
 try{await view.flush();button(view.tree,'Siguiente').props.onClick();await view.flush();button(view.tree,'Revisar').props.onClick();await view.flush();button(view.tree,'Finalizar').props.onClick();await view.flush();
  assert.deepEqual(calls,[]);
  const confirm=descendants(view.tree,node=>node.type?.name==='StudyConfirmation')[0];assert.ok(confirm);
  await confirm.props.onConfirm();
  assert.equal(calls[0][0],'SAVE_ANSWERS');assert.equal(calls[1][0],'FINALIZE_PRACTICE');assert.equal(calls[2][0],'RETRY_FEEDBACK');
 }finally{view.close();}
});

test('la práctica objetiva finalizada muestra corrección sin una devolución orientativa pendiente',async()=>{
 const {StudyPracticeView}=componentWithPorts('apps/web/src/features/study/ui/study-practice.tsx',{});
 const objective={...practice,status:'FINALIZED',questions:[practice.questions[0]],result:{questions:[{id:'q1',score:1,explanation:'Respuesta correcta'}]},feedback:{status:'PENDING'}};
 const view=hookView(StudyPracticeView,{practice:objective,busy:false,run:async()=>assert.fail('leer no pide IA'),onDirtyChange(){},onNewAttempt:async()=>{}});
 try{await view.flush();const markdown=descendants(view.tree,node=>node.type?.name==='FoxyMarkdown').map(node=>node.props.markdown).join('\n');assert.match(markdown,/Pregunta 1: Correcta/);assert.doesNotMatch(markdown,/devolución.*pendiente|devolución.*no está disponible/iu);assert.equal(button(view.tree,'Reintentar devolución'),undefined);}finally{view.close();}
});

test('la devolución de desarrollo sólo permite reintentar mientras no esté completa',async()=>{
 const {StudyPracticeView}=componentWithPorts('apps/web/src/features/study/ui/study-practice.tsx',{});
 for(const status of ['PENDING','COMPLETE']){
  const calls=[],mixed={...practice,status:'FINALIZED',answers:{q1:['a'],q2:'Mi explicación'},result:{questions:[{id:'q1',score:1},{id:'q2',score:null}]},feedback:{status,...(status==='COMPLETE'?{markdown:'Orientación real guardada'}:{})}};
  const view=hookView(StudyPracticeView,{practice:mixed,busy:false,run:async(...args)=>calls.push(args),onDirtyChange(){},onNewAttempt:async()=>{}});
  try{await view.flush();const retry=button(view.tree,'Reintentar devolución');if(status==='PENDING'){assert.ok(retry);await retry.props.onClick();assert.equal(calls[0][0],'RETRY_FEEDBACK');}else{assert.equal(retry,undefined);assert.ok(descendants(view.tree,node=>node.type?.name==='FoxyMarkdown'&&node.props.markdown==='Orientación real guardada').length);}}finally{view.close();}
 }
});
