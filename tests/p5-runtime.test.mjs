import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { withP5Runtime } from '../scripts/p5-runtime.mjs';
test(
  'P5 actual browser-compatible HTTP/SQL/S3/ClamAV/captured SMTP journey',
  { timeout: 240000 },
  async (t) => {
    await withP5Runtime(async (runtime) => {
      const {
        http,
        request,
        service,
        files,
        accounts,
        pool,
        origin,
        worker,
        mail,
      } = runtime;
      let draft, file, classroom, code;
      const pdf = await PDFDocument.create();
      pdf.addPage();
      const bytes = Buffer.from(await pdf.save());
      await t.test(
        'untrusted mutation cannot choose an owner or skip session/CSRF',
        async () => {
          const none = await fetch(origin + '/classrooms/drafts', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{}',
          });
          assert.equal(none.status, 403);
          const forged = await http('Docente', '/classrooms/drafts', 'POST', {
            ownerId: accounts.Estudiante.id,
          });
          assert.equal(forged.status, 400);
          const badOrigin = await fetch(origin + '/classrooms/drafts', {
            method: 'POST',
            headers: {
              ...request('Docente').headers,
              origin: 'https://wrong.example',
              'content-type': 'application/json',
            },
            body: '{}',
          });
          assert.equal(badOrigin.status, 403);
        },
      );
      await t.test(
        'required draft plan uses actual private storage/content validation and real clean scan',
        async () => {
          draft = await (
            await http('Docente', '/classrooms/drafts', 'POST', {})
          ).json();
          const started = await http('Docente', '/files', 'POST', {
            scope: { kind: 'draft', id: draft.id },
            purpose: 'plan',
            name: 'plan.pdf',
            bytes: bytes.length,
          });
          assert.equal(started.status, 201);
          file = await started.json();
          assert.equal(file.ready, false);
          assert.equal(
            (await http('Estudiante', `/files/${file.id}`)).status,
            403,
          );
          const uploaded = await fetch(origin + `/files/${file.id}/content`, {
            method: 'PUT',
            headers: {
              ...request('Docente').headers,
              'content-type': 'application/octet-stream',
            },
            body: bytes,
          });
          assert.equal(uploaded.status, 200);
          file = await uploaded.json();
          assert.equal(file.ready, true);
          assert.equal(file.scan, 'CLEAN');
          const payload = {
            name: 'Fotografía real',
            subject: 'Arte',
            division: 'Grupo A',
            academicYear: 2026,
            timezone: 'America/Argentina/Buenos_Aires',
            coverKey: 'explore',
            planFileId: file.id,
            units: [{ name: 'Luz', topics: [{ name: 'Exposición' }] }],
          };
          draft = await (
            await http('Docente', `/classrooms/drafts/${draft.id}`, 'PATCH', {
              revision: draft.revision,
              payload,
            })
          ).json();
          const published = await http(
            'Docente',
            `/classrooms/drafts/${draft.id}/publish`,
            'POST',
            { revision: draft.revision },
          );
          assert.equal(published.status, 200);
          const result = await published.json();
          classroom = result.id;
          code = result.code;
          const record = (
            await pool.query(
              'SELECT classroom_id,classroom_draft_id FROM files WHERE id=$1',
              [file.id],
            )
          ).rows[0];
          assert.equal(record.classroom_id, classroom);
          assert.equal(record.classroom_draft_id, null);
        },
      );
      await t.test(
        'publication retry cannot create duplicates; unjoined accounts cannot see file/classroom',
        async () => {
          const retry = await service.publishDraft(
            request('Docente'),
            draft.id,
            { revision: draft.revision },
          );
          assert.equal(retry.id, classroom);
          assert.equal(
            (await pool.query('SELECT count(*)::int n FROM classrooms')).rows[0]
              .n,
            1,
          );
          assert.equal(
            (await http('Estudiante', `/classrooms/${classroom}`)).status,
            403,
          );
          assert.equal(
            (await http('Estudiante', `/files/${file.id}/content`)).status,
            403,
          );
        },
      );
      await t.test(
        'confirmed code enrollment grants only current-member file/classroom access',
        async () => {
          const preview = await (
            await http('Estudiante', '/classrooms/codes/preview', 'POST', {
              code,
            })
          ).json();
          assert.equal(
            (await http('Estudiante', `/classrooms/${classroom}`)).status,
            403,
          );
          const confirmed = await http(
            'Estudiante',
            '/classrooms/codes/confirm',
            'POST',
            { confirmation: preview.confirmation },
          );
          assert.equal(confirmed.status, 200);
          const result = await http('Estudiante', `/files/${file.id}/content`);
          assert.equal(result.status, 200);
          assert.equal(
            createHash('sha256')
              .update(Buffer.from(await result.arrayBuffer()))
              .digest('hex'),
            createHash('sha256').update(bytes).digest('hex'),
          );
          assert.equal(
            (
              await http(
                'Estudiante',
                `/classrooms/${classroom}/members/${accounts.Estudiante.id}`,
              )
            ).status,
            403,
          );
        },
      );
      const academic = {
        activity: randomUUID(),
        studentActivity: randomUUID(),
        attempt: randomUUID(),
      };
      await t.test(
        'departure retains seeded academic history and teacher-only summary',
        async () => {
          const enrollment = (
            await pool.query(
              'SELECT id FROM enrollments WHERE classroom_id=$1 AND student_id=$2',
              [classroom, accounts.Estudiante.id],
            )
          ).rows[0].id;
          const curriculum = (
            await pool.query(
              'SELECT id,unit_id FROM topics WHERE classroom_id=$1',
              [classroom],
            )
          ).rows[0];
          await pool.query(
            `INSERT INTO activities(id,updated_at,classroom_id,unit_id,topic_id,type,title,instructions_text,status,published_at)
        VALUES($1,now(),$2,$3,$4,'ASSIGNMENT','Existing work','Fixture instructions','PUBLISHED',now())`,
            [academic.activity, classroom, curriculum.unit_id, curriculum.id],
          );
          await pool.query(
            `INSERT INTO student_activities(id,updated_at,classroom_id,enrollment_id,activity_id,is_expected,eligibility_reason,eligible_at)
        VALUES($1,now(),$2,$3,$4,true,'INITIAL_ENROLLMENT',now())`,
            [
              academic.studentActivity,
              classroom,
              enrollment,
              academic.activity,
            ],
          );
          await pool.query(
            `INSERT INTO attempts(id,updated_at,student_activity_id,activity_id,attempt_number,status,submitted_at,submitted_late)
        VALUES($1,now(),$2,$3,1,'SUBMITTED',now(),false)`,
            [academic.attempt, academic.studentActivity, academic.activity],
          );
          assert.equal(
            (
              await http(
                'Estudiante',
                `/classrooms/${classroom}/leave`,
                'POST',
                {},
              )
            ).status,
            200,
          );
          assert.equal(
            (await http('Estudiante', `/files/${file.id}/content`)).status,
            403,
          );
          const summary = await service.studentSummary(
            request('Docente'),
            classroom,
            accounts.Estudiante.id,
          );
          assert.equal(summary.attempts.length, 1);
          assert.equal(summary.attempts[0].grade, null);
          assert.equal(
            (
              await http('Estudiante', '/classrooms/codes/preview', 'POST', {
                code,
              })
            ).status,
            409,
          );
        },
      );
      await t.test(
        'invitation to former student is captured through actual SMTP without automatic enrollment',
        async () => {
          const invited = await (
            await http(
              'Docente',
              `/classrooms/${classroom}/invitations`,
              'POST',
              { email: accounts.Estudiante.email },
            )
          ).json();
          await worker.sweep();
          const messages = await fetch(mail.inbox + '/api/v1/messages').then(
            (r) => r.json(),
          );
          assert.equal(messages.total, 1);
          const message = await fetch(
            mail.inbox + '/api/v1/message/' + messages.messages[0].ID,
          ).then((r) => r.json());
          assert.ok(
            message.Text.includes(
              origin + '/mis-aulas?invitacion=' + invited.id,
            ),
          );
          assert.match(message.Text, /aceptá explícitamente/);
          assert.equal(
            (await service.mine(request('Estudiante'))).study.length,
            0,
          );
          assert.equal(
            (
              await http(
                'Estudiante',
                `/classrooms/invitations/${invited.id}/accept`,
                'POST',
                {},
              )
            ).status,
            200,
          );
          assert.equal(
            (await pool.query('SELECT count(*)::int n FROM enrollments'))
              .rows[0].n,
            1,
          );
          assert.equal(
            (
              await service.studentSummary(
                request('Docente'),
                classroom,
                accounts.Estudiante.id,
              )
            ).attempts.length,
            1,
          );
        },
      );
      await t.test(
        'archiving retains authorized file reads and self-departure; revoked sessions lose access',
        async () => {
          const row = await service.detail(request('Docente'), classroom);
          await service.setArchive(request('Docente'), classroom, {
            archived: true,
            revision: row.revision,
          });
          assert.equal(
            (await http('Estudiante', `/files/${file.id}/content`)).status,
            200,
          );
          assert.equal(
            (
              await http(
                'Estudiante',
                `/classrooms/${classroom}/leave`,
                'POST',
                {},
              )
            ).status,
            200,
          );
          assert.equal((await http('Estudiante', `/files/${file.id}/content`)).status, 403,
            'Voluntary departure revokes file access even when the classroom is archived');
          await pool.query('UPDATE sessions SET revoked_at=now() WHERE id=$1', [
            accounts.Estudiante.sessionId,
          ]);
          assert.equal(
            (await http('Estudiante', `/classrooms/${classroom}`)).status,
            403,
          );
          assert.equal(
            (await http('Estudiante', `/files/${file.id}/content`)).status,
            403,
          );
        },
      );
      await t.test(
        'real unsafe plan remains unpublishable and transaction rollback preserves ready file custody',
        async () => {
          let unsafe = await service.createDraft(request('Docente'));
          const bad = await files.begin(
            request('Docente'),
            { kind: 'draft', id: unsafe.id },
            { purpose: 'plan', name: 'invalid.pdf', bytes: 4 },
          );
          await assert.rejects(
            files.receive(request('Docente'), bad.id, Buffer.from('evil')),
          );
          unsafe = await service.saveDraft(request('Docente'), unsafe.id, {
            revision: unsafe.revision,
            payload: {
              name: 'Unsafe',
              subject: 'X',
              division: 'A',
              academicYear: 2026,
              timezone: 'UTC',
              coverKey: 'explore',
              planFileId: bad.id,
              units: [{ name: 'U', topics: [{ name: 'T' }] }],
            },
          });
          await assert.rejects(
            service.publishDraft(request('Docente'), unsafe.id, {
              revision: unsafe.revision,
            }),
          );
          assert.equal(
            (await pool.query('SELECT count(*)::int n FROM classrooms')).rows[0]
              .n,
            1,
          );
          assert.equal(
            (
              await pool.query(
                'SELECT classroom_draft_id FROM files WHERE id=$1',
                [bad.id],
              )
            ).rows[0].classroom_draft_id,
            unsafe.id,
          );
        },
      );
    });
  },
);
