import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from "../../../../../../../../tests/agenda-database-helpers.test.mjs";
import { transactionDatabase } from "../../../../../../../../tests/classroom-ai-database.test.mjs";
import { homeFixture } from "../../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";
const isCode=(...codes)=>e=>codes.includes(e?.code), hash='a'.repeat(64);
async function setup(pool){
  const [{createFoxyResourceService},{createFoxyUnitOfWork},{createFoxyResourceRepository},{createFoxyConversationRepository},{createFoxyTurnRepository}]=await Promise.all([
    import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../conversations/infrastructure/unit-of-work.ts"),import("../resource-repository.ts"),import("../../../conversations/infrastructure/conversation-repository.ts"),import("../../../turns/infrastructure/turn-repository.ts")]);
  const query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query),database=transactionDatabase(pool),tx={query};
  const uow=createFoxyUnitOfWork({database,authenticate:async(_tx,req)=>req.id}),resources=createFoxyResourceRepository(),conversations=createFoxyConversationRepository(),turns=createFoxyTurnRepository();
  const context={kind:'CLASSROOM',classroomId:f.rooms.teach.id}, {conversation}=await conversations.create(tx,f.teacherActor,{requestId:randomUUID(),title:'Chat',context},hash);
  const {turn}=await turns.enqueue(tx,f.teacherActor,conversation.id,{requestId:randomUUID(),revision:'0',purpose:'SUMMARY',text:'Hola',selection:{topicIds:[],sourceIds:[]}},
    {context,curriculum:{units:[],selectedTopicIds:[]},sources:[]},hash,{model:'synthetic',promptVersion:'foxy-chat-v2',schemaVersion:'foxy-answer-v1'});
  const answer={schemaVersion:'foxy-answer-v1',title:'Resumen',markdown:'Texto',references:[],warnings:[],missingInformation:[]};
  await query("UPDATE foxy_turns SET state='READY',answer=$2::jsonb,reference_map='[]'::jsonb,source_report='[]'::jsonb WHERE id=$1::uuid",turn.id,JSON.stringify(answer));
  return {query,f,conversation,turn,service:createFoxyResourceService({uow,resources}),owner:{id:f.teacherActor},other:{id:f.other},student:{id:f.pupil},answer};
}

test('owner resource service opens and edits privately with replay and CAS', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await setup(pool),first=await x.service.fromTurn(x.owner,x.conversation.id,x.turn.id);
    assert.equal(first.created,true);const id=first.resource.id;assert.deepEqual(Object.keys(first.resource).sort(),['conversationId','id','markdown','revision','sourceTurnId','title']);
    const input={requestId:randomUUID(),revision:first.resource.revision,title:'Editado',markdown:'Texto revisado'};
    const edit=await x.service.edit(x.owner,id,input),replay=await x.service.edit(x.owner,id,input);
    assert.equal(edit.edited,true);assert.equal(replay.edited,false);assert.equal(replay.resource.revision,edit.resource.revision);
    await assert.rejects(x.service.edit(x.owner,id,{...input,markdown:'Otro'}),isCode('CONFLICT'));
    await assert.rejects(x.service.edit(x.owner,id,{...input,requestId:randomUUID()}),isCode('CONFLICT'));
    assert.equal((await x.service.get(x.owner,id)).markdown,'Texto revisado');
    assert.equal((await x.service.fromTurn(x.owner,x.conversation.id,x.turn.id)).resource.markdown,'Texto revisado');
    await assert.rejects(x.service.get(x.other,id),isCode('FORBIDDEN','NOT_FOUND'));await assert.rejects(x.service.get(x.student,id),isCode('FORBIDDEN'));
    const [stored]=await x.query('SELECT answer FROM foxy_turns WHERE id=$1::uuid',x.turn.id);assert.deepEqual(stored.answer,x.answer);
    const [materials]=await x.query('SELECT count(*)::int n FROM materials WHERE classroom_id=$1::uuid',x.f.rooms.teach.id);assert.equal(materials.n,0);
    await x.query('UPDATE classrooms SET archived_at=clock_timestamp() WHERE id=$1::uuid',x.f.rooms.teach.id);
    assert.equal((await x.service.get(x.owner,id)).markdown,'Texto revisado');
    assert.equal((await x.service.edit(x.owner,id,{requestId:randomUUID(),revision:edit.resource.revision,title:'Nuevo',markdown:'Texto'})).edited,true);
  });
});

