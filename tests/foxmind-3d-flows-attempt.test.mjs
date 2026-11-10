import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView } from './agenda-ui-helpers.test.mjs';

const id = '11111111-1111-4111-8111-111111111111';
for(const type of ['QUESTIONNAIRE','EVALUATION'])test(`responding explicitly starts ${type}, while an existing attempt is never restarted`,async()=>{
 const {openActivitySession}=loadTsModule("apps/web/src/features/participation/model/open-activity-session.ts");let writes=0;
 const api={call:async()=>({activity:{type},canStart:true}),attempt:async()=>{writes++;return {activity:{type},canStart:false,attempt:{id:'draft'}};}};
 assert.equal((await openActivitySession(api,id,id)).attempt.id,'draft');assert.equal(writes,1);
 api.call=async()=>({activity:{type},canStart:false,attempt:{id:'existing'}});
 assert.equal((await openActivitySession(api,id,id)).attempt.id,'existing');assert.equal(writes,1);
});
test('aborting preparation during CSRF prevents the attempt start request',async()=>{
 const {openActivitySession}=loadTsModule("apps/web/src/features/participation/model/open-activity-session.ts");let release,entered,writes=0;
 const csrf=new Promise(resolve=>release=resolve),waiting=new Promise(resolve=>entered=resolve),controller=new AbortController();
 const result=openActivitySession({call:async()=>({activity:{type:'ASSIGNMENT'},canStart:true}),attempt:async(_path,_data,_editor,signal)=>{entered();await csrf;signal?.throwIfAborted();writes++;return {};}},id,id,controller.signal);
 await waiting;controller.abort();release();await assert.rejects(result,{name:'AbortError'});assert.equal(writes,0);
});
test('a non-expected activity stays read-only even when late submissions are generally allowed',()=>{
 const {studentActivityState}=loadTsModule("apps/api/src/modules/activities/domain/activity-list-state.ts");
 assert.equal(studentActivityState({deadline_at:null,allow_late_submissions:true},{expected:false,status:null},new Date()),'READ_ONLY');
});
test('student list state uses published results, reattempts and the existing receipt-time deadline policy',()=>{
 const {studentActivityState}=loadTsModule("apps/api/src/modules/activities/domain/activity-list-state.ts");
 const now=new Date('2026-11-06T12:00Z'),activity={deadline_at:new Date('2026-11-05T12:00Z'),allow_late_submissions:false};
 assert.equal(studentActivityState(activity,{expected:true},now),'CLOSED');
 assert.equal(studentActivityState(activity,{expected:true,first_deadline:new Date('2026-11-07T12:00Z')},now),'PENDING');
 assert.equal(studentActivityState(activity,{expected:true,status:'DRAFT',number:1},now),'DRAFT');
 assert.equal(studentActivityState(activity,{expected:true,status:'DRAFT',number:2},now),'RESUBMISSION');
 assert.equal(studentActivityState(activity,{expected:true,status:'SUBMITTED',number:1,published:false},now),'SUBMITTED');
 assert.equal(studentActivityState(activity,{expected:true,status:'SUBMITTED',number:1,published:true},now),'REVIEWED');
});
for (const [type, canStart, expected] of [['ASSIGNMENT', true, 0], ['ASSIGNMENT', false, 0], ['QUESTIONNAIRE', true, 0], ['EVALUATION', true, 0]])
  test(`D9 explicit ${type} target canStart=${canStart} consults without starting an attempt`, async () => {
    const { Activities } = loadTsModule("apps/web/src/application/academic-Activities.tsx");
    const starts = [], session = { activity: { id, title: 'Actividad dirigida', type, questions: [] }, canStart, attempt: null };
    const api = { call: async path => path.endsWith('/activities') ? { activities: [] } : session,
      attempt: async (...args) => { starts.push(args); return { ...session, canStart: false, attempt: { id: 'attempt', status: 'DRAFT' } }; } };
    const view = hookView(Activities, { api, room: { id, role: 'student', archived: false, units: [], timezone: 'UTC' },
      reload: async () => {}, target: { kind: 'activity', classroomId: id, activityId: id } });
    try {
      await view.flush(); assert.equal(starts.length, expected);
      if (expected) { assert.equal(starts[0][0], `/${id}/activities/${id}/start`); assert.deepEqual(starts[0][1], {}); }
    } finally { view.close(); }
  });

test('a response URL without a local response action only consults the activity',async()=>{
 const {Activities}=loadTsModule("apps/web/src/application/academic-Activities.tsx"),starts=[];
 const session={activity:{id,title:'Campo',type:'ASSIGNMENT',questions:[]},canStart:true,attempt:null};
 const api={call:async path=>path.endsWith('/activities')?{activities:[]}:session,attempt:async(...args)=>{starts.push(args);return session;}};
 const view=hookView(Activities,{api,room:{id,role:'student',archived:false,units:[],timezone:'UTC'},reload:async()=>{},target:{kind:'activity',classroomId:id,activityId:id,mode:'respond'}});
 try{await view.flush();assert.equal(starts.length,0);}finally{view.close();}
});

test('explicit response destination prepares the practical attempt through the existing start port',async()=>{
 const {Activities}=loadTsModule("apps/web/src/application/academic-Activities.tsx",{stubs:{"./model/activity-response-intent.ts":{consumeActivityResponse:()=>true}}}),starts=[];
 const session={activity:{id,title:'Campo',type:'ASSIGNMENT',questions:[]},canStart:true,attempt:null};
 const api={call:async path=>path.endsWith('/activities')?{activities:[]}:session,attempt:async(...args)=>{starts.push(args);return {...session,canStart:false,attempt:{id:'attempt',status:'DRAFT'}};}};
 const view=hookView(Activities,{api,room:{id,role:'student',archived:false,units:[],timezone:'UTC'},reload:async()=>{},target:{kind:'activity',classroomId:id,activityId:id,mode:'respond'}});
 try{await view.flush();assert.deepEqual(starts.map(args=>args.slice(0,2)),[[`/${id}/activities/${id}/start`,{}]]);assert.ok(starts[0][3] instanceof AbortSignal);}finally{view.close();}
});

test('response intent is scoped, expires and can only be consumed once',()=>{
 const {grantActivityResponse,consumeActivityResponse}=loadTsModule("apps/web/src/features/participation/model/activity-response-intent.ts");
 grantActivityResponse('room','activity');assert.equal(consumeActivityResponse('foreign','activity'),false);assert.equal(consumeActivityResponse('room','activity'),false);
 grantActivityResponse('room','activity');assert.equal(consumeActivityResponse('room','activity'),true);assert.equal(consumeActivityResponse('room','activity'),false);
 const previous=Date.now;try{Date.now=()=>100;grantActivityResponse('room','activity');Date.now=()=>15101;assert.equal(consumeActivityResponse('room','activity'),false);}finally{Date.now=previous;}
});
