import test from 'node:test';
import { withJourney, questionnaireJourney } from './p9-journey-helpers.mjs';

test('P9 joined questionnaire: real identity, authoring, autosave, private feedback, publication and durable own result', { timeout: 330000 }, async () => {
  await withJourney('questionnaire', world => questionnaireJourney(world, 'QUESTIONNAIRE'), { peer: true });
});
