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

const bold=node=>descendants(node,child=>child.type==='b')[0]?.props.children;
const intentsOf=tree=>descendants(tree,node=>node.type==='button'&&['Entender un tema','Practicar','Preparar una evaluación','Organizar mi repaso'].includes(bold(node)));
const moreTools=tree=>descendants(descendants(tree,node=>node.props?.role==='group'&&node.props['aria-label']==='Más herramientas')[0],node=>node.type==='button').map(node=>[node.props.children].flat().at(-1));

test('la bienvenida ofrece cuatro intenciones y elegir una monta su formulario sobre el compositor',async()=>{
 const {view,by,layout}=workspace();
 try{
  await view.flush();
  const intents=intentsOf(view.tree);
  assert.deepEqual(intents.map(bold),['Entender un tema','Practicar','Preparar una evaluación','Organizar mi repaso']);
  assert.deepEqual(moreTools(view.tree),['Preparar un apunte','Conectar ideas','Crear ejercicios']);
  intents[1].props.onClick();await view.flush();
  const dock=by(node=>node.type?.name==='StudyToolDock');
  assert.equal(dock.props.kind,'QUIZ');assert.equal(dock.props.count,5);
  assert.equal(descendants(view.tree,node=>node.type?.name==='FoxyDialog').length,0,'no abre un segundo cuadro modal');
  assert.equal(descendants(view.tree,node=>node.type==='textarea').length,1,'un solo cuadro de texto');
  const submit=by(node=>node.type==='button'&&node.props.type==='submit');
  assert.equal([submit.props.children].flat()[0],'Preparar práctica');
  const chosen=layout().props.aside.props.selected;
  const chips=descendants(view.tree,node=>node.type==='button'&&String(node.props['aria-label']).startsWith('Quitar ')).map(label);
  assert.deepEqual(chips,units[0].topics.filter(topic=>chosen.includes(topic.id)).map(topic=>'Quitar '+topic.title));
 }finally{view.close();}
});

test('Imagen aparece sólo con generación de imágenes y Organizar mi repaso abre el plan',async()=>{
 const {view,by,layout}=workspace({...base,imageGenerationAvailable:true});
 try{
  await view.flush();
  assert.equal(moreTools(view.tree).at(-1),'Crear una imagen');
  layout().props.onView('tools');await view.flush();
  const plan=descendants(layout().props.tools,node=>node.type==='button'&&bold(node)==='Organizar mi repaso')[0];
  plan.props.onClick();await view.flush();
  assert.equal(descendants(view.tree,node=>node.type?.name==='StudyToolDock').length,0);
  assert.equal(by(node=>node.type?.name==='Dialog'&&node.props.className==='parity-study-plan-dialog').props.title,'Un plan para llegar con calma');
  assert.deepEqual(by(node=>node.type?.name==='StudyExamPlanner').props.initialRequest.topicIds,layout().props.aside.props.selected,'parte de los temas elegidos en el riel');
 }finally{view.close();}
});

test('el riel se pliega a una tira con los temas elegidos, el repaso y los materiales',async()=>{
 const {view,layout,expand}=workspace();
 try{
  await view.flush();
  assert.equal(layout().props.asideFoldKey,'foxmind:study-rail');
  const chosen=layout().props.aside.props.selected.length;
  const mini=expand(layout().props.asideMini);
  assert.deepEqual(descendants(mini,node=>node.type==='button').map(label),
   [`Temas: ${chosen?chosen+' elegidos':'todos'}. Cambiar temas`,'Organizar mi repaso','Materiales: 1']);
 }finally{view.close();}
});

test('el resultado lleva a practicar lo que falló o a organizar el repaso con esos temas',async()=>{
 const {view,by,layout}=workspace();
 const openFinished=async()=>{
  layout().props.children.props.onPractice('p0');await view.flush();
  by(node=>node.type==='button'&&node.props.className==='primary'&&descendants(view.tree,n=>n.type?.name==='Dialog'&&n.props.title==='Tu creación').length>0).props.onClick();await view.flush();
  return layout().props.panel;
 };
 try{
  await view.flush();
  let panel=await openFinished();
  assert.equal(panel.props.practice.id,'p0');
  panel.props.onPracticeMissed(['t2','borrado']);await view.flush();
  assert.equal(layout().props.panel,undefined,'cierra la práctica');
  const dock=by(node=>node.type?.name==='StudyToolDock');
  assert.equal(dock.props.kind,'QUIZ');
  assert.deepEqual(dock.props.selected,['t2'],'sólo los temas que fallaron y siguen en la carpeta');
  panel=await openFinished();
  panel.props.onPlanReview(['t2']);await view.flush();
  const planner=by(node=>node.type?.name==='StudyExamPlanner');
  assert.deepEqual(planner.props.initialRequest.topicIds,['t2']);
  assert.equal(planner.props.examId,undefined,'abre un plan nuevo, no uno guardado');
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
 const {StudyChatComposer}=componentWithPorts('apps/web/src/features/study/conversations/presentation/study-chat-composer.tsx',{});
 const dropped=[];
 const composer=StudyChatComposer({text:'',pending:null,busy:false,active:true,generationBlocked:false,attachmentsBusy:false,sourceCount:1,folderName:'F',topics:units[0].topics.slice(0,2),onDropTopic:id=>dropped.push(id),onText(){},onSend:async()=>{},onLibrary(){},onAttach:async()=>{}});
 const chips=descendants(composer,node=>node.type==='button'&&String(node.props['aria-label']).startsWith('Quitar '));
 assert.deepEqual(chips.map(node=>node.props['aria-label']),['Quitar Exposición','Quitar Contraste']);
 chips[1].props.onClick();assert.deepEqual(dropped,['t2']);
});

