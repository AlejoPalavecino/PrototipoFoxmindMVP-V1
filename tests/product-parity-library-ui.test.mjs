import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants, hookView } from './agenda-ui-helpers.test.mjs';

test('biblioteca guarda descripción y vínculos sin convertirlos en contenido del archivo', async () => {
  const { MaterialForm } = loadTsModule('apps/web/src/features/materials/ui/Library.tsx');
  let saved;
  const view = hookView(MaterialForm, { room: { id:'aula', units:[] }, api: { call: async () => ({activities:[]}) },
    initial: {title:'Luz', description:'Lectura para repasar', activityIds:['actividad'], body:null},
    kind:'FILE', busy:false, label:'Guardar', onCancel(){}, onSave: async data => { saved=data; } });
  try {
    await view.flush();
    descendants(view.tree, node => node.type === 'form')[0].props.onSubmit({preventDefault(){}});
    assert.equal(saved.description, 'Lectura para repasar');
    assert.deepEqual(saved.activityIds, ['actividad']);
    assert.equal(saved.body, undefined);
  } finally { view.close(); }
});


test('archivo legado largo precarga la descripcion y se puede conservar o borrar sin truncarla', async () => {
  const { MaterialForm } = loadTsModule('apps/web/src/features/materials/ui/Library.tsx');
  const original = 'a'.repeat(2001);
  const saved = [];
  const view = hookView(MaterialForm, { room: { id:'aula', units:[] }, api: { call: async () => ({activities:[]}) },
    initial: {title:'Luz', description:null, body:original}, kind:'FILE', editing:true, busy:false, label:'Guardar',
    onCancel(){}, onSave: async data => { saved.push(data); } });
  const description = () => descendants(view.tree, node => node.type === 'textarea')[0];
  const submit = () => descendants(view.tree, node => node.type === 'form')[0].props.onSubmit({preventDefault(){}});
  try {
    await view.flush();
    assert.equal(description().props.value, original);
    submit();
    assert.equal(Object.hasOwn(saved[0], 'description'), false);
    description().props.onChange({target:{value:original + 'b'}});
    await view.flush();
    submit();
    assert.equal(saved.length, 1);
    description().props.onChange({target:{value:''}});
    await view.flush();
    submit();
    assert.equal(saved[1].description, null);
  } finally { view.close(); }
});

test('el lector muestra una descripcion de archivo y conserva cuerpo y descripcion del texto', async () => {
  const { MaterialReader } = loadTsModule('apps/web/src/features/materials/ui/MaterialReader.tsx');
  const props = { api: {fileUrl:()=>'/file'}, room:{units:[]}, onClose(){}, onEdit(){}, onDelete(){} };
  for (const [kind, description, expected] of [['FILE','Actual',['Actual']], ['FILE',null,['Anterior']], ['TEXT','Actual',['Actual','Anterior']]]) {
    const material = {id:'file', title:'Material', contentKind:kind, description, body:'Anterior'};
    const view = hookView(MaterialReader, {...props, material});
    try {
      await view.flush();
      const paragraphs=()=>descendants(view.tree, node => node.type === 'p').map(node => node.props.children);
      assert.deepEqual(paragraphs().filter(value => value === 'Actual' || value === 'Anterior'), expected);
    } finally { view.close(); }
  }
});
