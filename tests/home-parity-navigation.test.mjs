import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants } from './agenda-ui-helpers.test.mjs';
const room={id:'r1',name:'Fotografía',subject:'Arte',division:'3 A',coverKey:'literature',archived:false};

test('Home classroom card opens its real plan and preserves modified-click browser navigation',()=>{
 const {HomeClassCards}=loadTsModule('apps/web/src/features/home/dashboard/HomeClassCards.tsx');
 const target={kind:'classroom',classroomId:'r1',section:'plan'},calls=[];
 const tree=HomeClassCards({data:{modules:{classrooms:{status:'ready',items:[{classroom:room,planProgress:{taught:0,total:0},target}]}}},onAction:x=>calls.push(x),onClassrooms(){},onRetry(){}});
 const card=descendants(tree,x=>x.type==='a')[0];
 assert.match(card.props.href,/aula=r1/);let prevented=0;
 card.props.onClick({button:0,ctrlKey:true,preventDefault(){prevented++;}});assert.equal(prevented,0);assert.equal(calls.length,0);
 card.props.onClick({button:0,preventDefault(){prevented++;}});assert.equal(prevented,1);assert.deepEqual(calls,[target]);
 assert.equal(descendants(tree,x=>x.props?.role==='progressbar').length,0,'An empty plan has no fabricated percentage');
});

test('Home student preview retains three live activities and never opens a closed activity in answer mode',()=>{
 const {HomePriorities}=loadTsModule('apps/web/src/features/home/queue/HomePriorities.tsx'),calls=[];
 const items=[0,1,2,3].map(i=>({id:'a'+i,title:'Tema '+i,classroom:room,activityType:'QUESTIONNAIRE',reception:i===1?'closed':'open',deadlineAt:null,target:{kind:'activity',classroomId:room.id,activityId:'a'+i}}));
 const tree=HomePriorities({data:{timeZone:'UTC',modules:{pending:{status:'ready',items},review:{status:'not-applicable'},queries:{status:'not-applicable'}}},teacher:false,tab:'review',onAction:x=>calls.push(x),onList(){}});
 const cards=descendants(tree,x=>x.type==='article');assert.equal(cards.length,3);
 const buttons=cards.map(card=>descendants(card,x=>x.type==='button')[0]);buttons.forEach(button=>button.props.onClick());
 assert.deepEqual(calls,[{...items[0].target,mode:'respond'},items[1].target,{...items[2].target,mode:'respond'}]);
});

test('Reference CSS never promotes discarded selectors into a root hiding rule',async()=>{
 const {readFile}=await import('node:fs/promises');const {default:postcss}=await import('postcss');
 for(const [file,root] of [['../apps/web/src/features/home/dashboard/styles/parity-home.css','#foxmind-product.fm3d-theme .p5-app .parity-home'],['../apps/web/src/features/classrooms/styles/parity-catalog-fidelity.css','#foxmind-product.fm3d-theme .p5-app .parity-catalog[class]']]){
  const sheet=postcss.parse(await readFile(new URL(file,import.meta.url),'utf8'));let roots=0;
  sheet.walkRules(rule=>{assert.ok(rule.selector.trim());if(rule.selector===root){roots++;rule.walkDecls('display',decl=>assert.notEqual(decl.value,'none'));}});
  assert.equal(roots,1,file+' has only its intended foundation rule');
 }
});

test('Teacher groups preserve the approved group/people/row hierarchy and exact review targets',()=>{
 const {HomePriorities}=loadTsModule('apps/web/src/features/home/queue/HomePriorities.tsx'),calls=[];
 const rows=[0,1,2].map(i=>({id:'r'+i,title:i<2?'Foto':'Luz',classroom:room,studentName:'Persona '+i,oldestSubmittedAt:'2026-11-15T12:00Z',needsReview:1,readyToPublish:0,target:{kind:'submissions',classroomId:room.id,activityId:i<2?'a':'b',attemptId:'t'+i,filter:'unpublished'}}));
 const tree=HomePriorities({data:{timeZone:'UTC',modules:{review:{status:'ready',items:rows,totalItems:3},queries:{status:'ready',items:[],totalItems:0}}},teacher:true,tab:'review',onAction:x=>calls.push(x)});
 const groups=descendants(tree,x=>x.props?.className==='review-group tone-peach');assert.equal(groups.length,2);
 assert.deepEqual(groups.map(g=>descendants(g,x=>x.props?.className==='submission-row').length),[2,1]);
 for(const row of descendants(tree,x=>x.props?.className==='submission-row'))row.props.onClick();
 assert.deepEqual(calls,rows.map(r=>r.target));
});
