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

test('filtros de biblioteca combinan origen y búsqueda sin solicitudes nuevas', async () => {
  const rows = [
    { ...materials[0], unitId: 'u1', topicId: 't1' },
    { ...materials[1], unitId: null, topicId: null },
    { ...materials[0], id: 'c', title: 'Cuentos del plan', unitId: 'u1', topicId: null },
  ];
  const { view, calls } = await library(rows);
  const filter = label => nodes(view, n => n.type === 'button' && content(n).trim() === label)[0];
  try {
    assert.ok(filter('Todos'), 'debe existir filtro Todos');
    assert.ok(filter('Materiales del plan'), 'debe existir filtro de materiales del plan');
    assert.ok(filter('Archivos del aula'), 'debe existir filtro de archivos del aula');
    filter('Materiales del plan').props.onClick(); await view.flush();
    assert.deepEqual(articles(view).map(n => n.props['data-material-id']), ['a', 'c']);
    search(view).props.onChange({ target: { value: 'cuentos' } }); await view.flush();
    assert.deepEqual(articles(view).map(n => n.props['data-material-id']), ['c']);
    filter('Archivos del aula').props.onClick(); await view.flush();
    assert.deepEqual(articles(view).map(n => n.props['data-material-id']), ['b']);
    filter('Todos').props.onClick(); await view.flush();
    assert.deepEqual(articles(view).map(n => n.props['data-material-id']), ['b', 'c']);
    search(view).props.onChange({ target: { value: '' } }); await view.flush();
    assert.deepEqual(articles(view).map(n => n.props['data-material-id']), ['a', 'b', 'c']);
    assert.equal(calls.length, 1, 'los filtros no generan nuevas solicitudes');
  } finally { view.close(); }
});

test('biblioteca filtra títulos localmente y recupera sus acciones al limpiar', async () => {
  const { view, calls } = await library();
  try {
    assert.deepEqual(articles(view).map(n => n.props['data-material-id']), ['a', 'b']);
    assert.ok(search(view), 'la búsqueda debe tener un nombre accesible');
    search(view).props.onChange({ target: { value: '  CUENTOS  ' } }); await view.flush();
    assert.deepEqual(articles(view).map(n => n.props['data-material-id']), ['b']);
    assert.ok(nodes(view, n => n.type === 'a' && n.props.href === '/fixture/f2').length, 'la descarga sigue disponible');
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

test('enlace profundo posterior recupera un material oculto por filtro de origen', async () => {
  const rows = [{ ...materials[0], unitId: 'u1' }, { ...materials[1], unitId: null }];
  const { view, props, calls } = await library(rows);
  try {
    const filter = nodes(view, n => n.type === 'button' && content(n).trim() === 'Materiales del plan')[0];
    assert.ok(filter, 'el filtro de plan debe existir');
    filter.props.onClick(); await view.flush();
    assert.deepEqual(articles(view).map(n => n.props['data-material-id']), ['a']);
    props.targetMaterialId = 'b';
    search(view).props.onChange({ target: { value: ' ' } }); await view.flush();
    assert.equal(articles(view).find(n => n.props['data-material-id'] === 'b')?.props.tabIndex, -1);
    assert.equal(calls.length, 1);
  } finally { view.close(); }
});

test('biblioteca vacía conserva su mensaje inicial y enlace profundo queda visible al entrar', async () => {
  const empty = await library([]);
  try { assert.match(content(empty.view.tree), /todavía no hay materiales/i); assert.equal(empty.calls.length, 1); }
  finally { empty.view.close(); }
  const target = await library(materials, 'b');
  try { assert.equal(articles(target.view).find(n => n.props['data-material-id'] === 'b')?.props.tabIndex, -1); }
  finally { target.view.close(); }
});
