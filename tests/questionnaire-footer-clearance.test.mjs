import { participationFixtureProps } from './helpers/frontend-feature-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants, hookView } from './agenda-ui-helpers.test.mjs';

test('questionnaire reserves the measured footer height and releases it on exit', async () => {
  const previous = globalThis.ResizeObserver;
  let resized, observed, disconnected = false;
  globalThis.ResizeObserver = class {
    constructor(callback) { resized = callback; }
    observe(node) { observed = node; }
    disconnect() { disconnected = true; }
  };
  const { QuestionnaireAttempt } = loadTsModule('apps/web/src/features/participation/questionnaire/QuestionnaireAttempt.tsx');
  const view = hookView(QuestionnaireAttempt, participationFixtureProps('QuestionnaireAttempt', { classroomId: 'room', editor: { epoch: '1' }, refresh: async () => {}, api: {},
    data: { canTransfer: true, activity: { questions: [{ id: 'q', type: 'DEVELOPMENT', prompt: 'Pregunta', options: [] }] },
      attempt: { id: 'attempt', number: 1, status: 'DRAFT', revision: '1', epoch: '1', answers: [] } } }));
  try {
    await view.flush();
    const footer = descendants(view.tree, node => node.type === 'footer')[0];
    assert.equal(typeof footer.props.ref, 'function', 'fixed footer must reserve its actual height');
    const variables = new Map();
    const screen = { style: { setProperty: (key, value) => variables.set(key, value), removeProperty: key => variables.delete(key) } };
    let height = 148.4;
    const element = { closest: () => screen, getBoundingClientRect: () => ({ height }) };
    const cleanup = footer.props.ref(element);
    assert.equal(observed, element);
    assert.equal(variables.get('--questionnaire-footer-height'), '149px');
    height = 202.2; resized();
    assert.equal(variables.get('--questionnaire-footer-height'), '203px', 'long error or zoom increases clearance');
    height = 94; resized();
    assert.equal(variables.get('--questionnaire-footer-height'), '94px', 'shorter footer does not retain excess space');
    cleanup();
    assert.equal(disconnected, true);
    assert.equal(variables.size, 0);
  } finally { view.close(); globalThis.ResizeObserver = previous; }
});
