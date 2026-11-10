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

test('ready suggestions disclose the real proposal count without applying it', () => {
  const view = render('READY'), details = descendants(view.tree, n => n.type === 'details')[0];
  assert.ok(details); assert.notEqual(details.props.open, true);
  const summary = descendants(details, n => n.type === 'summary')[0];
  assert.match(text(summary), /Revisar sugerencias/i); assert.match(text(details), /2/);
  assert.equal(view.applied(), 0);
  assert.equal(descendants(details, n => n.type?.name === 'PlanExtraction')[0].props.hasUnits, true);
});

for (const state of ['FAILED', 'STALE']) test(`${state} extraction never advertises a ready proposal`, () => {
  const view = render(state);
  assert.equal(descendants(view.tree, n => n.type === 'details').length, 0);
  assert.doesNotMatch(text(view.tree), /Revisar sugerencias/i);
  assert.equal(view.applied(), 0);
});
