import type { StudyRun } from './study-commands.ts';
import type {StudyConversation,StudyDetail,StudyGeneration,StudyTurn} from './study-contracts.ts';

export type StudyGenerationRequest=StudyGeneration&{conversationId:string;message:string};
export type StudyGenerationInput=Pick<StudyGeneration,'kind'|'topicIds'|'sourceIds'|'questionCount'|'difficulty'|'review'>&{message:string};
export type StudyGenerationRun=StudyRun;

export function studyGenerationRequests(conversation?:StudyConversation):StudyGenerationRequest[]{
 if(!conversation)return [];
 return (conversation.messages??conversation.turns??[]).flatMap(turn=>turn.role==='user'&&turn.generation
  ?[{conversationId:conversation.id,message:turn.content??turn.text??'',...turn.generation}]:[]);
}

/** Only public identity belongs in a chat result card; practice answers stay in the practice view. */
export function studyGenerationResult(detail:Pick<StudyDetail,'creations'|'practices'>&Partial<Pick<StudyDetail,'exams'>>,turn:StudyTurn):{kind:'creation'|'practice'|'exam';id:string;title:string}|null{
 if(turn.role!=='assistant'||[turn.creationId,turn.practiceId,turn.examId].filter(Boolean).length!==1)return null;
 const kind=turn.creationId?'creation':turn.practiceId?'practice':'exam',id=turn.creationId??turn.practiceId??turn.examId;
 const entries=kind==='creation'?detail.creations:kind==='practice'?detail.practices:detail.exams??[];
 const resource=entries.find(item=>item.id===id);
 return resource?{kind,id:resource.id,title:resource.title??'Práctica personal'}:null;
}

export function studyGenerationRetryData(request:StudyGenerationRequest):StudyGenerationInput{
 return {kind:request.kind,message:request.message,topicIds:[...request.topicIds],questionCount:request.questionCount,difficulty:request.difficulty,
  ...(request.review?{review:request.review}:{}),
  ...(request.sourceIds?{sourceIds:[...request.sourceIds]}:{})};
}

export async function requestStudyGeneration({conversationId,data,requestId,run,onConversation}:{conversationId?:string;data:StudyGenerationInput;requestId:string;run:StudyGenerationRun;onConversation:(id:string)=>void}){
 let id=conversationId;
 if(!id){
  const response=await run('NEW_CONVERSATION',{title:data.message.slice(0,80)}) as {result?:{conversation?:{id?:unknown}}};
  if(typeof response?.result?.conversation?.id!=='string'||!response.result.conversation.id)throw new Error('No pudimos seleccionar el nuevo chat. Tu indicación se conserva.');
  id=response.result.conversation.id;onConversation(id);
 }
 const response=await run('GENERATE',{...data,conversationId:id},requestId);
 return {conversationId:id,response};
}
