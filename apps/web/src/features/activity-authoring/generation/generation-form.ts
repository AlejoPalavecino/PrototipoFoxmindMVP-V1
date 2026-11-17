import type { StartActivityGeneration } from '../../../../../../src/core/domain/activities/activity-generation.ts';

export const teacherBriefLimit = 1200;
export type GenerationFormValue = Omit<StartActivityGeneration, 'revision' | 'requestId' | 'unitId' | 'unitIds' | 'teacherBrief'> & { unitIds: string[]; teacherBrief: string };
export function defaultGenerationCounts(type: GenerationFormValue['type']) {
  return type === 'ASSIGNMENT' ? { assignment: 3, development: 0, singleChoice: 0, multipleChoice: 0 }
    : { assignment: 0, development: 2, singleChoice: 2, multipleChoice: 0 };
}
export function defaultGenerationForm(): GenerationFormValue {
  return { type: 'ASSIGNMENT', unitIds: [], topicIds: [], teacherBrief: '', sourceIds: [], objective: '', groupLevel: '',
    difficulty: 'INTERMEDIATE', durationMinutes: 40, context: '',
    counts: defaultGenerationCounts('ASSIGNMENT'), acknowledgedWarnings: [] };
}
