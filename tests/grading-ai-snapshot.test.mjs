import test from 'node:test';
import assert from 'node:assert/strict';

const snapshot = async input => (await import("../apps/api/src/modules/grading/infrastructure/grading-ai/snapshot.ts")).createGradingAiSnapshot(input);
test('written practical evidence is retained separately from instructions and participates in the snapshot hash',async()=>{
 const input=data();input.activity.type='ASSIGNMENT';input.activity.questions=[];input.attempt.practicalResponse='Explicación propia\n😀';
 const result=await snapshot(input);assert.equal(result.evidence.practicalResponse,input.attempt.practicalResponse);assert.equal(result.evidence.instructions.includes(input.attempt.practicalResponse),false);
 input.attempt.practicalResponse='Revisión diferente';assert.notEqual((await snapshot(input)).hash,result.hash);
});
const data = () => ({ epoch: '3', rubricSnapshot: 'Justificar respuesta',
  activity: { id: 'ID_ACTIVIDAD_PRIVADO', type: 'EVALUATION', title: 'TITULO_PRIVADO', instructions: 'Elegí una opción y explicá',
    questions: [{ id: 'ID_Q_PRIVADO', type: 'SINGLE_CHOICE', prompt: 'Elegí', points: '2.00', manual: false,
      options: [{ id: 'ID_O1_PRIVADO', text: 'Igual', correct: true }, { id: 'ID_O2_PRIVADO', text: 'Igual', correct: false }],
      answer: { text: null, optionIds: ['ID_O2_PRIVADO'] } },
      { id: 'ID_Q2_PRIVADO', type: 'DEVELOPMENT', prompt: 'Explicá', points: '3.00', manual: true, options: [], answer: { text: 'Respuesta sintética', optionIds: [] } }] },
  attempt: { id: 'ID_INTENTO_PRIVADO', firstName: 'NOMBRE_PRIVADO', lastName: 'APELLIDO_PRIVADO',
    attachments: [{ id: 'ID_ARCHIVO_PRIVADO', name: 'NOMBRE_ARCHIVO_PRIVADO.pdf', digest: 'a'.repeat(64), text: 'Entrega sintética', ready: true }] },
  instructionFiles: [{ id: 'ID_INSTRUCCION_PRIVADO', name: 'NOMBRE_INSTRUCCION_PRIVADO.pdf', digest: 'b'.repeat(64), text: 'Consigna adjunta', ready: true }],
  grade: { id: 'ID_NOTA_PRIVADO', finalGrade: '5.00', overallFeedback: 'Devolución anterior', isPublished: false, revision: '2' } });

test('evidencia usa referencias y no envía nombres ni identificadores del dominio', async () => {
  const result = await snapshot(data()), evidence = JSON.stringify(result.evidence);
  for (const secret of ['ID_ACTIVIDAD_PRIVADO', 'TITULO_PRIVADO', 'ID_Q_PRIVADO', 'ID_O1_PRIVADO', 'ID_O2_PRIVADO',
    'ID_INTENTO_PRIVADO', 'NOMBRE_PRIVADO', 'APELLIDO_PRIVADO', 'ID_ARCHIVO_PRIVADO', 'NOMBRE_ARCHIVO_PRIVADO',
    'ID_INSTRUCCION_PRIVADO', 'NOMBRE_INSTRUCCION_PRIVADO', 'ID_NOTA_PRIVADO', 'Devolución anterior']) assert.ok(!evidence.includes(secret), secret);
  assert.ok(evidence.includes('Respuesta sintética')); assert.ok(evidence.includes('Entrega sintética')); assert.ok(evidence.includes('Consigna adjunta'));
  assert.ok(result.references); assert.match(result.hash, /^[a-f0-9]{64}$/);
});

test('opciones con mismo texto mantienen referencias y selección inequívocas', async () => {
  const { evidence, spec } = await snapshot(data()), question = evidence.questions[0];
  assert.equal(question.ref, 'Q1'); assert.equal(question.type, 'SINGLE_CHOICE');
  assert.equal(question.options.length, 2); assert.notEqual(question.options[0].ref, question.options[1].ref);
  assert.equal(question.options[0].text, question.options[1].text);
  const answer = evidence.answers.find(a => a.ref === 'Q1'); assert.deepEqual(answer.selectedOptionRefs, [question.options[1].ref]);
  assert.equal(spec.questions[0].manual, false); assert.equal(spec.questions[1].manual, true);
});

test('snapshot es determinista y hash cambia al cambiar evidencia, nota, rúbrica, epoch o custodia', async () => {
  const baseline = await snapshot(data()); assert.deepEqual(await snapshot(data()), baseline);
  for (const mutate of [
    x => { x.activity.questions[1].answer.text = 'otra respuesta'; },
    x => { x.activity.questions[0].answer.optionIds = ['ID_O1_PRIVADO']; },
    x => { x.activity.questions[0].options[0].correct = false; },
    x => { x.activity.questions[1].points = '4.00'; },
    x => { x.rubricSnapshot = 'Otro criterio'; }, x => { x.epoch = '4'; },
    x => { x.attempt.attachments[0].digest = 'c'.repeat(64); },
    x => { x.instructionFiles[0].digest = 'd'.repeat(64); },
    x => { x.grade.overallFeedback = 'Cambio docente'; }, x => { x.grade.finalGrade = '6.00'; },
  ]) { const x = data(); mutate(x); const changed = await snapshot(x); assert.notEqual(changed.hash, baseline.hash); }
});

test('consigna únicamente adjunta debe incluirse o fallar de forma explícita si no se pudo procesar', async () => {
  const x = data(); x.activity.instructions = ''; const ready = await snapshot(x);
  assert.ok(JSON.stringify(ready.evidence).includes('Consigna adjunta'));
  for (const mutate of [value => { value.instructionFiles[0].ready = false; }, value => { delete value.instructionFiles[0].text; }]) {
    const bad = data(); bad.activity.instructions = ''; mutate(bad); await assert.rejects(snapshot(bad));
  }
});

test('no genera evidencia parcial cuando un adjunto de entrega no es utilizable', async () => {
  const x = data(); x.attempt.attachments[0].ready = false; await assert.rejects(snapshot(x));
  const y = data(); delete y.attempt.attachments[0].text; await assert.rejects(snapshot(y));
});
