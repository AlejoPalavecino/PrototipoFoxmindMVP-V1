import type { StudySchemaContext } from '../../../../../../../../src/core/domain/study/engine.ts';
import { interactiveDiagramSchema } from '../../../../../../../../src/core/domain/foxy/interactive-diagram.ts';
const reference={type:'object',properties:{id:{type:'string'},version:{type:'string'}},required:['id','version'],additionalProperties:false};
export const studyResponseSchema={type:'object',properties:{
 status:{type:'string',enum:['COMPLETE','INSUFFICIENT']},title:{type:'string'},markdown:{type:'string'},
 sourceRefs:{type:'array',items:reference},missingInformation:{type:'array',items:{type:'string'}},
 practice:{type:'object',properties:{title:{type:'string'},questions:{type:'array',items:{type:'object',properties:{
  id:{type:'string'},topicId:{type:'string'},type:{type:'string',enum:['SINGLE','MULTIPLE','DEVELOPMENT']},prompt:{type:'string'},
  options:{type:'array',items:{type:'object',properties:{id:{type:'string'},text:{type:'string'}},required:['id','text'],additionalProperties:false}},
  correctOptionIds:{type:'array',items:{type:'string'}},scoringRule:{type:'string',enum:['EXACT','PARTIAL']},explanation:{type:'string'},sourceRefs:{type:'array',items:reference}
 },required:['id','topicId','type','prompt','options','correctOptionIds','scoringRule','explanation','sourceRefs'],additionalProperties:false}}},required:['title','questions'],additionalProperties:false},
 units:{type:'array',items:{type:'object',properties:{title:{type:'string'},topics:{type:'array',items:{type:'string'}}},required:['title','topics'],additionalProperties:false}}
},required:['status','title','markdown','sourceRefs','missingInformation'],additionalProperties:false};

/** Bind output identifiers to the authorized snapshot; never ask the model to invent IDs. */
export function studySchemaFor(context: Partial<StudySchemaContext> = {}) {
 const schema=structuredClone(studyResponseSchema);

  if(context.topics?.length){Object.assign(schema.properties.practice.properties.questions.items.properties.topicId,{enum:context.topics.map(t=>t.id)});}
  if(context.sources?.length){
   const refs={anyOf:context.sources.map(s=>({type:'object',properties:{id:{type:'string',enum:[s.id]},version:{type:'string',enum:[s.version]}},required:['id','version'],additionalProperties:false}))};
   Object.assign(schema.properties.sourceRefs,{items:refs});Object.assign(schema.properties.practice.properties.questions.items.properties.sourceRefs,{items:refs});
  }
  if(Number.isInteger(context.questionCount)&&context.questionCount!>=1&&context.questionCount!<=30)Object.assign(schema.properties.practice.properties.questions,{minItems:context.questionCount,maxItems:context.questionCount});
  if (context.action === 'QUIZ') {
    const item = schema.properties.practice.properties.questions.items;
    item.required.push('optionFeedback');
    Object.assign(item.properties, { optionFeedback: { type: 'array', maxItems: 8, items: { type: 'object',
      properties: { optionId: { type: 'string' }, text: { type: 'string', minLength: 1, maxLength: 500 } },
      required: ['optionId', 'text'], additionalProperties: false,
    } } });
  }
  if (context.action === 'NOTE' || context.action === 'EXPLANATION') {
    const { status, title, markdown, sourceRefs, missingInformation } = schema.properties;
    return { ...schema, properties: { status, title: { ...title, maxLength: 200 }, markdown, sourceRefs, missingInformation } };
  }
  if (context.action === 'OUTLINE') {
    const { status, title, markdown, sourceRefs, missingInformation } = schema.properties;
    return { ...schema, properties: { status, title, markdown, sourceRefs, missingInformation, diagram: interactiveDiagramSchema } };
  }
  if (context.action === 'REVIEW_PLAN') {
    return { ...schema, properties: { status: schema.properties.status, title: schema.properties.title,
      markdown: schema.properties.markdown, sourceRefs: schema.properties.sourceRefs, missingInformation: schema.properties.missingInformation,
      reviewSessions: { type: 'array', minItems: context.reviewCount, maxItems: context.reviewCount, items: {
        type: 'object', properties: { title: { type: 'string' }, activity: { type: 'string' },
          topicIds: { type: 'array', minItems: 1, items: { type: 'string', enum: context.topics?.map(topic => topic.id) } } },
        required: ['title', 'topicIds', 'activity'], additionalProperties: false,
      } },
    } };
  }

 return schema;
}
