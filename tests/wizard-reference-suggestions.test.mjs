import test from 'node:test';
import assert from 'node:assert/strict';
import { componentWithPorts } from './foxmind-3d-flows-loader.test.mjs';
import { descendants } from './agenda-ui-helpers.test.mjs';
import { text } from './helpers/wizard-reference/component-harness.mjs';

const render = state => {
  let applied = 0;
  const { WizardSuggestions } = componentWithPorts("apps/web/src/features/curriculum/ui/WizardSuggestions.tsx", {"./PlanExtraction.tsx":{PlanExtraction: () => null},
"../../../../../shared-ui/index.ts":{EntryIcon: () => null,FoxmindIcon: () => null}});
  const extraction = { busy: false, view: { state, proposal: state === 'READY' ? { units: [
    { name: 'Primera', topics: [{ name: 'Tema' }] }, { name: 'Segunda', topics: [{ name: 'Otro' }] }], warnings: [] } : null },
    apply: () => { applied++; } };
  return { tree: WizardSuggestions({ extraction, hasUnits: true, review: true }), applied: () => applied };
};

test('ready suggestions present the editable proposal directly with its real count', () => {
  const view = render('READY'), proposal = descendants(view.tree, n => n.props['aria-label'] === 'Propuesta de Foxy')[0];
  assert.ok(proposal); assert.equal(proposal.type, 'section');
  assert.match(text(proposal), /2 unidades sugeridas/);
  assert.equal(view.applied(), 0);
  assert.equal(descendants(proposal, n => n.type?.name === 'PlanExtraction')[0].props.hasUnits, true);
});

for (const state of ['FAILED', 'STALE']) test(`${state} extraction never advertises a ready proposal`, () => {
  const view = render(state);
  assert.equal(descendants(view.tree, n => n.type === 'details').length, 0);
  assert.doesNotMatch(text(view.tree), /Revisar sugerencias/i);
  assert.equal(view.applied(), 0);
});

test('a failed plan request is an error even when the saved job is still running', () => {
  const { PlanExtraction } = componentWithPorts('apps/web/src/features/curriculum/ui/PlanExtraction.tsx', {
    './ExtractionEditor.tsx': { ExtractionEditor: () => null },
    '../../../../../shared-ui/index.ts': { AiProgress: () => null },
  });
  const tree = PlanExtraction({ extraction: { view: { state: 'RUNNING' }, busy: false,
    message: 'No pudimos consultar el plan. Tu borrador sigue guardado.', messageError: true }, hasUnits: false, review: true });
  const alert = descendants(tree, n => n.props.role === 'alert')[0];
  assert.ok(alert); assert.match(alert.props.className, /error/); assert.match(text(alert), /borrador sigue guardado/);
});

test('a saved plan uses success feedback and cancellation remains informative', () => {
  const { PlanExtraction } = componentWithPorts('apps/web/src/features/curriculum/ui/PlanExtraction.tsx', {
    './ExtractionEditor.tsx': { ExtractionEditor: () => null },
    '../../../../../shared-ui/index.ts': { AiProgress: () => null },
  });
  const tree = PlanExtraction({ extraction: { view: { state: 'APPLIED' }, busy: false, message: '', messageError: false }, hasUnits: true, review: true });
  assert.match(descendants(tree, n => n.props.role === 'status')[0].props.className, /success/);
  const cancelled = PlanExtraction({ extraction: { view: null, busy: false, message: 'Podés continuar manualmente.', messageError: false }, hasUnits: false, review: true });
  assert.equal(descendants(cancelled, n => n.props.role === 'alert').length, 0);
});
