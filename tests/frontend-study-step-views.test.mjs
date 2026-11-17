import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants } from './agenda-ui-helpers.test.mjs';

test('practice question presenter preserves selected answers and emits the existing answer value', () => {
  const { renderStudyPracticeQuestion } = loadTsModule('apps/web/src/features/study/practice/presentation/study-practice-question.tsx');
  const changes = [];
  const tree = renderStudyPracticeQuestion({
    question: { id: 'q', type: 'MULTIPLE', prompt: 'Elegí', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }] },
    index: 0, total: 1, busy: false, heading: { current: null }, answers: { q: ['a'] },
    change: (id, value) => changes.push([id, value]),
  });
  const inputs = descendants(tree, node => node.type === 'input');
  assert.equal(inputs[0].props.checked, true);
  assert.equal(inputs[1].props.checked, false);
  inputs[1].props.onChange({ target: { checked: true } });
  assert.deepEqual(changes, [['q', ['a', 'b']]]);
});

test('wizard program presenter preserves the upload control callbacks without submitting or uploading', () => {
  const { renderStudyFolderProgram } = loadTsModule('apps/web/src/features/study/folders/wizard/study-folder-program.tsx');
  let uploads = 0;
  const onFile = async () => { uploads += 1; };
  const planSource = { file: { id: 'file', name: 'Plan', ready: true }, uploading: false, disabled: false,
    fileUrl: id => `/fixture/${id}`, onFile, onError() {}, onRefresh() {}, onRemoveFile() {} };
  const tree = renderStudyFolderProgram({
    programSource: 'own', linked: '', method: 'manual', classrooms: [], planSource,
    onSource() {}, onClassroom() {}, onMethod() {},
  });
  assert.equal(uploads, 0);
  const source = descendants(tree, node => node.type?.name === 'WizardPlanSource')[0];
  assert.equal(source.props.onFile, onFile);
  assert.equal(source.props.file, planSource.file);
});
