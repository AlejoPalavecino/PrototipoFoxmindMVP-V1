import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
const text=n=>typeof n==='string'?n:Array.isArray(n)?n.map(text).join(' '):text(n?.props?.children??'');
const notification=(id,eventType)=>({id,eventType,classroomName:'Aula sintética',activityTitle:'Actividad',createdAt:'2026-11-05T10:00:00Z',readAt:null});
test('el centro de notificaciones filtra tipos y marca todas las páginas autorizadas como leídas',async()=>{
  const {Notifications}=loadTsModule('apps/web/src/features/notifications/ui/Notifications.tsx'),calls=[];
  let read=false;
  const api={call:async(path,method)=>{calls.push([path,method]);if(path==='/notifications/read-all'&&method==='POST'){read=true;return {read:true,updatedCount:3};}
    if(path.includes('cursor='))return {items:[notification('n3','WALL_REPLY')],nextCursor:null,unreadCount:3};
    if(read)return {items:[],nextCursor:null,unreadCount:0};
    return {items:[notification('n1','SUBMISSION_RECEIVED'),notification('n2','GRADE_PUBLISHED')],nextCursor:'next',unreadCount:3};}};
  const view=hookView(Notifications,{api,refresh:0,presentation:'center',onSelect(){}});
  try{await view.flush();
    const filter=descendants(view.tree,n=>n.type==='button'&&text(n)==='Resultados')[0];assert.ok(filter);filter.props.onClick();await view.flush();
    assert.equal(descendants(view.tree,n=>n.type==='h3'&&text(n)==='Nueva entrega recibida').length,0);
    assert.equal(descendants(view.tree,n=>n.type==='h3'&&text(n)==='Calificación publicada').length,1);
    const all=descendants(view.tree,n=>n.type==='button'&&text(n)==='Marcar todas como leídas')[0];assert.ok(all);
    all.props.onClick();await view.flush();
    assert.deepEqual(calls.filter(([,method])=>method==='POST'),[['/notifications/read-all','POST']]);
    assert.equal(descendants(view.tree,n=>n.type==='button'&&text(n)==='Marcar todas como leídas').length,0);
  }finally{view.close();}
});
test('la vista rápida ofrece acceso al centro completo',async()=>{
  const {Notifications}=loadTsModule('apps/web/src/features/notifications/ui/Notifications.tsx');
  const view=hookView(Notifications,{api:{call:async()=>({items:[],nextCursor:null,unreadCount:0})},refresh:0,onSelect(){}});
  try{await view.flush();descendants(view.tree,n=>n.type==='button'&&n.props['aria-haspopup']==='dialog')[0].props.onClick();await view.flush();
    assert.ok(descendants(view.tree,n=>n.type==='a'&&n.props.href==='/notificaciones'&&/Ver todas/.test(text(n))).length);
  }finally{view.close();}
});

test('el centro muestra identidad y contexto autorizados sin controles de tipos inexistentes',async()=>{
 const {Notifications}=loadTsModule('apps/web/src/features/notifications/ui/Notifications.tsx');
 const row={...notification('n','WALL_QUERY'),actorName:'Ana <literal>',classroomDivision:'4.º A',message:'¿Cómo observamos el entorno?'};delete row.activityTitle;
 const view=hookView(Notifications,{api:{call:async()=>({items:[row],nextCursor:null,unreadCount:1})},refresh:0,presentation:'center',onSelect(){}});
 try{await view.flush();assert.equal(descendants(view.tree,n=>n.type==='h3')[0].props.children,'Consulta de Ana <literal>');assert.match(text(view.tree),/Aula sintética\s+· 4.º A/);assert.match(text(view.tree),/¿Cómo observamos el entorno/);assert.equal(descendants(view.tree,n=>n.type==='button'&&text(n)==='Resultados').length,0);assert.equal(descendants(view.tree,n=>n.type==='button'&&n.props['aria-label']==='Actualizar notificaciones').length,0);}finally{view.close();}
});
