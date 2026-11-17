import test from 'node:test';
import assert from 'node:assert/strict';
import {componentWithPorts} from './foxmind-3d-flows-loader.test.mjs';
import {descendants,hookView} from './agenda-ui-helpers.test.mjs';

const previousWindow=globalThis.window;
test.before(()=>{globalThis.window={addEventListener(){},removeEventListener(){}};});
test.after(()=>{globalThis.window=previousWindow;});
const text=node=>Array.isArray(node.props.children)?node.props.children.filter(item=>typeof item==='string').join(''):node.props.children;
const button=(tree,label)=>descendants(tree,node=>node.type==='button'&&(node.props['aria-label']??text(node))===label)[0];

test('guardar y salir conserva materia y paso y retomar abre el paso persistido',async()=>{
 const calls=[];let saved=0;
 const folder={id:'folder',name:'Fotografía',subject:'Artes',academicYear:2026,bannerKey:'literature',status:'DRAFT',revision:'r',units:[],linkedClassroomId:null,planFileId:null,wizardStep:2};
 const {StudyWizard}=componentWithPorts('apps/web/src/features/study/folders/study-folder-wizard.tsx',{'../api.ts':{createStudyClient:()=>({update:async(id,data)=>{calls.push([id,data]);return{folder:{...folder,...data}};}})}});
 const view=hookView(StudyWizard,{catalog:{classrooms:[]},folder,onClose(){},onCreated(){},onSaved(){saved++;}});
 try{await view.flush();assert.equal(descendants(view.tree,node=>node.type==='form')[0].props['data-wizard-step'],2);button(view.tree,'Guardar y salir').props.onClick();await view.flush();assert.equal(calls[0][1].subject,'Artes');assert.equal(calls[0][1].wizardStep,2);assert.equal(saved,1);}finally{view.close();}
});

test('renombrar envía el título revisado al comando y conserva historial y borrador de chat',async()=>{
 const calls=[];
 const {StudyWorkspace}=componentWithPorts('apps/web/src/features/study/ui/study-workspace.tsx',{'../../../shared/use-chat-attachments':{useChatAttachments:()=>({items:[]})},'../../../../../shared-ui/use-chat-follow':{useChatFollow:()=>({})}});
 const detail={folder:{id:'folder',name:'Lectura',status:'ACTIVE',units:[]},conversations:[{id:'chat',title:'Original',messages:[{role:'user',content:'Pregunta conservada'}]}],sources:[],creations:[],exams:[],practices:[]};
 const view=hookView(StudyWorkspace,{detail,catalog:{classrooms:[]},run:async(...args)=>calls.push(args)});
 try{await view.flush();descendants(view.tree,node=>node.type==='textarea')[0].props.onChange({target:{value:'Mi siguiente pregunta'}});await view.flush();const layout=descendants(view.tree,node=>node.type?.name==='FoxyChatLayout')[0];button(layout.props.history,'Renombrar Original').props.onClick();await view.flush();const dialog=descendants(view.tree,node=>node.type?.name==='Dialog'&&node.props.title==='Renombrar conversación')[0];descendants(dialog,node=>node.type==='input')[0].props.onChange({target:{value:'Nuevo nombre'}});await view.flush();const form=descendants(view.tree,node=>node.type?.name==='Dialog'&&node.props.title==='Renombrar conversación')[0];descendants(form,node=>node.type==='form')[0].props.onSubmit({preventDefault(){}});await view.flush();assert.equal(calls[0][0],'RENAME_CONVERSATION');assert.deepEqual(calls[0][1],{conversationId:'chat',title:'Nuevo nombre'});assert.equal(descendants(view.tree,node=>node.type==='textarea')[0].props.value,'Mi siguiente pregunta');assert.equal(detail.conversations[0].messages[0].content,'Pregunta conservada');}finally{view.close();}
});

const importedFolder={id:'folder',name:'Mi carpeta',subject:'Artes',academicYear:2026,bannerKey:'literature',status:'DRAFT',revision:'r-a',wizardStep:2,linkedClassroomId:'class-a',planFileId:null,planOrigin:{classroomId:'class-a',classroomRevision:'a1'},units:[{id:'unit-a',title:'Plan A',topics:[{id:'topic-a',title:'Tema A'}]}]};
const classCatalog={classrooms:[{id:'class-a',name:'Aula A',academicYear:2026},{id:'class-b',name:'Aula B',academicYear:2026}]};
async function chooseOtherClass(view){button(view.tree,'Atrás').props.onClick();await view.flush();descendants(view.tree,node=>node.type==='input'&&node.props.name==='study-classroom')[1].props.onChange();await view.flush();}

