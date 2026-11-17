import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { componentWithPorts } from './foxmind-3d-flows-loader.test.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
import { createFoxyVisualController } from '../apps/web/src/features/foxy/visuals/foxy-visual-controller.ts';
import { createFoxyChatController } from '../apps/web/src/features/foxy/conversations/foxy-chat-controller.ts';

test('visual setup chooses topics locally and sends only checked IDs on explicit submit', async () => {
  const topics = [{ id: randomUUID(), name: 'Luz' }, { id: randomUUID(), name: 'Sonido' }], calls = [];
  const { FoxyVisualWorkspace } = componentWithPorts('apps/web/src/features/foxy/visuals/foxy-visual-workspace.tsx', {});
  const view = hookView(FoxyVisualWorkspace, { topics, contextName: 'Ciencias', materialCount: 2, kind: 'DIAGRAM', prompt: 'Comparar ideas', aspectRatio: '1:1', jobs: [], selectedId: null,
    busy: false, error: null, capabilities: { IMAGE: true, DIAGRAM: true }, assetFileUrl() {}, actions: { setKind() {}, setPrompt() {}, setAspectRatio() {}, start: ids => calls.push(ids) } });
  try {
    await view.flush(); const checkboxes = () => descendants(view.tree, n => n.type === 'input' && n.props.type === 'checkbox');
    assert.equal(checkboxes().length, 2); assert.ok(checkboxes().every(node => node.props.checked));
    checkboxes()[1].props.onChange(); await view.flush(); assert.deepEqual(calls, []);
    descendants(view.tree, n => n.type === 'form')[0].props.onSubmit({ preventDefault() {} });
    assert.deepEqual(calls, [[topics[0].id]]);
  } finally { view.close(); }
});

test('visual controller freezes explicit selection in the actual request and preserves it for retry', async () => {
  const conversation = { id: randomUUID(), revision: '0', context: { kind: 'CLASSROOM', classroomId: randomUUID() } }, calls = [];
  const selection = { topicIds: [randomUUID()], sourceIds: [`material:${randomUUID()}`] };
  const controller = createFoxyVisualController({ current: () => ({ conversation, selection: { mode: 'ALL_CLASSROOM', topicIds: [], sourceIds: [] }, canGenerate: true, busy: false, enabled: { IMAGE: true, DIAGRAM: true } }),
    onChange() {}, onRevision() {}, client: { listVisuals: async () => ({ items: [] }), startVisual: async (_id, input) => { calls.push(input); throw Object.assign(new Error(), { code: 'SERVICE_UNAVAILABLE' }); } } });
  try {
    controller.syncContext(); controller.setPrompt('Comparar ideas'); await controller.start(selection);
    assert.deepEqual(calls[0].selection, selection);
    selection.topicIds.push(randomUUID()); await controller.retry(); assert.deepEqual(calls[1], calls[0]); assert.equal(calls[1].selection.topicIds.length, 1);
  } finally { controller.dispose(); }
});

test('narrowing full-classroom topics resolves actual sources without changing chat selection', async () => {
  const conversation = { id: randomUUID(), title: 'Ciencias', revision: '0', context: { kind: 'CLASSROOM', classroomId: randomUUID() } }, topics = [randomUUID(), randomUUID()], requests = [];
  const sources = { PLAN: [{ sourceId: `plan:${randomUUID()}`, available: true }], MATERIAL: [{ sourceId: `material:${randomUUID()}`, available: true }, { sourceId: `material:${randomUUID()}`, available: false }], ACTIVITY: [{ sourceId: `activity:${randomUUID()}`, available: true }] };
  const controller = createFoxyChatController({ onChange() {}, client: {
    capabilities: async () => ({}), listConversations: async () => ({ items: [conversation], next: null }), listTurns: async () => ({ items: [], nextAfterSequence: null }),
    curriculum: async () => ({ canGenerate: true, units: [{ topics: topics.map(id => ({ id })) }] }),
    sources: async (_id, { kind }) => { requests.push(kind); return { items: sources[kind], next: null }; },
  } });
  try {
    await controller.init(); await controller.select(conversation.id); controller.setFullClassroom(true);
    const before = structuredClone(controller.getState().selection);
    assert.deepEqual(await controller.resolveToolSelection([topics[0]]), { topicIds: [topics[0]], sourceIds: [sources.PLAN[0].sourceId, sources.MATERIAL[0].sourceId, sources.ACTIVITY[0].sourceId] });
    assert.deepEqual(controller.getState().selection, before); assert.deepEqual(requests, ['PLAN', 'MATERIAL', 'ACTIVITY']);
  } finally { controller.dispose(); }
});

