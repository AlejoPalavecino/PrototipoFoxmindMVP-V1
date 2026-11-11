import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
const { parseInvitationEmails, continueInvitationBatch } = loadTsModule('apps/web/src/features/classrooms/model/invitation-batch.ts');
const receipt = () => ({requestId:'batch-id',recipients:[{email:'one@example.test',status:'pending'},{email:'two@example.test',status:'pending'}]});
test('batch addresses normalize and deduplicate; invalid entries and excess are never silently discarded', () => {
  assert.deepEqual(parseInvitationEmails('ONE@Example.test; two@example.test\none@example.test'), {emails:['ONE@example.test','two@example.test'],invalid:[],duplicates:1});
  assert.deepEqual(parseInvitationEmails('valid@example.test, invalid').invalid, ['invalid']);
  assert.equal(parseInvitationEmails(Array.from({length:51},(_,i)=>`a${i}@example.test`).join('\n')).emails.length,51);
  assert.deepEqual(parseInvitationEmails('"Ana, Perez"@Example.test; bad address@example.test'), {emails:['"Ana, Perez"@example.test','bad address@example.test'],invalid:['bad address@example.test'],duplicates:0});
  assert.deepEqual(parseInvitationEmails('one@example.test; broken@-example.test').invalid, ['broken@-example.test']);
});
test('cancellation stops before next recipient and keeps confirmed results', async () => {
  let stop=false;const calls=[];let result;
  const api={call:async(path)=>{calls.push(path);stop=true;return {email:'one@example.test',status:'created'};}};
  result=await continueInvitationBatch(api,'room',receipt(),()=>stop,()=>{});
  assert.equal(calls.length,1);assert.equal(result.receipt.recipients[0].status,'created');assert.equal(result.receipt.recipients[1].status,'pending');
});
test('lost response reconciles the receipt, pauses, and never advances blindly', async () => {
  const calls=[];const committed=receipt();committed.recipients[0].status='created';
  const api={call:async(path,method)=>{calls.push([path,method]);if(method==='POST')throw Error('offline');return committed;}};
  const result=await continueInvitationBatch(api,'room',receipt(),()=>false,()=>{});
  assert.equal(calls.length,2);assert.equal(result.receipt.recipients[0].status,'created');assert.equal(result.paused,true);
});
test('recovery only processes pending indices under the same request identity', async () => {
  const saved=receipt();saved.recipients[0].status='created';const calls=[];
  const result=await continueInvitationBatch({call:async(path)=>{calls.push(path);return {email:'two@example.test',status:'already_invited'};}},'room',saved,()=>false,()=>{});
  assert.deepEqual(calls,['/room/invitations/batch/batch-id/1']);assert.equal(result.paused,false);
});
test('uncertain results remain pending when reconciliation also fails', async () => {
  const result=await continueInvitationBatch({call:async()=>{throw Error('offline');}},'room',receipt(),()=>false,()=>{});
  assert.equal(result.paused,true);assert.equal(result.receipt.recipients[0].status,'pending');
});
test('recovery after a transport failure returns to editing on confirmed missing receipt without issuing an empty batch', async () => {
  const original = globalThis.sessionStorage;
  const saved = new Map([['foxmind:invitation-batch:room','missing-id']]);
  globalThis.sessionStorage = {getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)};
  const calls=[];let status=503;
  const { InvitationBatchDialog }=loadTsModule('apps/web/src/features/classrooms/ui/InvitationBatchDialog.tsx');
  const view=hookView(InvitationBatchDialog,{classroomId:'room',onClose:()=>{},onChanged:async()=>{},api:{call:async(path,method)=>{calls.push([path,method]);throw Object.assign(Error('synthetic'),{status});}}});
  try {
    await view.flush();status=404;
    const button=descendants(view.tree,n=>n.type==='button' && n.props.children==='Recuperar y continuar')[0];
    assert.ok(button);await button.props.onClick();await view.flush();
    assert.equal(saved.size,0);assert.equal(descendants(view.tree,n=>n.type==='textarea').length,1);
    assert.equal(calls.length,2);assert.ok(calls.every(([,method])=>!method));
  } finally {view.close();if(original===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=original;}
});
