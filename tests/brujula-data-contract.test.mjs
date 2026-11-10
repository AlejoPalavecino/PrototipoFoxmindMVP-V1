import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHomePage } from '../src/core/domain/home/rows-validation.ts';
import { parseHomeResponse, parseHomeTarget } from '../src/core/domain/home/validation.ts';
const id='a1111111-1111-4111-8111-111111111111', at='2026-11-05T12:00:00.000Z';
const classroom={id,name:'Aula',division:'1',subject:'Materia',role:'student',coverKey:'math',archived:false,timeZone:'UTC'};
const target={kind:'activity',classroomId:id,activityId:id};
const page=items=>({status:'ready',items,totalItems:items.length,nextCursor:null});
test('new Home modules validate state without private grades',()=>{
 assert.equal(parseHomePage('drafts',page([{id,title:'Borrador',target,classroom:{...classroom,role:'teacher'},activityType:'ASSIGNMENT',updatedAt:at}])).items.length,1);
 const item={id,title:'Entregada',target,classroom,activityType:'ASSIGNMENT',attemptNumber:2,submittedAt:at};
 assert.equal(parseHomePage('submitted',page([item])).items[0].attemptNumber,2);
 assert.throws(()=>parseHomePage('submitted',page([{...item,finalGrade:'9'}])));
});
test('student plan and exact next topic are additive and validated',()=>{
 const nextTopic={unitId:id,unitName:'Unidad',topicId:id,topicName:'Tema'};
 const item={id,title:'Aula',target:{kind:'classroom',classroomId:id,section:'plan',topicId:id},classroom,planProgress:{taught:1,total:3},nextTopic};
 assert.deepEqual(parseHomePage('classrooms',page([item])).items[0].nextTopic,nextTopic);
 assert.equal(parseHomeTarget(item.target).topicId,id);
 assert.throws(()=>parseHomePage('classrooms',page([{...item,planProgress:{taught:4,total:3}}])));
});
test('old Home payload accepts absent additive modules',()=>{
 const modules=Object.fromEntries(['pending','review','feedback','agenda','queries','materials','classrooms'].map(name=>[name,page([])]));
 const result=parseHomeResponse({version:1,subjectId:id,generatedAt:at,timeZone:'UTC',participation:'none',memberships:{study:0,teach:0,archived:0},setup:{drafts:0,invitations:0},modules});
 assert.equal(result.modules.drafts.status,'not-applicable');
 assert.equal(result.modules.submitted.status,'not-applicable');
});
