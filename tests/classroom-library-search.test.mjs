import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { componentWithPorts } from './foxmind-3d-flows-loader.test.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const materials = [
  { id: 'a', title: 'Guía de Literatura', fileName: 'guia.pdf', fileId: 'f1', sizeBytes: 20, ready: true, previewable: true, unitId: null },
  { id: 'b', title: 'Cuentos breves', fileName: 'cuentos.pdf', fileId: 'f2', sizeBytes: 30, ready: true, previewable: true, unitId: null },
];
const content = node => typeof node === 'string' || typeof node === 'number' ? String(node)
  : Array.isArray(node) ? node.map(content).join(' ') : node?.props ? content(node.props.children) : '';
const nodes = (view, predicate) => descendants(view.tree, predicate);
const articles = view => nodes(view, node => node.type === 'article' && node.props['data-material-id']);
async function library(rows = materials, targetMaterialId) {
  const calls = [];
  const { Library } = componentWithPorts('apps/classrooms-ui/Library.tsx', {
    './api.ts': { canPreviewMaterial: () => true },
    './components.tsx': { Notice: ({ children }) => React.createElement('p', {}, children), Dialog: () => null },
  });
  const api = { call: async (...args) => { calls.push(args); return structuredClone(rows); }, fileUrl: id => `/fixture/${id}` };
  const props = { api, room: { id: 'room', role: 'student', archived: false, units: [], revision: '1' }, reload: async () => {}, targetMaterialId };
  const view = hookView(Library, props);
  await view.flush();
  return { view, calls, props };
}
const search = view => nodes(view, n => n.type === 'input' && (n.props.type === 'search' || /buscar|búsqueda|busqueda/i.test(`${n.props.placeholder ?? ''} ${n.props['aria-label'] ?? ''}`)))[0];

test('abrir un material presenta una página de lectura y volver conserva la búsqueda',async()=>{
 const {view}=await library();try{search(view).props.onChange({target:{value:'Guía'}});await view.flush();nodes(view,n=>n.type==='button'&&n.props['aria-label']==='Abrir material: Guía de Literatura')[0].props.onClick();await view.flush();const reader=nodes(view,n=>n.type?.name==='MaterialReader')[0];assert.ok(reader);assert.equal(reader.props.material.id,'a');assert.equal(reader.props.writable,false);reader.props.onClose();await view.flush();assert.equal(nodes(view,n=>n.type?.name==='MaterialReader').length,0);assert.equal(search(view).props.value,'Guía');}finally{view.close();}
});

test('biblioteca busca por tipo y nombres de unidad o tema sin filtros redundantes ni solicitudes nuevas',async()=>{
 const rows=[{...materials[0],extension:'pdf',contentKind:'FILE'},{...materials[1],contentKind:'TEXT'}];
 const {view,calls}=await library(rows);try{
  search(view).props.onChange({target:{value:'PDF'}});await view.flush();assert.deepEqual(articles(view).map(n=>n.props['data-material-id']),['a']);
  search(view).props.onChange({target:{value:'texto'}});await view.flush();assert.deepEqual(articles(view).map(n=>n.props['data-material-id']),['b']);
  search(view).props.onChange({target:{value:''}});await view.flush();assert.equal(articles(view).length,2);assert.equal(calls.length,1);
 }finally{view.close();}
});

test('biblioteca filtra títulos localmente y recupera sus acciones al limpiar', async () => {
  const { view, calls } = await library();
  try {
    assert.deepEqual(articles(view).map(n => n.props['data-material-id']), ['a', 'b']);
    assert.ok(search(view), 'la búsqueda debe tener un nombre accesible');
    search(view).props.onChange({ target: { value: '  CUENTOS  ' } }); await view.flush();
    assert.deepEqual(articles(view).map(n => n.props['data-material-id']), ['b']);
    assert.ok(nodes(view, n => n.type === 'button' && n.props['aria-label'] === 'Abrir material: Cuentos breves').length, 'el lector sigue disponible');
    search(view).props.onChange({ target: { value: 'inexistente' } }); await view.flush();
    assert.equal(articles(view).length, 0);
    assert.match(content(view.tree), /sin resultados|no (?:se )?encontr|ningún material|ningun material/i);
    search(view).props.onChange({ target: { value: '' } }); await view.flush();
    assert.deepEqual(articles(view).map(n => n.props['data-material-id']), ['a', 'b']);
    assert.equal(calls.length, 1, 'filtrar no solicita ni modifica datos');
  } finally { view.close(); }
});

test('un enlace profundo posterior deja visible el material aunque la búsqueda anterior lo excluya', async () => {
  const { view, props, calls } = await library();
  try {
    search(view).props.onChange({ target: { value: 'Guía' } }); await view.flush();
    assert.deepEqual(articles(view).map(n => n.props['data-material-id']), ['a']);
    props.targetMaterialId = 'b';
    search(view).props.onChange({ target: { value: 'Guía ' } }); await view.flush();
    assert.equal(articles(view).find(n => n.props['data-material-id'] === 'b')?.props.tabIndex, -1, 'el destino debe poder recibir foco');
    assert.equal(calls.length, 1);
  } finally { view.close(); }
});

test('referencia muestra una sola búsqueda para todos los materiales',async()=>{const {view}=await library();try{assert.equal(nodes(view,n=>n.type==='select').length,0);assert.ok(search(view));}finally{view.close();}});

test('biblioteca vacía conserva su mensaje inicial y enlace profundo queda visible al entrar', async () => {
  const empty = await library([]);
  try { assert.match(content(empty.view.tree), /todavía no hay materiales/i); assert.equal(empty.calls.length, 1); }
  finally { empty.view.close(); }
  const target = await library(materials, 'b');
  try { assert.equal(articles(target.view).find(n => n.props['data-material-id'] === 'b')?.props.tabIndex, -1); }
  finally { target.view.close(); }
});
