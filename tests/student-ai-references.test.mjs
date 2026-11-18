import { gradingFixtureProps } from './helpers/frontend-feature-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView } from './agenda-ui-helpers.test.mjs';

const summary = { state: 'READY', generatedAt: null, evidenceHash: 'a'.repeat(64), error: null,
  evidenceReferences: [{ ref: 'A1', title: 'Experimento de luz' }],
  report: { overview: 'Resumen', strengths: [{ text: 'Entrega puntual', evidenceRefs: ['A1'] }],
    supportNeeds: [], recommendations: [], limitations: [] } };

test('teacher sees the named activity alongside its evidence reference', async () => {
  const { StudentAiSummary } = loadTsModule("apps/web/src/features/grading/progress/StudentAiSummary.tsx");
  const view = hookView(StudentAiSummary, gradingFixtureProps('StudentAiSummary', { api: { call: async () => summary }, classroomId: 'room', studentId: 'student' }));
  try {
    await view.flush();
    const html = renderToStaticMarkup(view.tree);
    assert.match(html, /Experimento de luz/); assert.match(html, /A1/); assert.match(html, /Entrega puntual/);
    assert.match(html, /Próximos pasos para acompañar/);
    assert.match(html, /entregas, puntualidad y notas publicadas/);
    assert.match(html, /Volver a consultar/);
  } finally { view.close(); }
});
