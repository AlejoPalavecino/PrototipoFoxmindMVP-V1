import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentWithPorts} from './foxmind-3d-flows-loader.test.mjs';
import {hookView,descendants} from './agenda-ui-helpers.test.mjs';

test('discarding an edited creation requires an explicit choice and restores the saved text only after confirmation',async()=>{
  const calls=[];
  const {FoxyResourceWorkspace}=componentWithPorts('apps/web/src/screens/foxy-resource-workspace.tsx',{});
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