test('session wires local visual topics to a resolved request and preserves the form when source loading fails', async () => {
  const topics=[{id:randomUUID(),name:'Luz'},{id:randomUUID(),name:'Sonido'}],calls=[];
  const chat={current:{id:randomUUID(),context:{kind:'CLASSROOM',classroomId:randomUUID()},revision:'0'},selection:{mode:'ALL_CLASSROOM',topicIds:[],sourceIds:[]},
    curriculum:{canGenerate:true,classroomTitle:'Ciencias',units:[{topics}]},capabilities:{diagramGeneration:{enabled:true},imageGeneration:{enabled:true}}};
  const state={chat,classrooms:[],visual:{jobs:[],kind:'DIAGRAM',prompt:'Comparar ideas',aspectRatio:'1:1',selectedId:null,busy:false}},selection={topicIds:[topics[0].id],sourceIds:[`material:${randomUUID()}`]};
  let fail=true;
  const runtime={getState:()=>state,assetFileUrl:()=>'',chat:{resolveToolSelection:async ids=>{calls.push(['resolve',ids]);return fail?undefined:selection;}},
    visual:{getState:()=>state.visual,start:async value=>{calls.push(['start',value]);state.visual.jobs=[{id:'new-job'}];}}};
  function Panel(){return null;}
  const {FoxyWorkspaceSession}=componentWithPorts('apps/web/src/application/workflows/foxy-workspace/FoxyWorkspaceSession.tsx',{
    './foxy-workspace':{useFoxyWorkspace:()=>({state,runtime,initializing:false})},
    '../../../features/foxy/index.ts':{...componentWithPorts('apps/web/src/features/foxy/index.ts',{}),useFoxyWorkspaceActions:()=>({actions:{chat:{}},ui:{}}),FoxyWorkspace:()=>null,FoxyVisualWorkspace:Panel},
  });
  const view=hookView(FoxyWorkspaceSession,{subjectId:'teacher',onIdentityRequired(){}});
  const panel=()=>descendants(view.tree,node=>node.type===Panel)[0]?.props;
  try{
    await view.flush();descendants(view.tree,node=>typeof node.props.onOpenVisual==='function')[0].props.onOpenVisual(undefined,{materialCount:2});await view.flush();
    assert.deepEqual(panel().topics,topics);assert.equal(panel().contextName,'Ciencias');assert.equal(panel().materialCount,2);assert.deepEqual(calls,[]);
    panel().actions.start([topics[0].id]);await view.flush();assert.match(panel().error,/Tu idea sigue acá/);assert.equal(panel().prompt,'Comparar ideas');assert.equal(calls.length,1);
    fail=false;panel().actions.start([topics[0].id]);await view.flush();assert.deepEqual(calls.at(-1),['start',selection]);
  }finally{view.close();}
});

test('fresh classroom draft loads topics before generation and resolves full sources after conversation creation', async () => {
  const room=randomUUID(),topic=randomUUID(),otherTopic=randomUUID(),calls=[],selection={topicIds:[topic],sourceIds:[`material:${randomUUID()}`]};
  const chat={current:{id:'previous',context:{kind:'GENERAL'}},selection:{topicIds:[],sourceIds:[]},capabilities:{diagramGeneration:{enabled:true},imageGeneration:{enabled:true}}};
  const state={chat,classrooms:[],contextClassrooms:[{id:room,name:'Ciencias'}],visual:{jobs:[],kind:'DIAGRAM',prompt:'',aspectRatio:'1:1',busy:false}};
  const runtime={getState:()=>state,assetFileUrl:()=>'',chat:{resolveToolSelection:async(ids,base)=>{calls.push(['resolve',ids,base]);return selection;}},
    visual:{setKind(){},setAspectRatio(){},setPrompt(){},start:value=>calls.push(['start',value])}};
  const actions={chat:{},prepareVisualConversation:async(input,selected)=>{calls.push(['create',input.context]);chat.current={id:'new',context:input.context};await selected('new');return true;}};
  function Panel(){return null;}
  const {FoxyWorkspaceSession}=componentWithPorts('apps/web/src/application/workflows/foxy-workspace/FoxyWorkspaceSession.tsx',{
    './foxy-workspace':{useFoxyWorkspace:()=>({state,runtime,initializing:false})},
    '../../clients/classroom-client':{createWebClassroomClient:()=>({call:async path=>path.endsWith('/library')?[]:path.endsWith('/activities')?{activities:[]}:{role:'teacher',archived:false,units:[{name:'Unidad',topics:[{id:topic,name:'Luz'},{id:otherTopic,name:'Sonido'}]}]}})},
    '../../../features/foxy/index.ts':{...componentWithPorts('apps/web/src/features/foxy/index.ts',{}),useFoxyWorkspaceActions:()=>({actions,ui:{}}),FoxyWorkspace:()=>null,FoxyVisualWorkspace:Panel},
  });
  const view=hookView(FoxyWorkspaceSession,{subjectId:'teacher',onIdentityRequired(){}}),panel=()=>descendants(view.tree,node=>node.type===Panel)[0]?.props;
  try{
    await view.flush();descendants(view.tree,node=>typeof node.props.onOpenVisual==='function')[0].props.onOpenVisual({context:{kind:'CLASSROOM',classroomId:room},onCreated(){}});await view.flush();
    assert.equal(panel().topics.length,2);assert.deepEqual(calls,[]);
    panel().actions.setPrompt('Comparar ideas');await view.flush();panel().actions.start([topic]);await view.flush();
    assert.deepEqual(calls,[['create',{kind:'CLASSROOM',classroomId:room}],['resolve',[topic],{mode:'ALL_CLASSROOM',topicIds:[],sourceIds:[]}],['start',selection]]);
  }finally{view.close();}
});
