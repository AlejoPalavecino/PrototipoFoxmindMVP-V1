import test from 'node:test';
import assert from 'node:assert/strict';
import { componentWithPorts } from './foxmind-3d-flows-loader.test.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

test('context choices stay local until explicitly applied and never offer archived classrooms', async () => {
  const { FoxyContextPicker } = componentWithPorts('apps/web/src/features/foxy/ui/foxy-context-picker.tsx', {});
  const applied = [];
  const view = hookView(FoxyContextPicker, { current:'GENERAL', classrooms:[{id:'active',name:'Ciencias'},{id:'archived',name:'Archivada',archived:true}], attachmentCount:0,
    onApply:value=>applied.push(value), onClose(){}, onLibrary(){} });
  try {
    await view.flush();
    const buttons=()=>descendants(view.tree,n=>n.type==='button');
    buttons().find(n=>n.props['data-context-mode']==='classroom').props.onClick(); await view.flush();
    assert.equal(buttons().some(n=>n.props['data-classroom-id']==='archived'),false);
    buttons().find(n=>n.props['data-classroom-id']==='active').props.onClick(); await view.flush();
    assert.deepEqual(applied,[]);
    const footer=view.tree.props.footer;
    descendants(footer,n=>n.type==='button'&&n.props['data-apply-context'])[0].props.onClick();
    assert.deepEqual(applied,['active']);
  } finally {view.close();}
});

test('library filters preserve classroom provenance and cannot remove classroom sources', async () => {
  const { FoxyLibraryPanel } = componentWithPorts('apps/web/src/features/foxy/ui/foxy-library-panel.tsx', {});
  const removed=[];
  const view=hookView(FoxyLibraryPanel,{attachments:[{id:'own',name:'Propio.pdf',sizeBytes:2,savedToFolder:false}],sources:[{sourceId:'shared',title:'Del aula',extension:'.pdf',available:true}],classroomName:'Ciencias',units:[],onContext(){},onTopic(){},onRemove:id=>removed.push(id),onUpload:async()=>{}});
  try {
    await view.flush();
    let buttons=descendants(view.tree,n=>n.type==='button');
    assert.equal(buttons.some(n=>n.props['aria-label']==='Quitar Del aula'),false);
    buttons.find(n=>n.props['data-library-filter']==='classroom').props.onClick();await view.flush();
    assert.equal(descendants(view.tree,n=>n.props['data-origin']==='private').length,0);
    assert.equal(descendants(view.tree,n=>n.props['data-origin']==='classroom').length,1);
    assert.deepEqual(removed,[]);
  }finally{view.close();}
});
