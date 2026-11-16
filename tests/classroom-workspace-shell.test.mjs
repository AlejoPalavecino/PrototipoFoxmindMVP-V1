import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTsModule} from './helpers/load-ts-module.mjs';
import {descendants} from './agenda-ui-helpers.test.mjs';

const room={id:'classroom',role:'teacher',name:'Ciencias Naturales',subject:'Biología',division:'A',academicYear:2026,teacher:'Docente Demo',timezone:'America/Argentina/Buenos_Aires',coverKey:'biology',archived:false,units:[{topics:[{status:'TAUGHT'},{status:'PENDING'}]},{topics:[]}]};
test('Classroom header keeps course identity, real counts and role-specific actions', () => {
  const { ClassroomHeader } = loadTsModule('apps/web/src/features/classrooms/ui/ClassroomHeader.tsx');
  for (const [role, pendingLabel, primaryLabel, pendingSection] of [
    ['teacher', 'por revisar', 'Invitar estudiantes', 'progress'],
    ['student', 'por hacer', 'Mi progreso', 'activities'],
  ]) {
    const destinations = [];
    let invites = 0;
    const props = {
      room: { ...room, role, studentCount: 3 }, pendingCount: 4,
      onNavigate: value => destinations.push(value), onInvite: () => { invites++; },
    };
    const html = renderToStaticMarkup(createElement(ClassroomHeader, props));
    assert.match(html, /<img[^>]+src="\/foxmind\/biology\.webp"[^>]+alt=""/);
    assert.match(html, /<h1>Ciencias Naturales<\/h1>/);
    assert.match(html, /<b>Biología<\/b><span>A · 2026<\/span>/);
    assert.match(html, /3 estudiantes.*Docente Demo/);
    assert.ok(html.includes(`<b>4</b></span><small>${pendingLabel}</small>`));
    assert.match(html, /<b>1 \/ 2<\/b><\/span><small>temas trabajados<\/small>/);
    const buttons = descendants(ClassroomHeader(props), n => n.type === 'button');
    assert.equal(buttons.length, 3);
    const primary = buttons.find(n => n.props['aria-label'] === primaryLabel);
    assert.ok(primary);
    for (const button of buttons) button.props.onClick();
    assert.deepEqual(destinations, role === 'teacher' ? [pendingSection, 'plan'] : [pendingSection, 'plan', 'progress']);
    assert.equal(invites, role === 'teacher' ? 1 : 0);
  }
  const archived = ClassroomHeader({ room: { ...room, archived: true } });
  assert.equal(descendants(archived, n => n.type === 'button' && n.props['aria-label'] === 'Invitar estudiantes')[0]?.props.disabled, true);
});
for(const teacher of [true,false])test(`Classroom navigation preserves exact destinations and labels for ${teacher?'teacher':'student'}`,()=>{
  const {ClassroomNavigation}=loadTsModule('apps/web/src/features/classrooms/ui/ClassroomNavigation.tsx');
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
