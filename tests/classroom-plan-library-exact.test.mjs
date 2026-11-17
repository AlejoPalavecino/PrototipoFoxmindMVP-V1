import { materialsFixtureProps, libraryFixtureView } from './helpers/frontend-feature-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants, hookView } from './agenda-ui-helpers.test.mjs';

const room = { id:'aula', role:'teacher', units:[{id:'u',name:'Unidad',topics:[{id:'t',name:'Tema'}]}] };
const material = {id:'m',title:'Lectura',fileId:'f',fileName:'Lectura.pdf',extension:'pdf',sizeBytes:'2048',contentKind:'FILE',unitId:null,topicId:null,ready:true,activityIds:['a']};

test('archivo y detalles prepara sin publicar; organización es un segundo paso', async () => {
  const { MaterialForm } = loadTsModule('apps/web/src/features/materials/publishing/MaterialForm.tsx');
  const prepared=[], saved=[];
  const view=hookView(MaterialForm,materialsFixtureProps({room,api:{call:async()=>({activities:[]})},kind:'FILE',initial:{title:'Lectura'},step:'details',label:'Publicar material',onContinue:async value=>prepared.push(value),onSave:async value=>saved.push(value),onCancel(){}}));
  try {
    await view.flush();
    descendants(view.tree,n=>n.type==='form')[0].props.onSubmit({preventDefault(){}});
    await view.flush();
    assert.equal(prepared.length,1);
    assert.equal(saved.length,0);
    assert.ok(descendants(view.tree,n=>n.type==='section'&&n.props['aria-label']==='Organizar material')[0].props.hidden);
  } finally {view.close();}
});

test('biblioteca permite filtrar materiales sin unidad ni tema', async () => {
  const { Library } = loadTsModule('apps/web/src/features/materials/catalog/Library.tsx');
  const view=libraryFixtureView(Library,{room,api:{call:async()=>[material,{...material,id:'otro',unitId:'u'}]},reload:async()=>{}});
  try {
    await view.flush();
    const option=descendants(view.tree,n=>n.type==='option'&&n.props.value==='none')[0];
    assert.ok(option);
    descendants(view.tree,n=>n.type==='select')[0].props.onChange({target:{value:'none'}});
    await view.flush();
    assert.deepEqual(descendants(view.tree,n=>n.props?.['data-material-id']).map(n=>n.props['data-material-id']),['m']);
  } finally {view.close();}
});

test('lector modal muestra archivo real y actividades autorizadas vinculadas', async () => {
  const { MaterialReader } = loadTsModule('apps/web/src/features/materials/reader/MaterialReader.tsx');
  const view=hookView(MaterialReader,materialsFixtureProps({room,material,api:{fileUrl:()=>'/file',call:async()=>({activities:[{id:'a',title:'Actividad vinculada'},{id:'b',title:'Otra actividad'}]})},onClose(){},onEdit(){},onDelete(){}}));
  try {
    await view.flush();
    assert.equal(view.tree.type.name,'Dialog');
    const text=JSON.stringify(view.tree);
    assert.match(text,/Lectura.pdf/);
    assert.match(text,/Actividad vinculada/);
    assert.doesNotMatch(text,/Otra actividad/);
  } finally {view.close();}
});

test('plan replica selección y marcado del detalle sin controles ajenos a la referencia', async () => {
  const { PlanWorkspace } = loadTsModule('apps/web/src/features/curriculum/plan/PlanWorkspace.tsx', {
    stubs: {'./use-plan-workspace.ts': { usePlanWorkspace:()=>({data:{materials:[],activities:[]}}) }},
  });
  for (const role of ['teacher','student']) {
    const changes=[];
    const view=hookView(PlanWorkspace,{room:{...room,role,units:[{id:'u',name:'Unidad',topics:[{id:'t',name:'Primero',status:'PENDING'},{id:'next',name:'Segundo',status:'NEXT'}]}]},api:{},onOpenActivity(){},onTopicState:(...args)=>changes.push(args),canPreviewMaterial:()=>false,activityTypeLabels:{}});
    try {
      await view.flush();
      assert.equal(descendants(view.tree,n=>n.props?.['data-topic-choice']&&n.props['aria-current'])[0].props['data-topic-choice'],'t');
      assert.equal(descendants(view.tree,n=>n.type==='input'&&n.props.type==='checkbox').length,0);
      assert.doesNotMatch(JSON.stringify(view.tree),/Filtrar temas|Crear actividad|Siguiente →/);
      const mark=descendants(view.tree,n=>n.type==='button'&&Object.hasOwn(n.props,'aria-pressed'));
      assert.equal(mark.length,role==='teacher'?1:0);
      if (mark[0]) {mark[0].props.onClick();assert.deepEqual(changes,[['t','TAUGHT']]);}
      descendants(view.tree,n=>n.props?.['data-topic-choice']==='next')[0].props.onClick();
      await view.flush();
      assert.equal(descendants(view.tree,n=>n.props?.['data-topic-choice']&&n.props['aria-current'])[0].props['data-topic-choice'],'next');
    } finally {view.close();}
  }
});

