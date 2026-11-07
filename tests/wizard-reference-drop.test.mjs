import test from 'node:test';
import assert from 'node:assert/strict';
import { wizard, advance, nodes, ready, text, button } from './helpers/wizard-reference/component-harness.mjs';
const drop = view => nodes(view, node => typeof node.props.onDrop === 'function')[0];
const event = files => ({ dataTransfer: { files, types: ['Files'] }, preventDefault() {}, stopPropagation() {} });

test('single-file drop and native selection use the same upload transport and reset the picker', async () => {
  const f = await wizard();
  try {
    const area = drop(f.view); assert.ok(area, 'file drop is available');
    const first = new File(['fixture'], 'first.pdf'); area.props.onDrop(event([first])); await f.view.flush();
    assert.equal(f.uploads.length, 1); assert.equal(f.uploads[0][1], first);
    const picker = nodes(f.view, n => n.type === 'input' && n.props.type === 'file')[0];
    const target = { files: [new File(['fixture'], 'second.docx')], value: 'second.docx' };
    picker.props.onChange({ target }); await f.view.flush();
    assert.equal(f.uploads.length, 2); assert.equal(f.uploads[1][1], target.files[0]); assert.equal(target.value, '');
  } finally { f.close(); }
});

test('multiple-file and busy drops never submit duplicate uploads', async () => {
  let release; const gate = new Promise(resolve => { release = resolve; });
  const f = await wizard({ upload: () => gate });
  try {
    assert.ok(drop(f.view)); const file = new File(['fixture'], 'plan.pdf');
    drop(f.view).props.onDrop(event([file, file])); await f.view.flush(); assert.equal(f.uploads.length, 0);
    assert.match(text(f.view.tree), /un (solo )?archivo|uno por vez/i);
    drop(f.view).props.onDrop(event([file])); await f.view.flush(); assert.equal(f.uploads.length, 1);
    drop(f.view).props.onDrop(event([file])); await f.view.flush(); assert.equal(f.uploads.length, 1);
    release(ready('replacement')); await f.view.flush();
  } finally { release(ready('replacement')); f.close(); }
});

test('a rejected dropped replacement cannot bypass selected-file security when creating a classroom', async () => {
  const f = await wizard({ upload: async () => ({ ...ready('bad'), ready: false, validation: 'REJECTED', scan: 'REJECTED' }) });
  try {
    assert.ok(drop(f.view));
    drop(f.view).props.onDrop(event([new File(['fixture'], 'bad.pdf')])); await f.view.flush();
    await advance(f.view);
    assert.match(text(f.view.tree), /archivo del plan debe estar aprobado/);
    assert.equal(nodes(f.view, n => n.type === 'input' && n.props.type === 'file').length, 1);
    assert.equal(f.calls.some(([, , body]) => body?.payload?.planFileId === 'bad'), false);
    assert.equal(f.calls.some(([path]) => path.endsWith('/publish')), false);
    assert.deepEqual(f.published, []);
  } finally { f.close(); }
});
