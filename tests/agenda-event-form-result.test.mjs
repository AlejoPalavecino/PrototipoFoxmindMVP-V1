import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
import { privateEvent, installWindow, zone } from './agenda-event-form-helpers.test.mjs';

test('rerendering route callbacks never closes an unsaved new event',async()=>{
 const {Agenda}=loadTsModule('apps/agenda-ui/Agenda.tsx'),{useState}=await import('react');
 const restoreWindow=installWindow(),previous=globalThis.sessionStorage;globalThis.sessionStorage={getItem:()=>null,setItem(){}};
 const api={list:async()=>page(),upcoming:async()=>page()};let rerender;
 const view=hookView(()=>{const [tick,setTick]=useState(0);rerender=()=>setTick(tick+1);return Agenda({api,onOpen(){},onEventSelected(){}});},{});
 try{await view.flush();component(view,'AgendaHeader').props.onCreate();await view.flush();assert.ok(component(view,'EventForm'));rerender();await view.flush();assert.ok(component(view,'EventForm'),'Local editor survives an unrelated parent refresh');}
 finally{view.close();restoreWindow();if(previous===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=previous;}
});

test('reference event detail shows the moved occurrence and asks scope before any edit or deletion',async()=>{
 const {EventDetails}=loadTsModule('apps/agenda-ui/EventDetails.tsx'),calls=[],edits=[];
 const base=privateEvent(),date=base.schedule.startLocal.slice(0,10);
 const event={...base,repeat:{kind:'WEEKLY',untilDate:'2026-11-24'},exceptions:[{date,replacement:{...base,schedule:{...base.schedule,startLocal:'2026-11-05T10:00',endLocal:'2026-11-05T11:00'},repeat:{kind:'NONE'},title:'Clase trasladada'}}]};
 const text=n=>typeof n==='string'?n:Array.isArray(n)?n.map(text).join(''):text(n?.props?.children??'');
 const view=hookView(EventDetails,{api:{changeOccurrence:async(...args)=>calls.push(args),remove:async(...args)=>calls.push(args)},event,occurrenceDate:date,onBack(){},onEdit:scope=>edits.push(scope),onRemoved:()=>calls.push('removed')});
 const button=label=>descendants(view.tree,n=>n.type==='button'&&text(n)===label)[0];
 try{await view.flush();assert.match(text(view.tree),/Clase trasladada/);assert.match(text(view.tree),/10:00 – 11:00/);assert.equal(calls.length,0);
 button('Editar evento').props.onClick();await view.flush();button('Solo este evento').props.onClick();assert.deepEqual(edits,['single']);assert.equal(calls.length,0);
 button('Eliminar evento').props.onClick();await view.flush();button('Solo este evento').props.onClick();await view.flush();assert.deepEqual(calls,[[base.id,base.revision,date,null],'removed']);
 }finally{view.close();}
});

async function agendaView(api) {
  const { Agenda } = loadTsModule('apps/agenda-ui/index.ts');
  const previous = globalThis.sessionStorage, restoreWindow = installWindow();
  globalThis.sessionStorage = { getItem: () => JSON.stringify({ month: '2026-10', day: '2026-10-27', zone }), setItem() {} };
  const view = hookView(Agenda, { api, onOpen() {} }); await view.flush();
  return { view, close() { view.close(); restoreWindow();
    if (previous === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = previous;
  } };
}
const component = (view, name) => descendants(view.tree, node => node.type.name === name)[0];
function openEditor(view) {
  const header = component(view, 'AgendaHeader');
  assert.ok(header); header.props.onCreate();
}
const page = () => ({ serverTime: '2026-10-27T12:00:00.000Z', items: [], nextCursor: null });

test('created result converts first date to view zone and loads the new month without reloading old range', async () => {
  const queries = [];
  const context = await agendaView({ async list(range) { queries.push({ ...range }); return page(); },
    async upcoming() { return page(); } });
  try {
    openEditor(context.view); await context.view.flush(); const before = queries.length;
    const event = privateEvent({ schedule: { kind: 'TIMED', timeZone: 'Asia/Tokyo',
      startLocal: '2026-12-01T00:30', endLocal: '2026-12-01T01:30' } });
    component(context.view, 'EventForm').props.onSaved({ kind: 'saved', mode: 'created', event });
    await context.view.flush();
    assert.equal(component(context.view, 'AgendaMonth').props.month, '2026-11');
    assert.equal(component(context.view, 'AgendaDay').props.day, '2026-11-30');
    assert.deepEqual(queries.slice(before), [
      { startDate: '2026-10-26', endDateExclusive: '2026-12-07', timeZone: zone },
      { startDate: '2026-12-01', endDateExclusive: '2027-01-01', timeZone: zone },
    ], 'Only the new visible month and the 31-day range after the newly selected day are queried');
    assert.equal(component(context.view, 'EventForm'), undefined);
    assert.match(renderToStaticMarkup(context.view.tree), /Ver evento/);
  } finally { context.close(); }
});

test('updated weekly result keeps selection until Ver inicio selects the past series start', async () => {
  const context = await agendaView({ async list() { return page(); }, async upcoming() { return page(); } });
  try {
    openEditor(context.view); await context.view.flush();
    const event = privateEvent({ schedule: { kind: 'ALL_DAY', startDate: '2026-09-01', endDateExclusive: '2026-09-02' },
      repeat: { kind: 'WEEKLY', untilDate: '2026-12-01' } });
    component(context.view, 'EventForm').props.onSaved({ kind: 'saved', mode: 'updated', event });
    await context.view.flush();
    assert.equal(component(context.view, 'AgendaDay').props.day, '2026-10-27');
    const button = descendants(context.view.tree, node => node.type === 'button'
      && node.props.children === 'Ver inicio de la serie')[0];
    assert.ok(button); button.props.onClick(); await context.view.flush();
    assert.equal(component(context.view, 'AgendaDay').props.day, '2026-09-01');
    assert.equal(component(context.view, 'AgendaDay').props.focusEventId, event.id);
  } finally { context.close(); }
});

test('failed read after confirmed save preserves success and offers a query retry without another write', async () => {
  let fail = false, reads = 0, writes = 0;
  const context = await agendaView({ async list() { reads++; if (fail) throw new Error('Consulta no disponible'); return page(); },
    async upcoming() { return page(); }, async put() { writes++; } });
  try {
    openEditor(context.view); await context.view.flush(); fail = true;
    component(context.view, 'EventForm').props.onSaved({ kind: 'saved', mode: 'created', event: privateEvent() });
    await context.view.flush();
    const html = renderToStaticMarkup(context.view.tree);
    assert.match(html, /guardad|cread/i); assert.ok(!html.includes('[object Object]'));
    assert.equal(component(context.view, 'EventForm'), undefined);
    const retry = descendants(context.view.tree, node => node.type === 'button' && node.props.children === 'Volver a intentar')[0];
    assert.ok(retry); const before = reads; fail = false; retry.props.onClick(); await context.view.flush();
    assert.ok(reads > before); assert.equal(writes, 0);
  } finally { context.close(); }
});

test('removed result keeps calendar selection and offers no action for a nonexistent event', async () => {
  const context = await agendaView({ async list() { return page(); }, async upcoming() { return page(); } });
  try {
    openEditor(context.view); await context.view.flush();
    component(context.view, 'EventForm').props.onSaved({ kind: 'removed', id: privateEvent().id });
    await context.view.flush();
    assert.equal(component(context.view, 'AgendaDay').props.day, '2026-10-27');
    assert.ok(!renderToStaticMarkup(context.view.tree).includes('Ver evento'));
    assert.match(renderToStaticMarkup(context.view.tree), /eliminad/i);
  } finally { context.close(); }
});
