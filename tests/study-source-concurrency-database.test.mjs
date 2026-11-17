import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';
import { createStudyService } from '../apps/api/src/bootstrap/study-composition.ts';

const sourceText = 'La célula mantiene su equilibrio mediante procesos regulados.';

function transactionDatabase(pool) {
  return {
    async $transaction(operation) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query("SET LOCAL lock_timeout = '750ms'");
        const result = await operation({
          $queryRawUnsafe: async (sql, ...values) => (await client.query(sql, values)).rows,
        });
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

async function setup(pool, { extension = 'pdf' } = {}) {
  const [student, teacher, classroom, enrollment, period, file, material, unit, topic] =
    Array.from({ length: 9 }, () => randomUUID());
  const request = { owner: student };
  for (const [id, role] of [[student, 'student'], [teacher, 'teacher']]) {
    await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
      VALUES($1,now(),$2,$2,'Study','Synthetic','no-login',now(),$3)`, [id, id + '@example.invalid', role]);
  }
  await pool.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
    VALUES($1,now(),$2,'Biología','Biología','A',2026,'UTC','biology',10000000)`, [classroom, teacher]);
  await pool.query('INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)', [enrollment, classroom, student]);
  await pool.query("INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method) VALUES($1,now(),$2,$3,'CODE')", [period, enrollment, classroom]);
  await pool.query("INSERT INTO units(id,updated_at,classroom_id,name,position) VALUES($1,now(),$2,'Vida',0)", [unit, classroom]);
  await pool.query("INSERT INTO topics(id,updated_at,classroom_id,unit_id,name,position) VALUES($1,now(),$2,$3,'Célula',0)", [topic, classroom, unit]);
  await pool.query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,size_bytes,validation_status,scan_status,validated_at,scanned_at)
    VALUES($1,now(),$2,$3,$4,$5,$6,18,'APPROVED','CLEAN',now(),now())`,
    [file, classroom, teacher, 'test-study/' + file, 'material.' + extension, extension]);
  await pool.query(`INSERT INTO materials(id,updated_at,classroom_id,title,file_id,created_by_id,content_kind)
    VALUES($1,now(),$2,'Material de la célula',$3,$4,'FILE')`, [material, classroom, file, teacher]);

  async function insertText(body) {
    const textFile = randomUUID(), textMaterial = randomUUID();
    await pool.query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,size_bytes,validation_status,scan_status,validated_at,scanned_at)
      VALUES($1,now(),$2,$3,$4,'texto.pdf','pdf',18,'APPROVED','CLEAN',now(),now())`,
      [textFile, classroom, teacher, 'test-study/' + textFile]);
    await pool.query(`INSERT INTO materials(id,updated_at,classroom_id,title,file_id,created_by_id,content_kind,body)
      VALUES($1,now(),$2,'Texto del aula',$3,$4,'TEXT',$5)`, [textMaterial, classroom, textFile, teacher, body]);
    return textMaterial;
  }

  let reading;
  let version = 'original';
  const previewModes = [];
  let reads = 0;
  const generationCalls = [], feedbackCalls = [];
  const sourceRefs = [{ id: material, version: material }];
  const fileResult = { text: sourceText };
  const pause = () => {
    const entered = Promise.withResolvers(), resume = Promise.withResolvers();
    reading = { entered, resume };
    return { entered: entered.promise, resume: resume.resolve };
  };
  const load = async (source) => {
    assert.equal(source.fileId, file);
    reads++;
    if (reading) {
      reading.entered.resolve();
      await reading.resume.promise;
    }
    return fileResult;
  };
  const service = createStudyService({
    database: transactionDatabase(pool),
    authenticate: async (_tx, actor) => actor.owner,
    files: {
      assertOwn: async () => assert.fail('No se esperan archivos propios'),
      readSource: (_tx, source) => load(source),
      prepareRead: async (_tx, source, docxPreview) => {
        if (docxPreview) previewModes.push(docxPreview);
        return { version, load: () => load(source) };
      },
    },
    generate: async (input, context) => {
      await context.authorize();
      generationCalls.push(input.sources.map(item => item.text));
      const output = { status: 'COMPLETE', title: 'Célula', markdown: sourceText, sourceRefs, missingInformation: [] };
      if (input.action === 'QUIZ') {
        output.practice = {
          title: 'Célula',
          questions: [{ id: 'q1', topicId: input.topics[0].id, type: 'DEVELOPMENT', prompt: 'Explicá el equilibrio celular.', options: [], correctOptionIds: [],
            expected: 'Procesos regulados', explanation: sourceText, sourceRefs }],
        };
      }
      return output;
    },
    feedback: async (input, context) => {
      await context.authorize();
      feedbackCalls.push(input.sources.map(item => item.text));
      return { orientative: true, status: 'COMPLETE', title: 'Devolución', markdown: sourceText, sourceRefs, missingInformation: [] };
    },
  });
  const draft = await service.create(request, { name: 'Privada', academicYear: 2026, bannerKey: 'biology', linkedClassroomId: classroom });
  const id = draft.folder.id;
  const detail = () => service.get(request, id);
  const command = async (action, input = {}) => service.command(request, id, {
    action, requestId: randomUUID(), revision: (await detail()).folder.revision, ...input,
  });
  await command('IMPORT_CLASSROOM_PLAN');
  await command('CONFIRM_FOLDER');
  const { result: { conversation } } = await command('NEW_CONVERSATION', { title: 'Consulta sintética' });
  const topicId = (await detail()).folder.units[0].topics[0].id;
  const propose = (requestId, sourceIds = [material]) => command('GENERATE', { requestId, conversationId: conversation.id, kind: 'NOTE',
    message: 'Explicá qué hace una célula.', topicIds: [topicId], sourceIds });
  const finalizePractice = async () => {
    const { result: { practice } } = await command('GENERATE', { kind: 'QUIZ', topicIds: [topicId], sourceIds: [material] });
    await command('SAVE_ANSWERS', { practiceId: practice.id, answers: { q1: sourceText } });
    await command('FINALIZE_PRACTICE', { practiceId: practice.id });
    return practice.id;
  };
  return {
    pause, detail, command, propose, finalizePractice, generationCalls, feedbackCalls, previewModes,
    material, insertText,
    changeReadVersion: () => { version = 'revised'; },
    preview: () => service.previewDocx(request, id, material),
    reads: () => reads,
    cancel: (targetRequestId) => service.command(request, id, { action: 'CANCEL_GENERATION', targetRequestId }),
    revoke: () => pool.query("UPDATE membership_periods SET ended_at=now(),end_reason='REMOVED',ended_by_id=$2 WHERE id=$1", [period, teacher]),
  };
}

