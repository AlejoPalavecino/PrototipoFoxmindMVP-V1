import test from 'node:test';
import assert from 'node:assert/strict';
import {initializePlanDisclosure} from './plan-disclosure.ts';

test('completing the last empty field keeps the unit open and preserves later manual toggles',()=>{
  const node={open:false};
  initializePlanDisclosure(node,true);assert.equal(node.open,true);
  initializePlanDisclosure(node,false);assert.equal(node.open,true,'typing must not collapse the active editor');
  node.open=false;initializePlanDisclosure(node,true);assert.equal(node.open,false,'a rerender must preserve the user toggle');
  initializePlanDisclosure(null,true);
});
