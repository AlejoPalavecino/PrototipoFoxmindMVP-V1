import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentWithPorts} from './foxmind-3d-flows-loader.test.mjs';
import {hookView,descendants} from './agenda-ui-helpers.test.mjs';

test('visual reader presents saved metadata and private visual downloads without TXT or legacy generator controls',async()=>{
 const id=randomUUID(),calls=[];
 const {FoxyVisualReader}=componentWithPorts('apps/web/src/features/foxy/visuals/foxy-visual-reader.tsx',{});
 const inspection={asset:{id,state:'READY',kind:'IMAGE',revision:'3'},payload:{title:'La luz',description:'Explicación guardada <script>bad</script>'},canPreview:true};
 const view=hookView(FoxyVisualReader,{assetId:id,inspection,loading:false,error:null,onClose(){},onRetry(){},assetFileUrl:(asset,mode)=>`/api/v1/foxy-ai/assets/${asset}/file?mode=${mode}`,onShare:()=>calls.push('share')});
 try{
  await view.flush();const html=renderToStaticMarkup(view.tree);
  assert.match(html,/Tu creación/);assert.match(html,/Imágenes y esquemas/);assert.match(html,/Borrador docente · Ilustración/);assert.match(html,/La luz/);assert.match(html,/&lt;script&gt;/);
  assert.doesNotMatch(html,/TXT|Abrir en grande|Nuevo recurso visual|Contale a Foxy/);
  assert.equal(descendants(view.tree,n=>n.type==='img')[0].props.src,`/api/v1/foxy-ai/assets/${id}/file?mode=preview`);
  const button=label=>descendants(view.tree,n=>n.type==='button'&&renderToStaticMarkup(n).includes(label))[0];
  assert.equal(descendants(view.tree,n=>n.type==='a')[0].props.href,`/api/v1/foxy-ai/assets/${id}/file?mode=download`);
  button('Llevar a Biblioteca').props.onClick();assert.deepEqual(calls.at(-1),'share');
 }finally{view.close();}
});

test('visual reader never exposes stale, revoked or foreign preview links',()=>{
 const id=randomUUID();const {FoxyVisualReader}=componentWithPorts('apps/web/src/features/foxy/visuals/foxy-visual-reader.tsx',{});
 for(const [assetId,canPreview,url] of [[randomUUID(),true,`/api/v1/foxy-ai/assets/${id}/file?mode=preview`],[id,false,`/api/v1/foxy-ai/assets/${id}/file?mode=preview`],[id,true,'https://external.invalid/image.png']]){
  const html=renderToStaticMarkup(FoxyVisualReader({assetId:id,inspection:{asset:{id:assetId,state:'READY'},payload:{title:'No exponer',description:'Privado'},canPreview},loading:false,error:null,onClose(){},onRetry(){},onShare(){},assetFileUrl:()=>url}));
  assert.doesNotMatch(html,/<img|No exponer|Privado|Descargar TXT|Llevar a Biblioteca/);
 }
});

test('generated concepts and arrows reveal their own explanation and reset the challenge answer', async () => {
 const {InteractiveDiagram} = componentWithPorts('apps/shared-ui/interactive-diagram.tsx',{});
 const diagram={title:'Agua',description:'Ciclo',direction:'LEFT_RIGHT',schemaVersion:'foxy-diagram-v2',
  nodes:[{id:'liquid',label:'Agua líquida',explanation:'Ocupa el recipiente.'},{id:'gas',label:'Vapor',explanation:'Se dispersa en el aire.'}],
  edges:[{from:'liquid',to:'gas',label:'se evapora',explanation:'Pasa del estado líquido al gaseoso.'}],
  challenge:{question:'¿Cómo se llama el cambio?',answer:'Evaporación.'}};
 const view=hookView(InteractiveDiagram,{diagram});
 try {
  await view.flush();
  const button=label=>descendants(view.tree,n=>n.type==='button'&&renderToStaticMarkup(n).includes(label))[0];
  const detail=()=>descendants(view.tree,n=>n.props?.['aria-live']==='polite')[0];
  assert.match(renderToStaticMarkup(detail()),/Ocupa el recipiente/);
  button('Ver respuesta').props.onClick();
  await view.flush();
  assert.equal(button('Ocultar respuesta').props['aria-expanded'],true);
  button('se evapora').props.onClick();
  await view.flush();
  assert.equal(button('se evapora').props['aria-pressed'],true);
  assert.match(renderToStaticMarkup(detail()),/estado líquido al gaseoso/);
  assert.equal(button('Ver respuesta').props['aria-expanded'],false);
 } finally { view.close(); }
});

test('teacher diagram can live in the chat workspace with projection and visible back navigation', () => {
 const id=randomUUID(), { FoxyVisualReader } = componentWithPorts('apps/web/src/features/foxy/visuals/foxy-visual-reader.tsx',{});
 const diagram={schemaVersion:'foxy-diagram-v1',title:'Privado',description:'Una idea',direction:'TOP_DOWN',nodes:[{id:'a',label:'Agua'}],edges:[]};
 const info={asset:{id,state:'READY',kind:'DIAGRAM'},payload:{title:'Mapa guardado',description:diagram.description,diagram},canPreview:true};
 const html=renderToStaticMarkup(FoxyVisualReader({assetId:id,inspection:info,loading:false,error:null,inline:true,
  onClose(){},onRetry(){},onShare(){},assetFileUrl:(asset,mode)=>`/api/v1/foxy-ai/assets/${asset}/file?mode=${mode}`}));
 assert.match(html,/Navegación del esquema/);
 assert.match(html,/Volver al chat/);
 assert.match(html,/Proyectar/);
 assert.match(html,/Llevar a Biblioteca/);
 assert.doesNotMatch(html,/<dialog/);
});
