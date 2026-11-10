import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentWithPorts} from "../../../../tests/foxmind-3d-flows-loader.test.mjs";
import {hookView} from "../../../../tests/agenda-ui-helpers.test.mjs";
test('pending visual navigation exposes an actionable leave dialog even with resource editor closed',async()=>{
 const state={chat:{current:{id:'conversation',revision:'0',context:{kind:'GENERAL'}},selection:{topicIds:[],sourceIds:[]},capabilities:{imageGeneration:{enabled:true},diagramGeneration:{enabled:false}}},visual:{pending:{requestId:'synthetic'},busy:false},resource:{status:'closed'},classrooms:[]};
 const ui={leave:{reason:'pending',canSave:false},openingResource:false},runtime={visual:{},assetFileUrl:()=>'',getState:()=>state},actions={chat:{},resource:{},requestNavigate:()=>{},cancelLeave:()=>{},discardAndContinue:()=>{}};
 const {FoxyWorkspaceSession}=componentWithPorts("apps/web/src/screens/foxy-workspace-session.tsx",{"../application/foxy-workspace":{useFoxyWorkspace:()=>({state,runtime,initializing:false})},
"../features/foxy/index.ts":{...componentWithPorts('apps/web/src/features/foxy/index.ts', {}),useFoxyWorkspaceActions:()=>({actions,ui}),FoxyWorkspace:()=>null,FoxyVisualWorkspace:()=>null},
"./foxy-resource-workspace":{FoxyResourceWorkspace:()=>null}});const view=hookView(FoxyWorkspaceSession,{subjectId:'teacher',onIdentityRequired:()=>{}});try{await view.flush();const html=renderToStaticMarkup(view.tree);assert.match(html,/pendiente|confirmar|reintentar/iu);assert.match(html,/seguir|permanecer|cancelar/iu);}finally{view.close();}
});
