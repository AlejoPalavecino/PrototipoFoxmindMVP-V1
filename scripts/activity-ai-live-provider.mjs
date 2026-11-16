import { setTimeout as delay } from 'node:timers/promises';

// Composition-only controlled provider. No Google client, key or external request.
export const calls = [];
export const extractionProvider = {
  async countStudyPlanTokens() { return 100; },
  async extractStudyPlan() { return { json: { units: [], warnings: [] }, inputTokens: 100, outputTokens: 10 }; },
};
export const activityProvider = {
  async countActivityTokens() { calls.push('count'); return 200; },
  async generateActivity(input) {
    calls.push('generate'); await delay(1200);
    const reference = input.sources.length
      ? { sourceId: input.sources[0].sourceId, page: input.sources[0].document.kind === 'pdf' ? 1 : null }
      : { sourceId: 'teacher-context', page: null };
    const questions = [];
    const add = (type, count) => {
      for (let index = 0; index < count; index++) questions.push({ type, prompt: `${type === 'DEVELOPMENT' ? 'Explicá' : 'Identificá'} la relación entre luz y exposición (${questions.length + 1}).`,
        points: '2', scoringRule: type === 'DEVELOPMENT' ? null : 'EXACT', options: type === 'DEVELOPMENT' ? []
          : [{ text: 'La luz acumulada cambia con el tiempo de exposición.', correct: true },
            { text: 'El tiempo de exposición no influye en la luz acumulada.', correct: false },
            ...(type === 'MULTIPLE_CHOICE' ? [{ text: 'Una mayor apertura permite más entrada de luz.', correct: true }] : [])] });
    };
    add('DEVELOPMENT', input.counts.development); add('SINGLE_CHOICE', input.counts.singleChoice); add('MULTIPLE_CHOICE', input.counts.multipleChoice);
    const assignmentPrompts = Array.from({ length: input.counts.assignment }, (_, index) => `Compará dos fotografías con distinto tiempo de exposición y justificá el resultado (${index + 1}).`);
    const proposal = { schemaVersion: 'activity-proposal-v1', type: input.type, title: 'La luz en situaciones cotidianas', objective: input.objective.trim() || 'Comparar situaciones de luz y exposición a partir de ejemplos.',
      instructions: 'Resolvé las consignas usando el material seleccionado y explicá tu razonamiento.', assignmentPrompts, questions, warnings: [],
      evidence: (input.type === 'ASSIGNMENT' ? assignmentPrompts : questions).map((_, index) => ({ item: input.type === 'ASSIGNMENT' ? 'assignment' : 'question', index, references: [reference] })) };
    return { json: { status: 'READY', proposal }, inputTokens: 200, outputTokens: 180 };
  },
};
export const aiEnvironment = {
  AI_ENABLED: 'true', AI_BACKEND: 'gemini-developer', AI_MODEL: 'controlled-activity-live', AI_API_KEY: 'synthetic-only',
  AI_DAILY_ACTOR_REQUESTS: '100', AI_DAILY_GLOBAL_REQUESTS: '200', AI_DAILY_BUDGET_USD: '10',
  AI_MAX_INPUT_TOKENS: '100000', AI_MAX_OUTPUT_TOKENS: '16384', AI_INPUT_USD_PER_MILLION: '1', AI_OUTPUT_USD_PER_MILLION: '2',
  AI_DEADLINE_MS: '90000', AI_MAX_CONCURRENCY: '2', AI_MAX_DISPATCHES: '2', AI_MAX_JOB_AGE_MS: '300000',
};
