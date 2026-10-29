import test from 'node:test';
import assert from 'node:assert/strict';
import { withGradingFixture } from './p8-grading-helpers.mjs';

// PostgreSQL is owned by withGradingFixture and is always temporary. No provider is configured.
test('IA global apagada conserva preferencia del aula y protege cambios de configuración', {timeout:120000}, async t=>{
 await withGradingFixture(async f=>{
  const {pool,service,room,T,S,F}=f;
  assert.notEqual(service.ports.gradingAiAvailable,true);
  await pool.query('UPDATE classrooms SET ai_grading_enabled=true WHERE id=$1',[room]);
  const state=async()=>(await pool.query('SELECT name,subject,division,academic_year,revision::text,ai_grading_enabled,ai_grading_epoch::text FROM classrooms WHERE id=$1',[room])).rows[0];
  const body=async extra=>{const s=await state(); return {revision:s.revision,name:s.name,subject:s.subject,division:s.division,academicYear:s.academic_year,...extra};};
  await t.test('docente guarda datos y conserva true explícito con proveedor apagado',async()=>{
   const before=await state(); const result=await service.updateSettings(T,room,await body({name:'Nombre actualizado',aiGradingEnabled:true}));
   const after=await state(); assert.equal(after.name,'Nombre actualizado'); assert.equal(after.ai_grading_enabled,true);
   assert.equal(after.ai_grading_epoch,before.ai_grading_epoch); assert.equal(result.revision,after.revision);
  });
  await t.test('payload anterior que omite interruptor conserva preferencia',async()=>{
   const before=await state(); await service.updateSettings(T,room,await body({subject:'Materia actualizada'}));
   const after=await state(); assert.equal(after.subject,'Materia actualizada'); assert.equal(after.ai_grading_enabled,true);
   assert.equal(after.ai_grading_epoch,before.ai_grading_epoch);
  });
  await t.test('alumno y docente ajeno no cambian preferencias ni datos',async()=>{
   const input=await body({aiGradingEnabled:false}),before=await state();
   for(const actor of [S,F]) await assert.rejects(service.updateSettings(actor,room,input),{code:'FORBIDDEN'});
   assert.deepEqual(await state(),before);
  });
  await t.test('CAS obsoleto no cambia datos ni preferencia',async()=>{
   const input=await body({aiGradingEnabled:false}); input.revision='0'; const before=await state();
   await assert.rejects(service.updateSettings(T,room,input),{code:'CONFLICT'}); assert.deepEqual(await state(),before);
  });
  await t.test('desactivar está permitido y avanza epoch exactamente una vez',async()=>{
   const before=await state(); await service.updateSettings(T,room,await body({aiGradingEnabled:false}));
   const after=await state(); assert.equal(after.ai_grading_enabled,false);
   assert.equal(BigInt(after.ai_grading_epoch),BigInt(before.ai_grading_epoch)+1n);
  });
  await t.test('reactivar false→true sin IA global falla y no cambia datos',async()=>{
   const before=await state(); await assert.rejects(service.updateSettings(T,room,await body({aiGradingEnabled:true,name:'No guardar'})),{code:'SERVICE_UNAVAILABLE'});
   assert.deepEqual(await state(),before);
  });
 });
});
