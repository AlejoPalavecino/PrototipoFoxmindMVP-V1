import test from 'node:test';
import assert from 'node:assert/strict';
import {componentWithPorts} from './foxmind-3d-flows-loader.test.mjs';
import {descendants,hookView} from './agenda-ui-helpers.test.mjs';

const source={id:'s1',version:'v1',title:'luz.pdf',available:true,readable:true,origin:'OWN',fileId:'f1'};
const units=[{id:'u1',title:'La luz',topics:[{id:'t1',title:'Exposición'},{id:'t2',title:'Contraste'},{id:'t3',title:'Apertura'}]}];
const question=(id,text)=>({id,prompt:text,type:'SINGLE',options:[{id:'a',text:'Poca luz'},{id:'b',text:'Mucho contraste'}],sourceRefs:[{id:'s1',version:'v1'}]});
const finalized={id:'p0',kind:'QUIZ',status:'FINALIZED',title:'Antes',questions:[question('q0','x')],
 result:{questions:[{id:'q0',topicId:'t1',score:1},{id:'q1',topicId:'t1',score:1},{id:'q2',topicId:'t2',score:0.5},{id:'q3',topicId:'t2',score:0},{id:'q4',topicId:'t2',score:null}]}};
const open={id:'p1',kind:'QUIZ',status:'IN_PROGRESS',title:'Exposición y contraste',questions:[question('q1','Un retrato con sombras marcadas muestra…')],answers:{}};
const future=new Date(Date.now()+3*86400000).toISOString();
const exams=[{id:'e1',timeZone:'America/Argentina/Buenos_Aires',sessions:[{id:'ss1',topicId:'t2',startAt:future,endAt:future,topicIds:['t2'],title:'Repaso',minutes:25,reminderMinutes:null},
 {id:'ss2',topicId:'t3',startAt:new Date(Date.now()+86400000).toISOString(),endAt:future,topicIds:['t3'],title:'Sin confirmar',minutes:10,reminderMinutes:null}]}];
const base={folder:{id:'folder',name:'Fotografía y luz',status:'ACTIVE',bannerKey:'x',units,linkedClassroomId:null},sources:[source],exams,scheduledReviewSessions:[{sessionId:'ss1',eventId:'ev'}],
 memory:{},practices:[finalized,open],creations:[],imageGenerationAvailable:false,conversations:[{id:'chat',title:'Repaso',turns:[]}]};
const ports={'../../../shared/use-chat-attachments':{useChatAttachments:()=>({items:[]})},'../../../../../shared-ui/use-chat-follow':{useChatFollow:()=>({})}};

function workspace(detail=base,props={}){
 const {StudyWorkspace}=componentWithPorts('apps/web/src/features/study/ui/study-workspace.tsx',ports);
 const view=hookView(StudyWorkspace,{detail,selectedConversationId:'chat',catalog:{classrooms:[]},onReload:async()=>{},run:async()=>({}),...props});
 const by=(predicate,root=view.tree)=>{const [node]=descendants(root,predicate);assert.ok(node);return node;};
 const layout=()=>by(node=>node.type?.name==='FoxyChatLayout');
 const expand=element=>element.type(element.props);
 return {view,by,layout,expand};
}
const label=node=>node.props?.['aria-label'];

test('el rail muestra los temas con su dominio real y Agregar material abre la biblioteca',async()=>{
 const {view,layout,expand}=workspace();
 try{
  await view.flush();
  const aside=layout().props.aside;assert.ok(aside);
  const rail=expand(aside);
  const topicButtons=descendants(rail,node=>node.type==='button'&&node.props.className==='study-rail-topic');
  assert.equal(topicButtons.length,3);
  const meters=descendants(rail,node=>node.type==='span'&&node.props.role==='img').map(label);
  // Exposición 2/2 correctas = 3 de 3; Contraste (0.5+0)/2 = 1 de 3; Apertura sin evidencia.
  assert.deepEqual(meters,['Dominio: 3 de 3','Dominio: 1 de 3']);
  assert.equal(descendants(rail,node=>node.type==='small'&&node.props.children==='Sin practicar').length,1);
  assert.ok(descendants(rail,node=>node.type==='section'&&label(node)==='Próximo repaso').length);
  assert.equal(descendants(rail,node=>node.type==='span'&&[node.props.children].flat().join('').includes('Sin confirmar')).length,0);
  topicButtons[1].props.onClick();await view.flush();
  const after=descendants(expand(layout().props.aside),node=>node.type==='button'&&node.props.className==='study-rail-topic');
  assert.equal(after[1].props['aria-pressed'],false);
  assert.equal(after[0].props['aria-pressed'],true);
  const add=descendants(rail,node=>node.type==='button'&&node.props.className==='study-rail-add')[0];
  add.props.onClick({currentTarget:{}});await view.flush();
  assert.ok(descendants(view.tree,node=>node.type?.name==='FoxyDialog'&&node.props.title==='Biblioteca de contexto').length);
 }finally{view.close();}
});

