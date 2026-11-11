import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTsModule } from '../../../../../../tests/helpers/load-ts-module.mjs';
import { descendants, hookView } from '../../../../../../tests/agenda-ui-helpers.test.mjs';
import { gradingView } from '../../../../../../tests/helpers/audit-grade-dto.mjs';
import { parseFeedback } from './overall-feedback.ts';

const feature = 'apps/web/src/features/grading/ui/';
const findButton = (view, label) => descendants(view.tree, node => node.type === 'button' && node.props.children === label)[0];

test('pending result addresses the teacher and student according to the viewer', async () => {
  const { PublishedResult } = loadTsModule(feature + 'PublishedResult.tsx');
  for (const audience of ['teacher', 'student']) {
    const view = hookView(PublishedResult, { audience, roomId: 'room', attemptId: 'attempt', api: { call: async () => ({ status: 'pending' }) } });
    try {
      await view.flush();
      const html = renderToStaticMarkup(view.tree);
      assert.match(html, /Resultado pendiente de publicación/);
      if (audience === 'teacher') {
        assert.match(html, /Calificación y devolución del estudiante/);
        assert.doesNotMatch(html, /Tu entrega está recibida/);
      } else assert.match(html, /Tu entrega está recibida/);
    } finally { view.close(); }
  }
});

test('structured teacher feedback saves privately, previews the saved version and renders from the public result', async () => {
  const { GradingEditor } = loadTsModule(feature + 'GradingEditor.tsx');
  const { PublishedResult } = loadTsModule(feature + 'PublishedResult.tsx');
  let data = structuredClone(gradingView);
  data.grade.id = 'saved';
  data.grade.pending = false;
  data.grade.finalGrade = '0.00';
  const calls = [];
  const editor = hookView(GradingEditor, {
    api: { call: async (path, method, payload) => {
      calls.push({ path, method, payload });
      if (method === 'POST') data = { ...data, grade: { ...data.grade, overallFeedback: payload.overallFeedback } };
      return data;
    } },
    roomId: 'room', attemptId: 'attempt', onClose() {}, onChanged: async () => {},
  });
  try {
    await editor.flush();
    const change = value => descendants(editor.tree, node => node.type === 'textarea' && node.props['aria-label'] === 'Próximo paso')[0]
      .props.onChange({ target: { value } });
    change('x'.repeat(5000));
    await editor.flush();
    assert.equal(findButton(editor, 'Guardar corrección privada').props.disabled, true);
    change('Agregá un ejemplo');
    await editor.flush();
    assert.equal(findButton(editor, 'Publicar calificación').props.disabled, true);
    findButton(editor, 'Guardar corrección privada').props.onClick();
    await editor.flush();
    assert.equal(parseFeedback(data.grade.overallFeedback).nextStep, 'Agregá un ejemplo');
    findButton(editor, 'Publicar calificación').props.onClick();
    await editor.flush();
    const preview = descendants(editor.tree, node => node.type?.name === 'FeedbackSections')[0];
    assert.equal(preview.props.value, data.grade.overallFeedback);
    assert.ok(calls.every(call => !call.path.includes('/publish-grade')));

    const result = hookView(PublishedResult, {
      api: { call: async () => ({ status: 'published', questions: [], attachments: [], grade: {
        finalGrade: '0.00', isEffective: true, publishedAt: '2026-11-11T00:00:00Z', overallFeedback: data.grade.overallFeedback,
      } }) },
      roomId: 'room', attemptId: 'attempt',
    });
    try {
      await result.flush();
      const html = renderToStaticMarkup(result.tree);
      assert.match(html, /Próximo paso/);
      assert.match(html, /Agregá un ejemplo/);
      assert.match(html, /0,00/);
      assert.doesNotMatch(html, /Devolución v1/);
    } finally { result.close(); }
  } finally { editor.close(); }
});
