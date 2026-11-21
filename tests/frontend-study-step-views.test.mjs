import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants } from './agenda-ui-helpers.test.mjs';

test('practice feedback renders legacy model line breaks without leaking an orphan emphasis marker', () => {
  const { renderStudyPracticeFeedback } = loadTsModule('apps/web/src/features/study/practice/presentation/study-practice-feedback.tsx');
  for (const feedback of [
    String.raw`Buen comienzo.\n\n Acierto: Multiplicaste por 50.\n Mejora prioritaria: Revisá la unidad.\n Próximo paso:* Deducí la medida del plano.`,
    { status: 'COMPLETE', markdown: String.raw`Buen comienzo.\n\n Acierto: Multiplicaste por 50.\n Mejora prioritaria: Revisá la unidad.\n Próximo paso:* Deducí la medida del plano.` },
  ]) {
    const html = renderToStaticMarkup(renderStudyPracticeFeedback({
      practice: { questions: [], feedback }, heading: { current: null }, hasDevelopmentAnswers: true,
      answerText: () => '', feedbackComplete: true, busy: false, onRetryFeedback() {},
    }));
    assert.match(html, /<p>Buen comienzo\.<\/p>/);
    assert.match(html, /Próximo paso: Deducí la medida del plano\./);
    assert.doesNotMatch(html, /\\n|paso:\*/);
  }
});

test('practice feedback keeps deliberate emphasis, multiplication, inline literals and learner answers', () => {
  const { renderStudyPracticeFeedback } = loadTsModule('apps/web/src/features/study/practice/presentation/study-practice-feedback.tsx');
  const html = renderToStaticMarkup(renderStudyPracticeFeedback({
    practice: { questions: [{ id: 'q', prompt: 'Calculá' }], feedback: { status: 'COMPLETE',
      markdown: '**Próximo paso:** Compará 2 * 50.\n\nMostrá `\\n` y escribí *metro*.' } },
    heading: { current: null }, hasDevelopmentAnswers: true, answerText: () => String.raw`2 * 50\n100`,
    feedbackComplete: true, busy: false, onRetryFeedback() {},
  }));
  assert.match(html, /<strong>Próximo paso:<\/strong> Compará 2 \* 50\./);
  assert.match(html, /<code>\\n<\/code> y escribí <em>metro<\/em>/);
  assert.match(html, /Tu respuesta: 2 \* 50\\n100/);
});

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

test('review session and Agenda confirmation show the suggested or edited activity before saving', () => {
  const base = 'apps/web/src/features/study/practice/exam-planning/';
  const { renderStudyExamSessions } = loadTsModule(base + 'study-exam-sessions.tsx');
  const { renderStudyExamAgendaConfirmation } = loadTsModule(base + 'study-exam-agenda-confirmation.tsx');
  const session = { id: 'one', topicIds: ['t'], title: 'Escala', startAt: '2099-02-01T17:00Z', endAt: '2099-02-01T17:25Z', minutes: 25 };
  const activities = new Map([['one', 'Explicá el procedimiento sin mirar el material.'], ['two', 'No seleccionada']]);
  const props = { exam: {}, sessions: [session], activities, scheduled: new Map(), selection: ['one'], busy: false, saving: false, error: '',
    setSelection() {}, setEditing() {}, setConfirmation() {}, onConfirm() {}, allTopics: [{ id: 't', title: 'Escala' }],
    longDate: () => '1 de febrero', local: value => value.slice(0, 16) };
  for (const render of [renderStudyExamSessions, renderStudyExamAgendaConfirmation]) {
    const tree = render(props);
    const text = descendants(tree, node => node.type === 'p' && typeof node.props.children === 'string')
      .map(node => node.props.children).join(' ');
    assert.match(text, /Explicá el procedimiento sin mirar el material/);
    assert.doesNotMatch(text, /No seleccionada/);
  }
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