test('plan asocia materiales de tema o unidad y actividades interunidad sin incluir otros recursos', async () => {
  const { PlanWorkspace } = loadTsModule('apps/web/src/features/curriculum/plan/PlanWorkspace.tsx', {stubs:{'./use-plan-workspace.ts':{usePlanWorkspace:()=>({data:{
    materials:[{...material,id:'tema',unitId:'u',topicId:'t'},{...material,id:'unidad',unitId:'u',topicId:null},{...material,id:'otro',unitId:'u',topicId:'otro'},{...material,id:'reemplazado',unitId:'u',supersededBy:'nuevo'}],
    activities:[{id:'interunidad',title:'Repaso',type:'PRACTICAL',topicIds:['otro','t']},{id:'ajena',title:'Fuera',type:'PRACTICAL',topicIds:['otro']}],
  }})}}});
  const opened=[],added=[];
  const view=hookView(PlanWorkspace,{room,api:{},onOpenActivity:id=>opened.push(id),onOpenMaterial:id=>opened.push(id),onAddMaterial:context=>added.push(context),canPreviewMaterial:()=>false,activityTypeLabels:{PRACTICAL:'Trabajo práctico'}});
  try {
    await view.flush();
    const open=descendants(view.tree,n=>n.type==='button'&&n.props['aria-label']?.startsWith('Abrir'));
    assert.equal(open.length,3);
    open.forEach(n=>n.props.onClick());
    assert.deepEqual(opened,['tema','unidad','interunidad']);
    descendants(view.tree,n=>n.type==='button'&&n.props['aria-label']==='Subir archivo para Tema')[0].props.onClick();
    assert.deepEqual(added,[{unitId:'u',topicIds:['t']}]);
  } finally {view.close();}
});

test('biblioteca presenta Abrir por fila y carga de archivo en ambos roles autorizados', async () => {
  const { Library } = loadTsModule('apps/web/src/features/materials/catalog/Library.tsx');
  for (const role of ['teacher','student']) {
    const view=libraryFixtureView(Library,{room:{...room,role},api:{call:async()=>[material]},reload:async()=>{}});
    try {
      await view.flush();
      const buttons=descendants(view.tree,n=>n.type==='button');
      assert.equal(buttons.filter(n=>n.props['aria-label']==='Abrir material: Lectura').length,1);
      assert.equal(buttons.filter(n=>n.props['aria-label']?.startsWith('Editar material:')||n.props['aria-label']?.startsWith('Eliminar material:')).length,0);
      assert.equal(buttons.filter(n=>n.props.children?.some?.(item=>item==='Subir archivo')).length,role==='teacher'?1:0);
    } finally {view.close();}
  }
});

test('lector aislado abre ID real sobre Plan sin mostrar Biblioteca y cierra por callback', async () => {
  const { Library } = loadTsModule('apps/web/src/features/materials/catalog/Library.tsx');
  let closed=0;
  const view=libraryFixtureView(Library,{room,api:{call:async()=>[material]},reload:async()=>{},targetMaterialId:'m',presentation:'reader',onReaderClose:()=>closed++});
  try {
    await view.flush();
    assert.equal(view.tree.type.name,'MaterialReader');
    assert.equal(view.tree.props.material.id,'m');
    assert.equal(descendants(view.tree,n=>n.type==='input'&&n.props.type==='search').length,0);
    view.tree.props.onClose(); await view.flush();
    assert.equal(closed,1);
    assert.equal(view.tree,null);
  } finally {view.close();}
});

