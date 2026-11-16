import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentWithPorts} from './foxmind-3d-flows-loader.test.mjs';
import {hookView,descendants} from './agenda-ui-helpers.test.mjs';

test('visual reader presents actual saved metadata and TXT without legacy generator controls',async()=>{
 const id=randomUUID(),calls=[];
 const {FoxyVisualReader}=componentWithPorts('apps/web/src/features/foxy/ui/foxy-visual-reader.tsx',{});
 const inspection={asset:{id,state:'READY',kind:'DIAGRAM',revision:'3'},payload:{title:'La luz',description:'Explicación guardada <script>bad</script>'},canPreview:true};
 const view=hookView(FoxyVisualReader,{assetId:id,inspection,loading:false,error:null,onClose(){},onRetry(){},assetFileUrl:asset=>`/api/v1/foxy-ai/assets/${asset}/file?mode=preview`,onDownload:text=>calls.push(text),onShare:()=>calls.push('share')});
 try{
  await view.flush();const html=renderToStaticMarkup(view.tree);
  assert.match(html,/Tu creación/);assert.match(html,/Imágenes y esquemas/);assert.match(html,/Privada hasta que decidas compartirla/);assert.match(html,/La luz/);assert.match(html,/&lt;script&gt;/);
  assert.doesNotMatch(html,/Imagen generada|Abrir en grande|Descargar imagen|Nuevo recurso visual|Contale a Foxy/);
  assert.equal(descendants(view.tree,n=>n.type==='img')[0].props.src,`/api/v1/foxy-ai/assets/${id}/file?mode=preview`);
  const button=label=>descendants(view.tree,n=>n.type==='button'&&renderToStaticMarkup(n).includes(label))[0];
  assert.deepEqual(calls,[]);button('Descargar TXT').props.onClick();assert.deepEqual(calls,['La luz\n\nExplicación guardada <script>bad</script>']);
  button('Llevar a Biblioteca').props.onClick();assert.deepEqual(calls.at(-1),'share');
 }finally{view.close();}
});

test('visual reader never exposes stale, revoked or foreign preview links',()=>{
 const id=randomUUID();const {FoxyVisualReader}=componentWithPorts('apps/web/src/features/foxy/ui/foxy-visual-reader.tsx',{});
 for(const [assetId,canPreview,url] of [[randomUUID(),true,`/api/v1/foxy-ai/assets/${id}/file?mode=preview`],[id,false,`/api/v1/foxy-ai/assets/${id}/file?mode=preview`],[id,true,'https://external.invalid/image.png']]){
  const html=renderToStaticMarkup(FoxyVisualReader({assetId:id,inspection:{asset:{id:assetId,state:'READY'},payload:{title:'No exponer',description:'Privado'},canPreview},loading:false,error:null,onClose(){},onRetry(){},onShare(){},assetFileUrl:()=>url}));
  assert.doesNotMatch(html,/<img|No exponer|Privado|Descargar TXT|Llevar a Biblioteca/);
 }
});
