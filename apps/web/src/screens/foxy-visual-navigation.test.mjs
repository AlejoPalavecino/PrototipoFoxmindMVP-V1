import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentWithPorts} from "../../../../tests/foxmind-3d-flows-loader.test.mjs";
import {descendants, hookView} from "../../../../tests/agenda-ui-helpers.test.mjs";

test('visual controls stay out of the chat until explicitly opened', async () => {
 const chat = { current: { id: 'conversation', revision: '0', context: { kind: 'GENERAL' } }, selection: { topicIds: [], sourceIds: [] } };
 const state = { chat, visual: { jobs: [], busy: false }, classrooms: [] };
 const runtime = { visual: {}, assetFileUrl: () => '' };
 let openVisual;
 const { FoxyWorkspaceSession } = componentWithPorts('apps/web/src/screens/foxy-workspace-session.tsx', {
  '../application/foxy-workspace': { useFoxyWorkspace: () => ({ state, runtime, initializing: false }) },
  '../features/foxy/index.ts': {
   ...componentWithPorts('apps/web/src/features/foxy/index.ts', {}),
   useFoxyWorkspaceActions: () => ({ actions: { chat: {} }, ui: {} }),
   FoxyWorkspace: props => { openVisual = props.onOpenVisual; return null; },
   FoxyVisualWorkspace: () => React.createElement('form', null, 'Formulario visual de prueba'),
  },
  './foxy-resource-workspace': { FoxyResourceWorkspace: () => null },
 });
 const view = hookView(FoxyWorkspaceSession, { subjectId: 'teacher', onIdentityRequired() {} });
 try {
  await view.flush();
  assert.doesNotMatch(renderToStaticMarkup(view.tree), /Formulario visual de prueba/u);
  openVisual();
  await view.flush();
  assert.match(renderToStaticMarkup(view.tree), /Formulario visual de prueba/u);
 } finally { view.close(); }
});

test('draft creates the conversation only on Generate and retries the same request after failure', async () => {
 const current = { id: 'previous', revision: '0', context: { kind: 'GENERAL' } };
 const chat = { current, selection: { topicIds: [], sourceIds: [] }, capabilities: { imageGeneration: { enabled: true }, diagramGeneration: { enabled: true } } };
 const state = { chat, visual: { kind: 'DIAGRAM', prompt: 'Borrador anterior', aspectRatio: '16:9', jobs: [{ id: 'previous-image' }], busy: false }, classrooms: [] };
 const calls = [];
 const runtime = { getState: () => state, assetFileUrl: () => '', visual: {
  setKind: value => calls.push(['kind', value]), setAspectRatio: value => calls.push(['ratio', value]),
  setPrompt: value => calls.push(['prompt', value]), start: () => calls.push(['start', chat.current.id]),
 } };
 let fail = true;
 const actions = { chat: {}, async prepareVisualConversation(input, onSelected) {
  calls.push(['create', input]);
  if (!fail) chat.current = { ...current, id: 'new' };
  onSelected(fail ? undefined : chat.current.id);
  return !fail;
 } };
 function VisualPanel() { return null; }
 const { FoxyWorkspaceSession } = componentWithPorts('apps/web/src/screens/foxy-workspace-session.tsx', {
  '../application/foxy-workspace': { useFoxyWorkspace: () => ({ state, runtime, initializing: false }) },
  '../features/foxy/index.ts': {
   ...componentWithPorts('apps/web/src/features/foxy/index.ts', {}),
   useFoxyWorkspaceActions: () => ({ actions, ui: {} }),
   FoxyWorkspace: () => null, FoxyVisualWorkspace: VisualPanel,
  },
  './foxy-resource-workspace': { FoxyResourceWorkspace: () => null },
 });
 const view = hookView(FoxyWorkspaceSession, { subjectId: 'teacher', onIdentityRequired() {} });
 const panel = () => descendants(view.tree, node => node.type === VisualPanel)[0].props;
 try {
  await view.flush();
  const workspace = descendants(view.tree, node => typeof node.props.onOpenVisual === 'function')[0];
  workspace.props.onOpenVisual({ context: { kind: 'GENERAL' }, onCreated: () => calls.push(['selected']) });
  await view.flush();
  assert.deepEqual(calls, []);
  assert.deepEqual(panel().jobs, []);
  assert.equal(panel().kind, 'IMAGE');
  assert.equal(panel().prompt, '');
  panel().actions.setPrompt('Una imagen de la luz');
  panel().actions.setAspectRatio('4:3');
  await view.flush();
  panel().actions.start();
  await view.flush();
  assert.match(panel().error, /No pudimos crear la conversación/);
  assert.equal(panel().prompt, 'Una imagen de la luz');
  assert.deepEqual(calls.map(call => call[0]), ['create']);
  fail = false;
  panel().actions.start();
  await view.flush();
  assert.deepEqual(calls[0], calls[1]);
  assert.deepEqual(calls.slice(2), [['selected'], ['kind', 'IMAGE'], ['ratio', '4:3'], ['prompt', 'Una imagen de la luz'], ['start', 'new']]);
 } finally { view.close(); }
});

test('pending visual navigation exposes an actionable leave dialog even with resource editor closed',async()=>{
 const state={chat:{current:{id:'conversation',revision:'0',context:{kind:'GENERAL'}},selection:{topicIds:[],sourceIds:[]},capabilities:{imageGeneration:{enabled:true},diagramGeneration:{enabled:false}}},visual:{jobs:[],selectedId:null,pending:{requestId:'synthetic'},busy:false},resource:{status:'closed'},classrooms:[]};
 const ui={leave:{reason:'pending',canSave:false},openingResource:false},runtime={visual:{},assetFileUrl:()=>'',getState:()=>state},actions={chat:{},resource:{},requestNavigate:()=>{},cancelLeave:()=>{},discardAndContinue:()=>{}};
 const {FoxyWorkspaceSession}=componentWithPorts("apps/web/src/screens/foxy-workspace-session.tsx",{"../application/foxy-workspace":{useFoxyWorkspace:()=>({state,runtime,initializing:false})},
"../features/foxy/index.ts":{...componentWithPorts('apps/web/src/features/foxy/index.ts', {}),useFoxyWorkspaceActions:()=>({actions,ui}),FoxyWorkspace:()=>null,FoxyVisualWorkspace:()=>null},
"./foxy-resource-workspace":{FoxyResourceWorkspace:()=>null}});const view=hookView(FoxyWorkspaceSession,{subjectId:'teacher',onIdentityRequired:()=>{}});try{await view.flush();const html=renderToStaticMarkup(view.tree);assert.match(html,/pendiente|confirmar|reintentar/iu);assert.match(html,/seguir|permanecer|cancelar/iu);}finally{view.close();}
});
