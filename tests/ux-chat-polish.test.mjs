import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentWithPorts} from './foxmind-3d-flows-loader.test.mjs';
import {hookView,descendants,deferred} from './agenda-ui-helpers.test.mjs';

const {StudyWorkspace}=componentWithPorts('apps/web/src/features/study/ui/study-workspace.tsx',{'next/link':{default:({children,...props})=>React.createElement('a',props,children)}});
function fixture(run){const props={detail:{folder:{id:'folder',name:'Biología',academicYear:2026,status:'ACTIVE',units:[]},conversations:[{id:'chat',title:'Consulta',messages:[]}],creations:[],practices:[],exams:[],sources:[],memory:null},catalog:{classrooms:[]},busy:false,run,onReload:async()=>{}};return hookView(StudyWorkspace,props);}
const area=view=>descendants(view.tree,n=>n.type==='textarea'&&n.props.id==='study-message')[0];
const form=view=>descendants(view.tree,n=>n.type==='form')[0];

test('study chat shows outgoing message before response, prevents double send and preserves input on failure',async()=>{
  const pending=deferred(),calls=[];const view=fixture((...args)=>{calls.push(args);return pending.promise;});
  try{await view.flush();area(view).props.onChange({target:{value:'Explicame la célula'}});await view.flush();
    form(view).props.onSubmit({preventDefault(){}});form(view).props.onSubmit({preventDefault(){}});await view.flush();
    assert.equal(calls.length,1);assert.equal(calls[0][0],'CHAT');
    const html=renderToStaticMarkup(view.tree);assert.match(html,/Foxy está pensando/);
    const outgoing=descendants(view.tree,n=>n.type==='article').find(n=>renderToStaticMarkup(n).includes('Explicame la célula'));
    assert.ok(outgoing,'the draft is shown in the transcript while submitting');
    pending.reject(new Error('offline'));await view.flush();
    assert.equal(area(view).props.value,'Explicame la célula');assert.doesNotMatch(renderToStaticMarkup(view.tree),/Foxy está pensando/);
    assert.equal(descendants(view.tree,n=>n.type==='article').length,0);
  }finally{view.close();}
});

test('confirmed study response clears only submitted text and Enter preserves Shift and IME composition',async()=>{
  const pending=deferred(),calls=[];const view=fixture((...args)=>{calls.push(args);return pending.promise;});
  try{await view.flush();area(view).props.onChange({target:{value:'Hola'}});await view.flush();let submits=0;
    for(const options of [{shiftKey:true,isComposing:false},{shiftKey:false,isComposing:true}])area(view).props.onKeyDown({key:'Enter',shiftKey:options.shiftKey,nativeEvent:{isComposing:options.isComposing},preventDefault(){throw new Error('must preserve input');}});
    area(view).props.onKeyDown({key:'Enter',shiftKey:false,nativeEvent:{isComposing:false},preventDefault(){},currentTarget:{form:{requestSubmit(){submits++;}}}});assert.equal(submits,1);
    form(view).props.onSubmit({preventDefault(){}});await view.flush();pending.resolve({});await view.flush();assert.equal(area(view).props.value,'');assert.equal(calls.length,1);
  }finally{view.close();}
});
