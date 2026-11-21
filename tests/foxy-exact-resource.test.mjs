import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentWithPorts} from './foxmind-3d-flows-loader.test.mjs';
import {hookView,descendants} from './agenda-ui-helpers.test.mjs';
import { resourceInlineRuns, resourcePlainText } from '../src/core/domain/documents/resource-markdown.ts';
import { createResourceDocument } from '../src/core/domain/documents/text-document.ts';

test('a saved document color renders with emphasis and downloads without exposing formatting syntax', () => {
  const markdown = '## Mirá\n\nUn <span data-foxmind-ink="green">**ejemplo**</span> claro.';
  assert.deepEqual(resourceInlineRuns(markdown.split('\n').at(-1)), [
    { text: 'Un ', style: 'plain' },
    { text: 'ejemplo', style: 'bold', color: 'green' },
    { text: ' claro.', style: 'plain' },
  ]);
  assert.equal(resourcePlainText(markdown), 'Mirá\n\nUn ejemplo claro.');
  const packageXml = new TextDecoder().decode(createResourceDocument('Apunte', markdown));
  assert.match(packageXml, /<w:b\/><w:color w:val="31634E"\/>/u);
  assert.doesNotMatch(packageXml, /data-foxmind-ink/u);
});

test('the document reader suppresses an opening heading that repeats the cover title', () => {
  const {DocumentReader}=componentWithPorts('apps/shared-ui/document-reader.tsx',{});
  const title='Exposición y contraste en fotografía';
  const markdown=`\n## **${title}**\n\n### La luz en la escena\nContenido guardado.`;
  const view=hookView(DocumentReader,{title,markdown});
  return view.flush().then(()=>{
    const html=renderToStaticMarkup(view.tree);
    assert.doesNotMatch(html,/Exposición y contraste en fotografía/u);
    assert.match(html,/La luz en la escena/u);
    assert.match(html,/Contenido guardado/u);
  }).finally(()=>view.close());
});

test('Word writes a repeated opening title once and keeps a first section with a different name', () => {
  const title='Exposición y contraste en fotografía';
  const duplicate=createResourceDocument(title,`# ${title}\r\n\r\n## La luz en la escena\r\nContenido guardado.`);
  const repeated=new TextDecoder().decode(duplicate);
  assert.equal(repeated.split(title).length-1,1);
  assert.match(repeated,/La luz en la escena/u);
  const distinct=new TextDecoder().decode(createResourceDocument(title,'## Apertura del diafragma\n\nContenido guardado.'));
  assert.match(distinct,/Apertura del diafragma/u);
  assert.match(distinct,/Exposición y contraste en fotografía/u);
});

test('an explanation keeps later sections readable while the practice answer is hidden', async () => {
  const {DocumentReader}=componentWithPorts('apps/shared-ui/document-reader.tsx',{});
  const markdown='## Ponete a prueba\n¿Para qué sirve?\n\n## Respuesta\nRespuesta reservada.\n\n## Repaso\nRevisá el apunte.';
  const view=hookView(DocumentReader,{explanation:true,markdown});
  try{
    await view.flush();
    assert.doesNotMatch(renderToStaticMarkup(view.tree),/Respuesta reservada/u);
    assert.match(renderToStaticMarkup(view.tree),/Revisá el apunte/u);
    descendants(view.tree,node=>node.type==='button')[0].props.onClick();
    await view.flush();
    assert.match(renderToStaticMarkup(view.tree),/Respuesta reservada/u);
  }finally{view.close();}
});

test('discarding an edited creation requires an explicit choice and restores the saved text only after confirmation',async()=>{
  const calls=[];
  const {FoxyResourceWorkspace}=componentWithPorts('apps/web/src/application/workflows/foxy-workspace/FoxyResourceWorkspace.tsx',{});
  const saved={id:'resource',title:'Guardado',markdown:'Contenido guardado',revision:'1'};
  const props={resource:{status:'editing',resource:saved,draft:{title:'Borrador',markdown:'Contenido cambiado'},dirty:true,busy:false,pending:null,conflict:null,errorCode:null},preparation:{destination:null,metadata:{title:'',unitId:null,topicId:null},canPrepare:false,busy:false,pending:null},history:{items:[],inspection:null,loading:false},confirmation:{review:null,reviewed:false,busy:false,pending:null,canReview:false,canConfirm:false},classrooms:[],ui:{leave:null,openingResource:false},actions:{resource:{updateDraft:value=>calls.push(value),close(){}},preparation:{},history:{},confirmation:{}},publicationFileUrl:()=>''};
  const view=hookView(FoxyResourceWorkspace,props);
  const button=label=>descendants(view.tree,n=>n.type==='button'&&renderToStaticMarkup(n).includes(label))[0];
  try{
    await view.flush();
    assert.equal(descendants(view.tree,n=>n.props.className==='parity-foxy-reader')[0].props.hidden,true);
    button('Cancelar').props.onClick();await view.flush();assert.deepEqual(calls,[]);
    assert.match(renderToStaticMarkup(view.tree),/¿Descartás tus cambios\?/);
    button('Seguir editando').props.onClick();await view.flush();assert.deepEqual(calls,[]);
    button('Cancelar').props.onClick();await view.flush();button('Descartar').props.onClick();await view.flush();
    assert.deepEqual(calls,[{title:saved.title,markdown:saved.markdown}]);
  }finally{view.close();}
});