test('carga aislada conserva tema, protege descarte y publica antes de cerrar el overlay', async () => {
  const { Library } = loadTsModule('apps/web/src/features/materials/catalog/Library.tsx');
  const writes=[];let closed=0,reloads=0;
  const props={room,api:{call:async (...args)=>{if(args[1]==='POST')writes.push(args);return [];},uploadClassroom:async()=>({id:'f',name:'Guía.pdf',ready:true})},reload:async()=>{reloads++;},uploadContext:{unitId:'u',topicIds:['t']},presentation:'upload',onUploadClose:()=>closed++};
  const view=libraryFixtureView(Library,props);
  const form=()=>descendants(view.tree,n=>n.type?.name==='MaterialForm')[0];
  const dialog=()=>descendants(view.tree,n=>n.type?.name==='Dialog')[0];
  try {
    await view.flush();
    assert.equal(descendants(view.tree,n=>n.type==='input'&&n.props.type==='search').length,0);
    assert.deepEqual(form().props.initial,{title:'',unitId:'u',topicId:'t'});
    descendants(view.tree,n=>n.type==='input'&&n.props.type==='file')[0].props.onChange({target:{files:[{name:'Guía.pdf'}],value:''}});await view.flush();
    dialog().props.onClose();await view.flush();
    assert.equal(dialog().props.title,'Descartar el material sin publicar');assert.equal(closed,0);
    descendants(view.tree,n=>n.type==='button'&&n.props.children==='Seguir editando')[0].props.onClick();await view.flush();
    const metadata={title:'Guía',unitId:'u',topicId:'t'};
    await form().props.onContinue(metadata);await view.flush();assert.equal(writes.length,0);
    await form().props.onSave(metadata);await view.flush();
    assert.equal(writes.length,1);assert.equal(writes[0][2].operation.topicId,'t');assert.equal(closed,1);assert.equal(reloads,1);
    assert.equal(descendants(view.tree,n=>n.type?.name==='Dialog').length,0);
  } finally {view.close();}
});

test('publicación confirmada conserva recuperación de refresco sin ofrecer publicar otra vez', async () => {
  const { Library } = loadTsModule('apps/web/src/features/materials/catalog/Library.tsx');
  let writes=0,closed=0,failReload=true;
  const props={room,api:{call:async (...args)=>{if(args[1]==='POST')writes++;return [];},uploadClassroom:async()=>({id:'f',name:'Guía.pdf',ready:true})},reload:async()=>{if(failReload)throw Error('offline');},presentation:'upload',onUploadClose:()=>closed++};
  const view=libraryFixtureView(Library,props);
  try {
    await view.flush();
    descendants(view.tree,n=>n.type==='input'&&n.props.type==='file')[0].props.onChange({target:{files:[{name:'Guía.pdf'}],value:''}});await view.flush();
    const form=()=>descendants(view.tree,n=>n.type?.name==='MaterialForm')[0];
    const metadata={title:'Guía',unitId:'u',topicId:'t'};
    await form().props.onContinue(metadata);await view.flush();
    await form().props.onSave(metadata);await view.flush();
    assert.equal(writes,1);assert.equal(closed,0);
    assert.equal(form(),undefined);
    assert.match(JSON.stringify(view.tree),/Material publicado/);
    failReload=false;
    descendants(view.tree,n=>n.type==='button'&&n.props.children==='Actualizar Plan y cerrar')[0].props.onClick();await view.flush();
    assert.equal(writes,1);assert.equal(closed,1);
  } finally {view.close();}
});

test('avance guardado con refresco fallido ofrece recuperar sin reenviar el marcado', async () => {
  const { Plan } = loadTsModule('apps/web/src/features/curriculum/plan/Plan.tsx');
  let writes=0,reloads=0;
  const view=hookView(Plan,{room:{...room,units:[{id:'u',name:'Unidad',topics:[{id:'t',name:'Tema',status:'PENDING'}]}]},api:{call:async()=>writes++},reload:async()=>{reloads++;if(reloads===1)throw Error('sin conexión');},canPreviewMaterial:()=>false,activityTypeLabels:{}});
  try {
    await view.flush();
    const workspace=()=>descendants(view.tree,n=>n.type?.name==='PlanWorkspace')[0];
    await workspace().props.onTopicState('t','TAUGHT');await view.flush();
    assert.equal(writes,1);assert.equal(workspace().props.busy,true);
    const retry=descendants(view.tree,n=>n.type==='button'&&n.props.children==='Actualizar Plan')[0];assert.ok(retry);
    retry.props.onClick();await view.flush();
    assert.equal(writes,1);assert.equal(reloads,2);assert.equal(workspace().props.busy,false);
  } finally {view.close();}
});
