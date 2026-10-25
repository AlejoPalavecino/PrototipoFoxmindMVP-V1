const string = { type: 'string' }, integer = { type: 'integer' };
const object = (properties: Record<string, unknown>) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const array = (items: unknown) => ({ type: 'array', items });
export const activityProposalSchemaV1 = object({
  schemaVersion: { type: 'string', enum: ['activity-proposal-v1'] },
  type: { type: 'string', enum: ['ASSIGNMENT', 'QUESTIONNAIRE', 'EVALUATION'] }, title: string,
  objective: string, instructions: string, assignmentPrompts: array(string),
  questions: array(object({ type: { type: 'string', enum: ['DEVELOPMENT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE'] },
    prompt: string, points: string, scoringRule: { anyOf: [{ type: 'string', enum: ['EXACT', 'PARTIAL'] }, { type: 'null' }] },
    options: array(object({ text: string, correct: { type: 'boolean' } })) })),
  evidence: array(object({ item: { type: 'string', enum: ['assignment', 'question'] }, index: integer,
    references: array(object({ sourceId: string, page: { anyOf: [integer, { type: 'null' }] } })) })),
  warnings: array({ type: 'string', enum: ['DOCX_IMAGES_OMITTED', 'GROUNDING_REQUIRES_REVIEW', 'PARTIAL_CONTENT'] }),
});
export const activityGenerationResponseSchemaV1 = { type: 'object', anyOf: [
  object({ status: { type: 'string', enum: ['READY'] }, proposal: activityProposalSchemaV1 }),
  object({ status: { type: 'string', enum: ['INSUFFICIENT_CONTENT'] }, missingInformation: array(string) }),
] };
