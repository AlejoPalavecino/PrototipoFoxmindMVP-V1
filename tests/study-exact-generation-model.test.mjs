import test from 'node:test';
import assert from 'node:assert/strict';
import {studyGenerationRequests,studyGenerationResult,requestStudyGeneration} from '../apps/web/src/features/study/model/study-generation.ts';

const generation={requestId:'request',kind:'QUIZ',topicIds:['topic'],questionCount:5,difficulty:'MEDIUM',status:'PENDING'};
test('la recarga reconstruye sólo solicitudes reales y estados del recibo',()=>{
 const current={id:'chat',turns:[{id:'plain',role:'user',text:'Pregunta normal'},{id:'request-turn',role:'user',text:'Quiero practicar',generation},{id:'result',role:'assistant',generationRequestId:'request',practiceId:'practice'}]};
 assert.deepEqual(studyGenerationRequests(current),[{conversationId:'chat',message:'Quiero practicar',...generation}]);
 assert.equal(studyGenerationRequests({...current,turns:current.turns.map(turn=>turn.generation?{...turn,generation:{...generation,status:'CANCELLED'}}:turn)})[0].status,'CANCELLED');
});
test('el marcador abre únicamente su recurso exacto sin mostrar respuestas o soluciones',()=>{
 const practice={id:'practice',title:'Mi práctica',questions:[{prompt:'Dato privado no debe salir de esta proyección'}],answers:{a:'respuesta'},feedback:'devolución'};
 const detail={creations:[{id:'other',title:'Otro apunte',markdown:'Otro cuerpo'}],practices:[practice]};
 assert.deepEqual(studyGenerationResult(detail,{role:'assistant',generationRequestId:'request',practiceId:'practice'}),{kind:'practice',id:'practice',title:'Mi práctica'});
 assert.equal(studyGenerationResult(detail,{role:'assistant',creationId:'missing'}),null);
 assert.equal(studyGenerationResult(detail,{role:'assistant',creationId:'other',practiceId:'practice'}),null);
});
for(const existing of [false,true])test(`generar ${existing?'en chat existente':'en chat nuevo'} conserva mensaje, parámetros e identidad`,async()=>{
 const calls=[],selected=[];
 const run=async(action,data,requestId)=>{calls.push({action,data,requestId});return action==='NEW_CONVERSATION'?{result:{conversation:{id:'new-chat'}}}:{result:{practice:{id:'practice'}}};};
 const data={kind:'QUIZ',message:'Mi indicación real',topicIds:['topic'],questionCount:5,difficulty:'MEDIUM'};
 await requestStudyGeneration({conversationId:existing?'old-chat':undefined,data,requestId:'same-request',run,onConversation:id=>selected.push(id)});
 assert.equal(calls.length,existing?1:2);
 assert.deepEqual(calls.at(-1),{action:'GENERATE',data:{...data,conversationId:existing?'old-chat':'new-chat'},requestId:'same-request'});
 assert.deepEqual(selected,existing?[]:['new-chat']);
});