async function whileReading(fixture, start, operation) {
  const gate = fixture.pause();
  const result = start().then(value => ({ value }), error => ({ error }));
  try {
    await Promise.race([gate.entered, result.then(outcome => {
      throw outcome.error ?? new Error('La operación terminó antes de leer la fuente');
    })]);
    return await operation();
  } finally {
    gate.resume();
    await result;
  }
}

test('Estudio mantiene acceso concurrente y revalida fuentes cuando la lectura es lenta', { timeout: 90000 }, async (t) => {
  await withAgendaDatabase(async ({ pool }) => {
    await t.test('el GET y la cancelación avanzan durante la lectura y previenen el envío', async () => {
      const fixture = await setup(pool), requestId = randomUUID();
      let generation;
      await whileReading(fixture, () => generation = fixture.propose(requestId), async () => {
        const inFlight = await fixture.detail();
        assert.equal(inFlight.conversations[0].turns[0].generation.status, 'PENDING');
        assert.equal((await fixture.cancel(requestId)).result.status, 'CANCELLED');
      });
      assert.equal((await generation).result.status, 'CANCELLED');
      assert.equal(fixture.generationCalls.length, 0);
      assert.equal((await fixture.detail()).creations.length, 0);
    });

    await t.test('la revocación confirmada interrumpe el envío aunque el archivo ya se esté leyendo', async () => {
      const fixture = await setup(pool);
      let generation;
      await whileReading(fixture, () => generation = fixture.propose(randomUUID()), async () => {
        await fixture.revoke();
        assert.deepEqual((await fixture.detail()).sources, []);
      });
      await assert.rejects(generation, { code: 'SOURCE_UNAVAILABLE' });
      assert.equal(fixture.generationCalls.length, 0);
      assert.equal((await fixture.detail()).creations.length, 0);
    });

    await t.test('un cambio en la versión de custodia invalida la lectura del mismo material', async () => {
      const fixture = await setup(pool);
      let generation;
      await whileReading(fixture, () => generation = fixture.propose(randomUUID()), async () => {
        fixture.changeReadVersion();
        assert.equal((await fixture.detail()).sources[0].id, fixture.material);
      });
      await assert.rejects(generation, { code: 'SOURCE_UNAVAILABLE' });
      assert.equal(fixture.generationCalls.length, 0);
      assert.equal(fixture.reads(), 1);
    });

    await t.test('cargar un archivo conserva el texto seleccionado y excluye una fuente nueva', async () => {
      const fixture = await setup(pool);
      const inline = 'El material del aula explica la célula.';
      const textId = await fixture.insertText(inline);
      let generation;
      await whileReading(fixture, () => generation = fixture.propose(randomUUID(), [fixture.material, textId]), async () => {
        await fixture.insertText('Este texto nuevo no se seleccionó.');
        assert.equal((await fixture.detail()).sources.length, 3);
      });
      assert.ok((await generation).result.creation);
      assert.deepEqual(fixture.generationCalls[0].toSorted(), [sourceText, inline].toSorted());
      assert.equal(fixture.reads(), 1);
    });

    await t.test('una devolución lee una sola vez mientras permite consultar la práctica', async () => {
      const fixture = await setup(pool);
      const practiceId = await fixture.finalizePractice();
      const before = fixture.reads();
      let feedback;
      await whileReading(fixture, () => feedback = fixture.command('RETRY_FEEDBACK', { practiceId }), async () => {
        assert.equal((await fixture.detail()).practices[0].status, 'FINALIZED');
      });
      assert.equal((await feedback).result.practice.feedback.status, 'COMPLETE');
      assert.deepEqual(fixture.feedbackCalls, [[sourceText]]);
      assert.equal(fixture.reads() - before, 1);
    });

    await t.test('revocar la fuente durante la lectura evita enviar una devolución', async () => {
      const fixture = await setup(pool);
      const practiceId = await fixture.finalizePractice();
      let feedback;
      await whileReading(fixture, () => feedback = fixture.command('RETRY_FEEDBACK', { practiceId }), async () => {
        await fixture.revoke();
        assert.deepEqual((await fixture.detail()).sources, []);
      });
      await assert.rejects(feedback, { code: 'SOURCE_UNAVAILABLE' });
      assert.equal(fixture.feedbackCalls.length, 0);
      assert.equal((await fixture.detail()).practices[0].feedback.status, 'PENDING');
    });

    await t.test('la vista previa DOCX permite GET y escritura y revalida la pertenencia tras una lectura', async () => {
      const fixture = await setup(pool, { extension: 'docx' });
      let preview;
      await whileReading(fixture, () => preview = fixture.preview(), async () => {
        assert.equal((await fixture.detail()).sources[0].id, fixture.material);
        await fixture.command('NEW_CONVERSATION', { title: 'Mientras se prepara la vista previa' });
        await fixture.revoke();
      });
      await assert.rejects(preview, { code: 'FORBIDDEN' });
      assert.equal(fixture.reads(), 1);
      assert.ok(fixture.previewModes.length >= 1);
    });
  });
});
