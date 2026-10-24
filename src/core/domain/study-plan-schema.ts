const name = { type: 'string', minLength: 1, maxLength: 120 };
const topic = { type: 'object', additionalProperties: false, required: ['name'], properties: { name } };
// Keep array size limits in local validation: nested maxItems made Gemini reject this schema.
export const studyPlanSchemaV1 = {
  type: 'object', additionalProperties: false, required: ['units', 'warnings'],
  properties: {
    units: { type: 'array', minItems: 0, items: {
      type: 'object', additionalProperties: false, required: ['name', 'topics'], properties: {
        name, topics: { type: 'array', minItems: 1, items: topic },
      },
    } },
    warnings: { type: 'array', uniqueItems: true,
      items: { type: 'string', enum: ['PARTIAL_STRUCTURE', 'DOCX_IMAGES_OMITTED'] } },
  },
};
