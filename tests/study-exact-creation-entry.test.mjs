import test from 'node:test';
import assert from 'node:assert/strict';
import {componentWithPorts} from './foxmind-3d-flows-loader.test.mjs';
import {descendants,hookView,deferred} from './agenda-ui-helpers.test.mjs';

test('volver de una carpeta activa y crear durante la recarga abre un borrador vacío',async()=>{
 const router={isReady:true,query:{id:'active'},asPath:'/carpetas-de-estudio/active',pathname:'/carpetas-de-estudio/[id]',replace(){},push(){}};
 const active={folder:{id:'active',name:'Mi carpeta activa',subject:'Fotografía',status:'ACTIVE',units:[]},sources:[],conversations:[],creations:[],practices:[],exams:[]};
 const catalog={items:[active.folder],classrooms:[],covers:[]},loading=deferred();let lists=0;
 function StudyCollectionView(){}function StudyWizard(){}function StudyWorkspace(){}
 const {StudyScreen}=componentWithPorts('apps/web/src/screens/study-screen.tsx',{
  'next/router':{useRouter:()=>router},
  '../features/identity/index.ts':{createAccountClient:()=>({session:async()=>({authenticated:true,user:{emailVerified:true,accountRole:'student',firstName:'Cuenta',lastName:'Prueba'}})})},
  '../features/study/index.ts':{StudyCollectionView,StudyWizard,StudyWorkspace,studySurface:{root:''}},
  '../features/study/api.ts':{StudyError:class extends Error{},createStudyClient:()=>({list:async()=>++lists===1?catalog:loading.promise,get:async()=>structuredClone(active)}),createStudyRevisionController:()=>({replace(){}})},
 });
 const view=hookView(StudyScreen,{});
 try{await view.flush();const workspace=descendants(view.tree,node=>node.type===StudyWorkspace)[0];assert.ok(workspace);
  router.query={};router.asPath='/carpetas-de-estudio';router.pathname='/carpetas-de-estudio';await workspace.props.onReload();await view.flush();
  descendants(view.tree,node=>node.type===StudyCollectionView)[0].props.onCreate();await view.flush();
  const wizard=descendants(view.tree,node=>node.type===StudyWizard)[0];assert.ok(wizard);assert.equal(wizard.props.folder,undefined);assert.equal(wizard.key,'new-folder');assert.equal(active.folder.name,'Mi carpeta activa');
 }finally{view.close();loading.resolve(catalog);}
});
