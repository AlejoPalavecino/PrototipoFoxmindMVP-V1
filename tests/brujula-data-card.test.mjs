import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTsModule } from './helpers/load-ts-module.mjs';
const {ClassroomCard}=loadTsModule('apps/web/src/features/classrooms/collection/ClassroomCollectionCard.tsx');
const room={id:'room',name:'Materia',subject:'Ciencias',division:'A',academicYear:2026,coverKey:'math',role:'teacher',teacher:'Docente',archived:false};
const render=patch=>renderToStaticMarkup(ClassroomCard({room:{...room,...patch},onEnter:()=>{}}));
test('catalog card shows actual students and measured plan progress accessibly',()=>{
 const html=render({studentCount:3,planProgress:{taught:1,total:4}});
 assert.match(html,/3 estudiantes/); assert.match(html,/25%/);assert.match(html,/aria-valuenow="25"/);assert.match(html,/1 de 4 temas dados/);
 assert.match(render({studentCount:0,planProgress:{taught:0,total:0}}),/0 estudiantes/);
});
test('missing or empty plans never invent zero progress',()=>{
 for(const patch of [{},{planProgress:{taught:0,total:0}}]) {
  const html=render(patch);assert.doesNotMatch(html,/role="progressbar"|>0%</);assert.match(html,/No disponible|Sin temas/);
 }
 const html=render({role:'student',teacher:'Docente visible',planProgress:{taught:2,total:2}});assert.match(html,/Docente visible/);assert.match(html,/100%/);
});
