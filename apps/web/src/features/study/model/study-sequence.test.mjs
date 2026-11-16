import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudyRevisionController} from "../api/study-client.ts";
import {studyInstant,studyLocalMinute} from "./study-time.ts";
import { loadTsModule } from "../../../../../../tests/helpers/load-ts-module.mjs";
import { hookView, descendants, deferred } from "../../../../../../tests/agenda-ui-helpers.test.mjs";

test('adding study sessions to Agenda requires explicit confirmation in a FoxMind dialog', async () => {
  const { StudyExamPlanner } = loadTsModule('apps/web/src/features/study/ui/study-practice.tsx');
  const original = globalThis.window;
  let nativePrompts = 0;
  globalThis.window = { confirm() { nativePrompts++; return false; } };
  const calls = [];
  const view = hookView(StudyExamPlanner, {
    detail: { folder: { units: [] }, exams: [{ id: 'exam', timeZone: 'UTC', sessions: [
      { id: 'session', title: 'Repaso personal', topicIds: [], startAt: '2026-11-20T12:00:00Z', endAt: '2026-11-20T12:30:00Z', minutes: 30, reminderMinutes: 15 },
    ] }] },
    examId:'exam', busy: false, onDirtyChange() {}, run: async (...args) => { calls.push(args); },
  });
  const buttonText = node => Array.isArray(node.props.children) ? node.props.children.filter(value=>typeof value==='string').join('') : node.props.children;
  const trigger = () => descendants(view.tree, node => node.type === 'button' && buttonText(node) === 'Revisar Agenda')[0];
  const confirmation = () => descendants(view.tree, node => node.type?.name === 'Dialog' && node.props.title === 'Estos momentos van a tu agenda')[0];
  try {
    await view.flush();
    trigger().props.onClick(); await view.flush();
    assert.ok(confirmation(), 'the planner opens an in-app confirmation');
    assert.equal(nativePrompts, 0);
    assert.deepEqual(calls, []);
    confirmation().props.onClose(); await view.flush();
    assert.equal(confirmation(), undefined);
    assert.deepEqual(calls, []);
    trigger().props.onClick(); await view.flush();
    descendants(confirmation(),node=>node.type==='button'&&buttonText(node)==='Agregar a mi Agenda')[0].props.onClick();
    await view.flush();
    assert.deepEqual(calls, [['CONFIRM_AGENDA', { examId: 'exam', sessionIds: ['session'] }]]);
  } finally { view.close(); globalThis.window = original; }
});

test('a study confirmation prevents duplicate submits and stays open for retry on failure', async () => {
  const { StudyConfirmation } = loadTsModule('apps/web/src/features/study/ui/study-confirmation.tsx');
  const first = deferred();
  let submitted = 0, closed = 0;
  const view = hookView(StudyConfirmation, {
    title: 'Quitar material', description: 'Material de prueba', confirmLabel: 'Quitar material', busy: false,
    onClose() { closed++; },
    async onConfirm() { if (++submitted === 1) await first.promise; },
  });
  const button = label => descendants(view.tree, node => node.type === 'button' && node.props.children === label)[0];
  try {
    await view.flush();
    const submit = button('Quitar material').props.onClick;
    submit(); submit();
    await view.flush();
    assert.equal(submitted, 1);
    assert.equal(button('Procesando…').props.disabled, true);
    view.tree.props.onClose();
    assert.equal(closed, 0);
    first.reject(new Error('No pudimos quitar el material.'));
    await view.flush();
    assert.ok(descendants(view.tree, node => node.props.error && node.props.children === 'No pudimos quitar el material.').length);
    assert.equal(closed, 0);
    button('Quitar material').props.onClick();
    await view.flush();
    assert.equal(submitted, 2);
    assert.equal(closed, 1);
  } finally { view.close(); }
});

test('folder details can continue without a file, but the plan step requires an approved document',async()=>{
  const original=globalThis.window;
  globalThis.window={addEventListener(){},removeEventListener(){}};
  const {StudyWizard}=loadTsModule('apps/web/src/features/study/ui/study-wizard.tsx');
  const view=hookView(StudyWizard,{catalog:{items:[],classrooms:[],covers:[]},onClose(){},onCreated(){}});
  const field=()=>descendants(view.tree,n=>n.type==='input'&&n.props.placeholder==='Por ejemplo: Fotografía y luz')[0];
  const subject=()=>descendants(view.tree,n=>n.type==='input'&&n.props.placeholder==='Fotografía')[0];
  const form=()=>descendants(view.tree,n=>n.type==='form')[0];
  const next=async()=>{form().props.onSubmit({preventDefault(){}});await view.flush();};
  try{
    await view.flush();field().props.onChange({target:{value:'Biología'}});subject().props.onChange({target:{value:'Ciencias naturales'}});
    await view.flush();await next();
    assert.equal(form().props['data-wizard-step'],1,'valid folder details reach Cargar plan without a file');
    await next();
    assert.equal(form().props['data-wizard-step'],1);
    const notice=descendants(view.tree,n=>n.props.error===true);
    assert.ok(notice.some(n=>/cargá.*documento del plan/i.test(String(n.props.children))));
  }finally{view.close();globalThis.window=original;}
});
test('chained mutations use the revision returned by the prior command',async()=>{let revision=1;const seen=[];const controller=createStudyRevisionController({folder:{id:'folder',revision:'1'}},{command:async(_id,rev)=>{seen.push(rev);assert.equal(rev,String(revision));revision++;return{folder:{id:'folder',revision:String(revision)}};},get:async()=>({folder:{id:'folder',revision:String(revision)}})},()=>{});await controller.run('SAVE_ANSWERS',{});await controller.run('FINALIZE_PRACTICE',{});await controller.run('NEW_CONVERSATION',{});await controller.run('CHAT',{});assert.deepEqual(seen,['1','2','3','4']);});
test('exam wall times use selected zone and reject DST gap/overlap',()=>{assert.equal(studyInstant('2026-11-09T12:00','America/Argentina/Buenos_Aires'),'2026-11-09T15:00:00.000Z');assert.equal(studyLocalMinute('2026-11-09T15:00:00.000Z','America/Argentina/Buenos_Aires'),'2026-11-09T12:00');assert.throws(()=>studyInstant('2026-03-08T02:30','America/New_York'));assert.throws(()=>studyInstant('2026-11-01T01:30','America/New_York'));});
test('committed command is not reported failed when subsequent refresh is unavailable',async()=>{let rendered;const controller=createStudyRevisionController({folder:{id:'folder',revision:'1'}},{command:async()=>({folder:{id:'folder',revision:'2'}}),get:async()=>{throw new Error('offline after commit');}},value=>{rendered=value;});const result=await controller.run('FINALIZE_PRACTICE',{});assert.equal(result.folder.revision,'2');assert.equal(rendered.folder.revision,'2');});