test('teacher resources use the queued profile and reach the existing private editor', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const [{ createFoxyRuntime }, { createFoxyFileOperations }, { configuredExecutionProfiles }, { GeminiFoxyTextAdapter }] = await Promise.all([
      import('../../../../../bootstrap/foxy-runtime.ts'), import('../../../../../bootstrap/foxy-file-integration.ts'),
      import('../../../../../platform/ai/execution-snapshot.ts'), import('../../../turns/infrastructure/providers/foxy-adapter.ts'),
    ]);
    const query = async (sql, ...args) => (await pool.query(sql, args)).rows;
    const f = await homeFixture(query), owner = { id: f.teacherActor };
    const configuration = { model: 'synthetic-model', maxInputTokens: 1000, maxOutputTokens: 300, deadlineMs: 10000,
      maxConcurrency: 1, maxJobAgeMs: 300000, dailyActorRequests: 10, dailyGlobalRequests: 10,
      dailyBudgetUsd: 1, inputUsdPerMillion: 1, outputUsdPerMillion: 2 };
    const active = configuredExecutionProfiles(configuration);
    const legacyProfiles = { ...active, foxy: { ...active.foxy, promptVersion: 'foxy-chat-v2' } };
    const previousProfiles = { ...active, foxy: { ...active.foxy, promptVersion: 'foxy-chat-v3' } };
    const attributedProfiles = { ...active, foxy: { ...active.foxy, promptVersion: 'foxy-chat-v4' } };
    const teachingProfiles = { ...active, foxy: { ...active.foxy, promptVersion: 'foxy-chat-v5' } };
    await query('INSERT INTO ai_execution_policy(singleton,baseline_profiles,active_profiles) VALUES(true,$1::jsonb,$1::jsonb)', JSON.stringify(legacyProfiles));
    const calls = [], note = { schemaVersion: 'foxy-text-response-v1', status: 'READY', title: 'La luz que llega',
      markdown: 'Al abrir la cortina, llega más luz al sensor.', references: [], warnings: [], missingInformation: [] };
    const client = { models: {
      countTokens: async () => ({ totalTokens: 20 }),
      generateContent: async request => {
        calls.push(request);
        return { text: JSON.stringify(note), candidates: [{ finishReason: 'STOP' }],
          usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 20 } };
      },
    } };
    const runtime = createFoxyRuntime({ database: transactionDatabase(pool), authenticate: async (_tx, request) => request.id,
      classrooms: { run: async () => {}, classroom: async () => {} }, fileOperations: createFoxyFileOperations({ store: {} }),
      storage: { remove: async () => {} }, configuration,
      provider: new GeminiFoxyTextAdapter({ client, configuration }),
      providerForExecution: pinned => new GeminiFoxyTextAdapter({ client, configuration: pinned }) });
    try {
      const createTurn = async (text, purpose = 'STUDY_MATERIAL') => {
        const { conversation } = await runtime.services.conversations.create(owner, {
          requestId: randomUUID(), context: { kind: 'GENERAL' }, title: 'Apunte',
        });
        const { turn } = await runtime.services.turns.send(owner, conversation.id, {
          requestId: randomUUID(), revision: conversation.revision, purpose, text,
          selection: { topicIds: [], sourceIds: [] },
        });
        return { conversation, turn, text };
      };
      const legacy = await createTurn('Explicá la luz en un apunte.');
      await query('UPDATE ai_execution_policy SET active_profiles=$1::jsonb WHERE singleton', JSON.stringify(previousProfiles));
      const previous = await createTurn('Prepará una nota con el ejemplo de la cortina.');
      await query('UPDATE ai_execution_policy SET active_profiles=$1::jsonb WHERE singleton', JSON.stringify(attributedProfiles));
      const attributed = await createTurn('En clase usamos la cortina como ejemplo.');
      await query('UPDATE ai_execution_policy SET active_profiles=$1::jsonb WHERE singleton', JSON.stringify(teachingProfiles));
      const historicalRubric = await createTurn('Prepará una rúbrica de comparación fotográfica.', 'RUBRIC');
      await query('UPDATE ai_execution_policy SET active_profiles=$1::jsonb WHERE singleton', JSON.stringify(active));
      const current = await createTurn('En clase usamos la cortina como ejemplo. Conservá «la luz que llega».');
      const teachingTools = [
        ['LESSON_PLAN', 'Planificá una clase para investigar cuánto cambia la luz que llega.', /formative check/],
        ['RUBRIC', 'Prepará una rúbrica de comparación fotográfica.', /heading for each criterion/],
        ['SUMMARY', 'Resumí el texto sobre apertura.', /essential relationships/],
      ];
      const toolTurns = [];
      for (const [purpose, message] of teachingTools) toolTurns.push(await createTurn(message, purpose));
      for (const [pending, version] of [[legacy, 'foxy-chat-v2'], [previous, 'foxy-chat-v3'], [attributed, 'foxy-chat-v4'],
        [historicalRubric, 'foxy-chat-v5'], ...[current, ...toolTurns].map(pending => [pending, 'foxy-chat-v6'])]) {
        const [row] = await query('SELECT metadata,execution_profile FROM foxy_turns WHERE id=$1::uuid', pending.turn.id);
        assert.equal(row.metadata.promptVersion, version);
        assert.equal(row.execution_profile.promptVersion, version);
        assert.equal(await runtime.worker.runOnce(), true);
        const turn = await runtime.services.turns.get(owner, pending.conversation.id, pending.turn.id);
        assert.equal(turn.message, pending.text);
        assert.equal(turn.state, 'READY');
        assert.equal(turn.answer.markdown, note.markdown);
      }
      assert.equal(calls.length, 8);
      assert.doesNotMatch(calls[0].config.systemInstruction, /central relationship/);
      assert.match(calls[1].config.systemInstruction, /central relationship/);
      assert.doesNotMatch(calls[1].config.systemInstruction, /shared experiences/);
      assert.match(calls[2].config.systemInstruction, /shared experiences/);
      assert.doesNotMatch(calls[2].config.systemInstruction, /essential relationships/);
      assert.match(calls[3].config.systemInstruction, /observable evidence/);
      assert.doesNotMatch(calls[3].config.systemInstruction, /heading for each criterion/);
      assert.equal(JSON.parse(calls[4].contents[0].parts[0].text).message, current.text);
      teachingTools.forEach(([, , rule], index) => assert.match(calls[index + 5].config.systemInstruction, rule));
      const { resource } = await runtime.services.resources.fromTurn(owner, current.conversation.id, current.turn.id);
      assert.equal(resource.markdown, note.markdown);
      const edit = await runtime.services.resources.edit(owner, resource.id, {
        requestId: randomUUID(), revision: resource.revision, title: 'La luz y la cortina', markdown: 'Cuando abrís la cortina llega más luz.',
      });
      assert.equal(edit.edited, true);
      assert.deepEqual((await runtime.services.resources.fromTurn(owner, current.conversation.id, current.turn.id)).resource, edit.resource);
      assert.equal((await runtime.services.turns.get(owner, current.conversation.id, current.turn.id)).answer.markdown, note.markdown);
      await assert.rejects(runtime.services.resources.get({ id: f.other }, resource.id), isCode('NOT_FOUND', 'FORBIDDEN'));
      const [publication] = await query('SELECT count(*)::int AS total FROM foxy_publications WHERE resource_id=$1::uuid', resource.id);
      assert.equal(publication.total, 0);
    } finally {
      await runtime.onModuleDestroy();
    }
  });
});
