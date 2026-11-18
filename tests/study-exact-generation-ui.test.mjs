import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import assert from 'node:assert/strict';
import {componentWithPorts} from './foxmind-3d-flows-loader.test.mjs';
import {descendants,hookView} from './agenda-ui-helpers.test.mjs';

const input={requestId:'request',kind:'NOTE',topicIds:['topic'],questionCount:5,difficulty:'MEDIUM',status:'COMPLETE'};
const base={folder:{id:'folder',name:'Mi estudio',status:'ACTIVE',units:[]},sources:[],exams:[],memory:{},practices:[]};
const ports={'../../../shared/use-chat-attachments':{useChatAttachments:()=>({items:[]})},'../../../../../shared-ui/use-chat-follow':{useChatFollow:()=>({})}};

test('recarga completa muestra tarjeta del ID guardado y abre esa creación, no la última',async()=>{
 const {StudyWorkspace}=componentWithPorts('apps/web/src/features/study/ui/study-workspace.tsx',ports);
 const first={id:'first',title:'Mi propuesta guardada',markdown:'Contenido real',kind:'NOTE'},other={id:'last',title:'Otra creación',markdown:'Otro contenido',kind:'NOTE'};
 const detail={...base,creations:[first,other],conversations:[{id:'chat',title:'Mi idea',turns:[{id:'u',role:'user',text:'Mi indicación',generation:input},{id:'a',role:'assistant',generationRequestId:'request',creationId:'first'}]},{id:'newer-chat',title:'Chat posterior',turns:[]}]};
 const view=hookView(StudyWorkspace,{detail,selectedConversationId:'chat',catalog:{classrooms:[]},onReload:async()=>{},run:async()=>assert.fail('leer no genera otra propuesta')});
 try{await view.flush();const cards=descendants(view.tree,node=>node.type==='button'&&node.props.className==='study-exact-generation-result');assert.equal(cards.length,1);assert.ok(descendants(cards[0],node=>node.type==='strong'&&node.props.children===first.title).length);cards[0].props.onClick();await view.flush();assert.equal(descendants(view.tree,node=>node.type?.name==='StudyCreationEditor')[0].props.creation.id,'first');}finally{view.close();}
});

test('tarjeta de práctica no filtra consignas, respuestas ni soluciones en el chat',async()=>{
 const {StudyWorkspace}=componentWithPorts('apps/web/src/features/study/ui/study-workspace.tsx',ports);
 const detail={...base,creations:[],practices:[{id:'practice',title:'Practicar lo aprendido',status:'ACTIVE',questions:[{id:'q',prompt:'CONSIGNA_PRIVADA',explanation:'SOLUCION_PRIVADA'}],answers:{q:'RESPUESTA_PRIVADA'}}],conversations:[{id:'chat',title:'Práctica',turns:[{id:'u',role:'user',text:'Quiero practicar',generation:{...input,kind:'QUIZ'}},{id:'a',role:'assistant',generationRequestId:'request',practiceId:'practice'}]}]};
 const view=hookView(StudyWorkspace,{detail,catalog:{classrooms:[]},onReload:async()=>{}});
 try{await view.flush();const transcript=descendants(view.tree,node=>node.type==='div'&&node.props['aria-label']==='Mensajes con Foxy')[0];const rendered=renderToStaticMarkup(transcript);assert.ok(rendered.includes('Practicar lo aprendido'));for(const secret of ['CONSIGNA_PRIVADA','SOLUCION_PRIVADA','RESPUESTA_PRIVADA'])assert.equal(rendered.includes(secret),false);assert.equal(descendants(transcript,node=>node.type?.name==='FoxyMarkdown').length,0);}finally{view.close();}
});

test('recarga pendiente bloquea doble envío y ofrece cancelar la identidad persistida',async()=>{
 let cancelled;
 const {StudyWorkspace}=componentWithPorts('apps/web/src/features/study/ui/study-workspace.tsx',ports);
 const detail={...base,creations:[],conversations:[{id:'chat',title:'Mi idea',turns:[{id:'u',role:'user',text:'Mi indicación',generation:{...input,status:'PENDING'}}]}]};
 const view=hookView(StudyWorkspace,{detail,catalog:{classrooms:[]},onReload:async()=>{},cancelGeneration:async id=>{cancelled=id;return 'CANCELLED';}});
 try{await view.flush();assert.equal(descendants(view.tree,node=>node.type==='textarea'&&node.props.id==='study-message')[0].props.disabled,true);const state=descendants(view.tree,node=>node.type?.name==='StudyGenerationStatus')[0];assert.equal(state.props.request.requestId,'request');state.props.onStop();await view.flush();assert.equal(cancelled,'request');}finally{view.close();}
});

test('Herramientas envía la descripción de la imagen y Creaciones abre el visor privado', async () => {
 const { StudyWorkspace } = componentWithPorts('apps/web/src/features/study/ui/study-workspace.tsx', ports);
 const creation = { id: 'image', title: 'Célula vegetal', markdown: '', kind: 'IMAGE' };
 const detail = { ...base, imageGenerationAvailable: true, creations: [creation], conversations: [{ id: 'chat', title: 'Dibujos', turns: [] }] };
 const calls = [];
 const view = hookView(StudyWorkspace, { detail, selectedConversationId: 'chat', catalog: { classrooms: [] }, onReload: async () => {},
  run: async (...args) => { calls.push(args); return {}; } });
 const find = (tree, predicate) => { const [node] = descendants(tree, predicate); assert.ok(node); return node; };
 const by = predicate => find(view.tree, predicate);
 const layout = () => by(node => node.type?.name === 'FoxyChatLayout');
 try {
  await view.flush();
  layout().props.onView('tools');
  await view.flush();
  find(layout().props.tools, node => node.type === 'button' && descendants(node, child => child.type === 'b' && child.props.children === 'Crear una imagen').length).props.onClick();
  await view.flush();
  const description = by(node => node.type === 'textarea' && node.props.maxLength === 1500);
  description.props.onChange({ target: { value: 'Célula vegetal ilustrada' } });
  await view.flush();
  by(node => node.type === 'form' && node.props.className === 'study-exact-tool-form').props.onSubmit({ preventDefault() {} });
  await view.flush();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'GENERATE');
  assert.deepEqual(calls[0][1], { kind: 'IMAGE', message: 'Célula vegetal ilustrada', topicIds: [], questionCount: 5, difficulty: 'MEDIUM', conversationId: 'chat' });
  layout().props.onView('creations');
  await view.flush();
  find(layout().props.creations, node => node.type === 'button' && node.props.children === 'Imágenes').props.onClick();
  await view.flush();
  find(layout().props.creations, node => node.type === 'button' && node.props.className === 'study-exact-creation-item').props.onClick();
  await view.flush();
  const preview = by(node => node.type?.name === 'StudyImagePreview');
  const image = hookView(preview.type, preview.props);
  try {
   await image.flush();
   assert.equal(find(image.tree, node => node.type === 'img' && node.props.alt === creation.title).props.src, '/api/v1/study-folders/folder/images/image');
   assert.equal(find(image.tree, node => node.type === 'a' && node.props.download).props.href, '/api/v1/study-folders/folder/images/image?mode=download');
  } finally { image.close(); }
  assert.equal(calls.length, 1, 'abrir y descargar una imagen no invoca generación');
 } finally { view.close(); }
});
