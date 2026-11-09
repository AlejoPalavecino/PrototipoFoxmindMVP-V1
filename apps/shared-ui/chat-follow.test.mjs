import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldFollowChat } from './chat-follow.ts';
import {componentWithPorts} from '../../tests/foxmind-3d-flows-loader.test.mjs';
import {hookView} from '../../tests/agenda-ui-helpers.test.mjs';

test('chat follows near the bottom but preserves reading position in older messages', () => {
  assert.equal(shouldFollowChat({scrollTop:900,clientHeight:500,scrollHeight:1400}),true);
  assert.equal(shouldFollowChat({scrollTop:840,clientHeight:500,scrollHeight:1400}),true);
  assert.equal(shouldFollowChat({scrollTop:100,clientHeight:500,scrollHeight:1400}),false);
  assert.equal(shouldFollowChat({scrollTop:0,clientHeight:500,scrollHeight:200}),true);
});

test('resizing the transcript follows its new bottom unless the reader moved into history',async()=>{
  const prior=globalThis.ResizeObserver;let callback,binding,disconnected=false;
  globalThis.ResizeObserver=class{constructor(fn){callback=fn;}observe(){}disconnect(){disconnected=true;}};
  const node={scrollTop:0,scrollHeight:1000,clientHeight:500,children:[]};
  const {useChatFollow}=componentWithPorts('apps/shared-ui/use-chat-follow.ts',{});
  function Probe(){binding=useChatFollow('chat','initial');binding.ref.current=node;return null;}
  const view=hookView(Probe,{});
  try{await view.flush();assert.equal(typeof callback,'function','viewport/content resize must be observed');
    node.scrollHeight=1600;callback();assert.equal(node.scrollTop,1600);
    node.scrollTop=100;binding.onScroll();node.scrollHeight=1800;callback();assert.equal(node.scrollTop,100);
  }finally{view.close();globalThis.ResizeObserver=prior;}
  assert.equal(disconnected,true);
});