for(const exit of [false,true])test(`cambiar el aula importada guarda vínculo y plan juntos al ${exit?'guardar y salir':'continuar'}`,async()=>{
 const calls=[];let state=structuredClone(importedFolder),closed=0;
 const {StudyWizard}=componentWithPorts('apps/web/src/features/study/folders/study-folder-wizard.tsx',{'../api.ts':{createStudyClient:()=>({get:async()=>({folder:state}),update:async(id,data)=>{calls.push(['PATCH',data]);state={...state,...data,revision:'saved'};return{folder:state};},command:async(id,revision,action,data)=>{calls.push([action,data]);assert.equal(revision,'r-a');assert.deepEqual(data,{classroomId:'class-b'});state={...state,revision:'r-b',linkedClassroomId:'class-b',planOrigin:{classroomId:'class-b',classroomRevision:'b1'},units:[{id:'unit-b',title:'Plan B',topics:[{id:'topic-b',title:'Tema B'}]}]};return{folder:state};}})}});
 const view=hookView(StudyWizard,{catalog:classCatalog,folder:importedFolder,onClose(){},onCreated(){},onSaved(){closed++;}});
 try{await view.flush();await chooseOtherClass(view);if(exit)button(view.tree,'Guardar y salir').props.onClick();else descendants(view.tree,node=>node.type==='form')[0].props.onSubmit({preventDefault(){}});await view.flush();
  assert.equal(calls[0][0],'IMPORT_CLASSROOM_PLAN');assert.equal(state.linkedClassroomId,'class-b');assert.equal(state.planOrigin.classroomId,'class-b');assert.equal(state.units[0].title,'Plan B');
  if(exit){assert.equal(calls[1][0],'PATCH');assert.equal(calls[1][1].revision,'r-b');assert.equal(calls[1][1].units[0].title,'Plan B');assert.equal(closed,1);}else{assert.equal(calls.length,1);assert.equal(descendants(view.tree,node=>node.type?.name==='WizardCurriculum')[0].props.units[0].name,'Plan B');}
 }finally{view.close();}
});

test('si falla importar otra aula conserva el vínculo y plan anterior y permite reintentar',async()=>{
 const calls=[];let failed=true,state=structuredClone(importedFolder);
 const {StudyWizard}=componentWithPorts('apps/web/src/features/study/folders/study-folder-wizard.tsx',{'../api.ts':{createStudyClient:()=>({get:async()=>({folder:state}),update:async(id,data)=>{calls.push(['PATCH',data]);state={...state,...data};return{folder:state};},command:async(id,revision,action,data)=>{calls.push([action,data]);if(failed)throw new Error('Aula temporalmente no disponible');state={...state,linkedClassroomId:'class-b',planOrigin:{classroomId:'class-b',classroomRevision:'b1'},units:[{id:'unit-b',title:'Plan B',topics:[{id:'topic-b',title:'Tema B'}]}]};return{folder:state};}})}});
 const view=hookView(StudyWizard,{catalog:classCatalog,folder:importedFolder,onClose(){},onCreated(){}});
 try{await view.flush();await chooseOtherClass(view);descendants(view.tree,node=>node.type==='form')[0].props.onSubmit({preventDefault(){}});await view.flush();assert.equal(state.linkedClassroomId,'class-a');assert.equal(state.units[0].title,'Plan A');assert.equal(calls.some(call=>call[0]==='PATCH'),false);assert.equal(descendants(view.tree,node=>node.type==='form')[0].props['data-wizard-step'],1);failed=false;descendants(view.tree,node=>node.type==='form')[0].props.onSubmit({preventDefault(){}});await view.flush();assert.equal(state.linkedClassroomId,'class-b');assert.equal(descendants(view.tree,node=>node.type?.name==='WizardCurriculum')[0].props.units[0].name,'Plan B');}finally{view.close();}
});

test('guardar un borrador sin plan previo no obliga a importar un aula todavía',async()=>{
 const calls=[];let saved=0;
 const folder={...importedFolder,units:[],planOrigin:undefined,wizardStep:1};
 const {StudyWizard}=componentWithPorts('apps/web/src/features/study/folders/study-folder-wizard.tsx',{'../api.ts':{createStudyClient:()=>({get:async()=>({folder}),update:async(id,data)=>{calls.push(['PATCH',data]);return{folder:{...folder,...data}};},command:async()=>{calls.push(['IMPORT']);throw new Error('El aula todavía no tiene plan');}})}});
 const view=hookView(StudyWizard,{catalog:classCatalog,folder,onClose(){},onCreated(){},onSaved(){saved++;}});
 try{await view.flush();button(view.tree,'Guardar y salir').props.onClick();await view.flush();assert.equal(calls.length,1);assert.equal(calls[0][0],'PATCH');assert.deepEqual(calls[0][1].units,[]);assert.equal(saved,1);}finally{view.close();}
});
