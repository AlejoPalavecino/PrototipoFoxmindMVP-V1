import test from 'node:test';
import { withJourney, questionnaireJourney } from './p9-journey-helpers-current.mjs';

test('P9 joined evaluation: incomplete cancel/confirm, blank zero, locked keys and durable exact positive feedback', { timeout: 330000 }, async () => {
  await withJourney('evaluation', world => questionnaireJourney(world, 'EVALUATION'), { peer: true });
});
