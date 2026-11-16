import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassroomClient} from '../apps/web/src/application/academic-client.ts';
test('plan y biblioteca aceptan Office aprobado y bloquean documentos mayores a 20 MB antes de subir', async () => {
 const calls=[];
 const api=createClassroomClient({csrfToken:async()=> 'csrf', fetch:async(path, options)=>{calls.push({path,options});return Response.json(path.endsWith('/files')?{id:'f'}:{id:'f',ready:true});}});
 for(const extension of ['pdf','doc','docx','ppt','pptx']) {
  await api.upload('draft',new File(['x'],`plan.${extension}`));
  await api.uploadClassroom('room',new File(['x'],`material.${extension}`),'material');
  const before=calls.length;
  await assert.rejects(api.uploadClassroom('room',{name:`material.${extension}`,size:20_000_001},'material'),{code:'MATERIAL_FILE_TOO_LARGE'});
  assert.equal(calls.length,before);
 }
 await assert.rejects(api.upload('draft',new File(['x'],'plan.docm')),{code:'FILE_TYPE_NOT_ALLOWED'});
});