test('sin práctica finalizada ningún tema inventa dominio',async()=>{
 const {view,layout,expand}=workspace({...base,practices:[open],exams:[],scheduledReviewSessions:[]});
 try{
  await view.flush();
  const rail=expand(layout().props.aside);
  assert.equal(descendants(rail,node=>node.type==='span'&&node.props.role==='img').length,0);
  assert.equal(descendants(rail,node=>node.type==='small'&&node.props.children==='Sin practicar').length,3);
  assert.equal(descendants(rail,node=>node.type==='section'&&label(node)==='Próximo repaso').length,0);
 }finally{view.close();}
});

test('abrir una práctica la muestra en el panel mientras el chat sigue montado',async()=>{
 const {view,by,layout}=workspace();
 try{
  await view.flush();
  assert.equal(layout().props.panel,undefined);
  layout().props.children.props.onPractice('p1');await view.flush();
  by(node=>node.type==='button'&&node.props.className==='primary'&&descendants(view.tree,n=>n.type?.name==='Dialog'&&n.props.title==='Tu creación').length>0).props.onClick();await view.flush();
  const panel=layout().props.panel;
  assert.equal(panel.type.name,'StudyPracticeView');
  assert.equal(panel.props.practice.id,'p1');
  assert.equal(panel.props.closeLabel,'Cerrar práctica');
  assert.equal(layout().props.panelLabel,'Práctica abierta');
  assert.equal(layout().props.children.type.name,'StudyConversation','chat sigue montado');
  assert.equal(descendants(layout().props.children,node=>node.type?.name==='StudyPracticeView').length,0);
 }finally{view.close();}
});

test('los chips sobre el compositor abren la herramienta correspondiente',async()=>{
 const {view,by}=workspace();
 try{
  await view.flush();
  const chips=descendants(view.tree,node=>node.type?.name==='StudyToolChips')[0];
  assert.ok(chips);
  const buttons=descendants(chips.type(chips.props),node=>node.type==='button');
  assert.deepEqual(buttons.map(node=>node.props.children),['Entender un tema','Apunte','Esquema','Practicar','Ejercicios','Simulacro','Organizar repaso']);
  buttons.find(node=>node.props.children==='Practicar').props.onClick();await view.flush();
  by(node=>node.type?.name==='FoxyDialog'&&node.props.className==='study-exact-tool-dialog'&&node.props.title==='Practicar');
  assert.equal(by(node=>node.type==='input'&&node.props.type==='number').props.value,5);
 }finally{view.close();}
});

test('el chip Imagen sólo existe si hay generación de imágenes y Organizar repaso abre el plan',async()=>{
 const {view,by}=workspace({...base,imageGenerationAvailable:true});
 try{
  await view.flush();
  const chips=descendants(view.tree,node=>node.type?.name==='StudyToolChips')[0];
  const buttons=descendants(chips.type(chips.props),node=>node.type==='button');
  assert.equal(buttons.at(-1).props.children,'Imagen');
  buttons.find(node=>node.props.children==='Organizar repaso').props.onClick();await view.flush();
  assert.equal(descendants(view.tree,node=>node.type?.name==='FoxyDialog'&&node.props.className==='study-exact-tool-dialog').length,0);
  assert.equal(by(node=>node.type?.name==='Dialog'&&node.props.className==='parity-study-plan-dialog').props.title,'Un plan para llegar con calma');
 }finally{view.close();}
});

test('la colección vacía ofrece Crear carpeta y los temas del diálogo tienen nombre accesible',async()=>{
 const {StudyCollectionView}=componentWithPorts('apps/web/src/features/study/folders/study-folder-collection.tsx',{});
 let created=0;
 const view=hookView(StudyCollectionView,{catalog:{items:[],classrooms:[],covers:[]},onCreate:()=>{created++;},onEnter(){}});
 try{
  await view.flush();
  const [empty]=descendants(view.tree,node=>node.props?.className==='study-exact-empty');
  assert.ok(empty);
  const [button]=descendants(empty,node=>node.type==='button'&&node.props.className.includes('primary'));
  assert.ok(button);
  button.props.onClick();
  assert.equal(created,1);
 }finally{view.close();}
 const {StudyToolDialog}=componentWithPorts('apps/web/src/features/study/tools/study-tool-dialog.tsx',{});
 const dialog=StudyToolDialog({kind:'QUIZ',title:'Practicar',folderName:'F',sourceCount:1,brief:'',selected:['t1'],count:5,difficulty:'MEDIUM',topics:units[0].topics,error:'',disabled:false,onBrief(){},onSelected(){},onCount(){},onDifficulty(){},onSubmit(){},onClose(){}});
 const boxes=descendants(dialog,node=>node.type==='input'&&node.props.type==='checkbox');
 assert.deepEqual(boxes.map(node=>node.props['aria-label']),['Exposición','Contraste','Apertura']);
});
