import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTsModule} from './helpers/load-ts-module.mjs';
import {descendants} from './agenda-ui-helpers.test.mjs';

const room={id:'classroom',role:'teacher',name:'Ciencias Naturales',subject:'Biología',division:'A',academicYear:2026,teacher:'Docente Demo',timezone:'America/Argentina/Buenos_Aires',coverKey:'biology',archived:false};
test('Classroom header uses the approved panoramic cover and gives the course title priority',()=>{
  const {ClassroomHeader}=loadTsModule('apps/classrooms-ui/ClassroomHeader.tsx');
  const html=renderToStaticMarkup(createElement(ClassroomHeader,{room}));
  assert.match(html,/class-mast-art/);
  assert.match(html,/<h1>Ciencias Naturales<\/h1>/);
  assert.match(html,/Aula.*A.*2026/);
  assert.doesNotMatch(html,/classroom-literature-hero/);
});
for(const teacher of [true,false])test(`Classroom navigation preserves exact destinations and labels for ${teacher?'teacher':'student'}`,()=>{
  const {ClassroomNavigation}=loadTsModule('apps/classrooms-ui/ClassroomNavigation.tsx');
  const calls=[];
  const tree=ClassroomNavigation({teacher,selected:'plan',onSelect:value=>calls.push(value),tabsRef:{current:null}});
  const buttons=descendants(tree,n=>n.type==='button');
  assert.equal(buttons.length,teacher?8:6);
  assert.equal(buttons.filter(n=>n.props['aria-current']==='page').length,1);
  assert.equal(buttons[0].props['data-section'],'plan');
  assert.equal(buttons.filter(n=>n.props['data-group']==='management').length,teacher?3:0);
  assert.equal(buttons.filter(n=>n.props['data-group']==='learning').length,teacher?5:6);
  for(const button of buttons)button.props.onClick();
  assert.deepEqual(calls,teacher?['plan','wall','library','activities','progress','members','history','settings']:['plan','wall','library','activities','progress','members']);
});
