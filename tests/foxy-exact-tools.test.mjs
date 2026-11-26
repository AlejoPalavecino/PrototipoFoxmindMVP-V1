import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import assert from 'node:assert/strict';
import { componentWithPorts } from './foxmind-3d-flows-loader.test.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

test('tool setup does not send an empty brief and preserves it after a rejected start',async()=>{
  const {FoxyToolDialog}=componentWithPorts('apps/web/src/features/foxy/tools/foxy-tool-dialog.tsx',{});
  const sent=[],closed=[];
  const view=hookView(FoxyToolDialog,{title:'Preparar un apunte',contextName:'General',materialCount:0,topics:[{id:'topic',name:'Luz'}],onPrepare:async(...args)=>{sent.push(args);return false;},onClose:()=>closed.push(true)});
  try{
    await view.flush();
    const form=()=>descendants(view.tree,n=>n.type==='form')[0];
    form().props.onSubmit({preventDefault(){}});await view.flush();assert.deepEqual(sent,[]);
    descendants(view.tree,n=>n.type==='textarea')[0].props.onChange({target:{value:'Explicar la luz'}});await view.flush();
    form().props.onSubmit({preventDefault(){}});await view.flush();
    assert.deepEqual(sent,[['Explicar la luz',['topic']]]);assert.deepEqual(closed,[]);
    assert.equal(descendants(view.tree,n=>n.type==='textarea')[0].props.value,'Explicar la luz');
  }finally{view.close();}
});

test('new chat keeps its selected classroom while starting with an empty draft',async()=>{
  const {FoxyWorkspace}=componentWithPorts('apps/web/src/features/foxy/workspace/foxy-workspace.tsx',{});
  const state={current:{id:'chat',title:'Clase',context:{kind:'CLASSROOM',classroomId:'room'}},conversations:[],turns:[],pending:null,activeTurn:null,busy:false,nextAfterSequence:null,selection:{mode:'ALL_CLASSROOM',topicIds:[],sourceIds:[]},curriculum:{classroomTitle:'Ciencias',canGenerate:true,units:[]},capabilities:{textGeneration:{enabled:true}}};
  const view=hookView(FoxyWorkspace,{state,controller:{},classrooms:[{id:'room',name:'Ciencias'}]});
  try{await view.flush();descendants(view.tree,n=>n.type?.name==='FoxyChatLayout')[0].props.onNew();await view.flush();
    const context=descendants(view.tree,n=>n.type?.name==='FoxyChatLayout')[0].props.context;
    assert.equal(context.props['data-context-kind'],'CLASSROOM');
    assert.equal(descendants(view.tree,n=>n.type==='textarea')[0].props.value,'');
  }finally{view.close();}
});

test('tool generation sends the actual brief with its purpose without adding visible instructions',async()=>{
  const {FoxyWorkspace}=componentWithPorts('apps/web/src/features/foxy/workspace/foxy-workspace.tsx',{});
  const sent=[],state={current:{id:'chat',title:'Clase',context:{kind:'GENERAL'}},conversations:[],turns:[],pending:null,activeTurn:null,busy:false,nextAfterSequence:null,selection:{topicIds:[],sourceIds:[]},curriculum:null,capabilities:{textGeneration:{enabled:true}}};
  const view=hookView(FoxyWorkspace,{state,controller:{send:async(...args)=>{sent.push(args);return 'accepted';}},classrooms:[]});
  try{await view.flush();const layout=descendants(view.tree,n=>n.type?.name==='FoxyChatLayout')[0];
    descendants(layout.props.tools,n=>n.type==='button'&&renderToStaticMarkup(n).includes('Preparar un apunte'))[0].props.onClick();await view.flush();
    const dialog=descendants(view.tree,n=>n.type?.name==='FoxyToolDialog')[0];assert.ok(dialog);
    assert.equal(await dialog.props.onPrepare('Una explicación sobre la luz',[]),true);
    assert.deepEqual(sent,[['STUDY_MATERIAL','Una explicación sobre la luz',{topicIds:[],sourceIds:[]}]]);
  }finally{view.close();}
});
