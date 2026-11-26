import test from 'node:test';
import assert from 'node:assert/strict';
import {componentWithPorts} from './foxmind-3d-flows-loader.test.mjs';
import {descendants,hookView} from './agenda-ui-helpers.test.mjs';

const source={id:'s1',version:'v1',title:'luz.pdf',available:true,readable:true};
const base={folder:{id:'folder',name:'Fotografía',status:'ACTIVE',units:[]},sources:[source],exams:[],memory:{},practices:[],creations:[]};
const ports={'../../../shared/use-chat-attachments':{useChatAttachments:()=>({items:[]})},'../../../../../shared-ui/use-chat-follow':{useChatFollow:()=>({})}};
const input={requestId:'request',kind:'QUIZ',topicIds:[],questionCount:5,difficulty:'MEDIUM'};

function workspace(detail,props={}){
 const {StudyWorkspace}=componentWithPorts('apps/web/src/features/study/ui/study-workspace.tsx',ports);
 const view=hookView(StudyWorkspace,{detail,selectedConversationId:'chat',catalog:{classrooms:[]},onReload:async()=>{},...props});
 const by=predicate=>{const [node]=descendants(view.tree,predicate);assert.ok(node);return node;};
 const layout=()=>by(node=>node.type?.name==='FoxyChatLayout');
 const openTool=async label=>{layout().props.onView('tools');await view.flush();
  const [button]=descendants(layout().props.tools,node=>node.type==='button'&&descendants(node,child=>child.type==='b'&&child.props.children===label).length);
  assert.ok(button,label);button.props.onClick();await view.flush();};
 return {view,by,openTool};
}

test('el borrador de una herramienta que falló no aparece al abrir otra herramienta',async()=>{
 const detail={...base,conversations:[{id:'chat',title:'Repaso',turns:[]}]};
 const {view,by,openTool}=workspace(detail,{run:async()=>{throw Object.assign(Error('synthetic'),{code:'SERVICE_UNAVAILABLE'});}});
 try{
  await view.flush();
  await openTool('Preparar un apunte');
  by(node=>node.type==='textarea'&&node.props.maxLength===1500).props.onChange({target:{value:'Preguntas de exposición'}});
  await view.flush();
  by(node=>node.type==='form'&&descendants(node,child=>child.type==='textarea'&&child.props.id==='study-message').length).props.onSubmit({preventDefault(){}});
  await view.flush();
  await openTool('Conectar ideas');
  assert.equal(by(node=>node.type==='textarea'&&node.props.maxLength===1500).props.value,'');
  await openTool('Preparar un apunte');
  assert.equal(by(node=>node.type==='textarea'&&node.props.maxLength===1500).props.value,'Preguntas de exposición');
 }finally{view.close();}
});

test('sin materiales la herramienta no envía y ofrece agregar material',async()=>{
 const detail={...base,sources:[],conversations:[{id:'chat',title:'Repaso',turns:[]}]};
 const calls=[];
 const {view,by,openTool}=workspace(detail,{run:async(...args)=>{calls.push(args);return {};}});
 try{
  await view.flush();
  await openTool('Preparar un apunte');
  by(node=>node.type==='textarea'&&node.props.maxLength===1500).props.onChange({target:{value:'Preguntas de exposición'}});
  await view.flush();
  const submit=by(node=>node.type==='button'&&node.props.type==='submit');
  assert.equal(submit.props.disabled,true);
  by(node=>node.type==='form'&&descendants(node,child=>child.type==='textarea'&&child.props.id==='study-message').length).props.onSubmit({preventDefault(){}});
  await view.flush();
  assert.equal(calls.length,0);
  const add=by(node=>node.type==='button'&&[node.props.children].flat().includes('Agregar material'));
  add.props.onClick({currentTarget:{}});
  await view.flush();
  assert.ok(descendants(view.tree,node=>node.type?.name==='FoxyDialog'&&node.props.title==='Biblioteca de contexto').length,'abre la biblioteca');
  assert.equal(by(node=>node.type==='textarea'&&node.props.maxLength===1500).props.value,'Preguntas de exposición','el formulario conserva lo escrito detrás de la biblioteca');
 }finally{view.close();}
});

test('un pedido sin materiales ofrece agregar material y uno superado ya no ofrece reintentar',async()=>{
 const turns=[{id:'u1',role:'user',text:'Primera',generation:{...input,requestId:'old',status:'INSUFFICIENT',missingInformation:['Agregá material legible.']}},
  {id:'u2',role:'user',text:'Segunda',generation:{...input,requestId:'new',status:'INSUFFICIENT',missingInformation:['Agregá material legible.']}}];
 const {view}=workspace({...base,sources:[],conversations:[{id:'chat',title:'Repaso',turns}]});
 try{
  await view.flush();
  const statuses=descendants(view.tree,node=>node.type?.name==='StudyGenerationStatus');
  assert.equal(statuses.length,2);
  assert.equal(statuses[0].props.superseded,true);
  assert.equal(statuses[1].props.superseded,false);
  assert.equal(statuses[1].props.needsMaterial,true);
  assert.equal(typeof statuses[1].props.onAddMaterial,'function');
 }finally{view.close();}
});

test('el chat muestra el texto parcial de Foxy mientras espera la respuesta',async()=>{
 let finish;const answered=new Promise(resolve=>{finish=resolve;});const reads=[];
 const run=async(action)=>{if(action!=='CHAT')return {};await answered;return {result:{conversation:{turns:[]}}};};
 const readChatPreview=async(requestId)=>{reads.push(requestId);return 'La **exposición** es la luz acumulada';};
 const {view,by}=workspace({...base,conversations:[{id:'chat',title:'Repaso',turns:[]}]},{run,readChatPreview});
 try{
  await view.flush();
  const composer=by(node=>node.type==='textarea'&&node.props.id==='study-message');
  composer.props.onChange({target:{value:'¿Qué es la exposición?'}});
  await view.flush();
  by(node=>node.type==='form'&&descendants(node,child=>child.type==='textarea'&&child.props.id==='study-message').length).props.onSubmit({preventDefault(){}});
  await new Promise(resolve=>setTimeout(resolve,900));
  await view.flush();
  assert.ok(reads.length>=1);
  assert.ok(descendants(view.tree,node=>node.type?.name==='FoxyMarkdown'&&String(node.props.markdown).includes('exposición')).length);
  finish();await new Promise(resolve=>setTimeout(resolve,50));await view.flush();
  assert.equal(descendants(view.tree,node=>node.type?.name==='FoxyMarkdown'&&String(node.props.markdown).includes('luz acumulada')).length,0);
 }finally{finish();view.close();}
});
