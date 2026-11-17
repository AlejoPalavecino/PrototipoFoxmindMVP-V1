import type { StudySchemaContext } from '../../../../../../../../src/core/domain/study/engine.ts';
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
export function studySchemaFor(context: Partial<StudySchemaContext> = {}):typeof studyResponseSchema {
 const schema=structuredClone(studyResponseSchema);

  if(context.topics?.length){Object.assign(schema.properties.practice.properties.questions.items.properties.topicId,{enum:context.topics.map(t=>t.id)});}
  if(context.sources?.length){
   const refs={anyOf:context.sources.map(s=>({type:'object',properties:{id:{type:'string',enum:[s.id]},version:{type:'string',enum:[s.version]}},required:['id','version'],additionalProperties:false}))};
   Object.assign(schema.properties.sourceRefs,{items:refs});Object.assign(schema.properties.practice.properties.questions.items.properties.sourceRefs,{items:refs});
  }
  if(Number.isInteger(context.questionCount)&&context.questionCount!>=1&&context.questionCount!<=30)Object.assign(schema.properties.practice.properties.questions,{minItems:context.questionCount,maxItems:context.questionCount});

 return schema;
}
