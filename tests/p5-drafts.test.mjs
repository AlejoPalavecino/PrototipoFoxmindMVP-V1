import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withP5Database } from '../scripts/p5-database.mjs';
import { FileStore } from '../.build/api/apps/api/src/files/store.js';
const rejected = (p, code) => assert.rejects(p, (e) => e.code === code);
test(
  'P5 persistent drafts, scoped views and publication boundaries',
  { timeout: 120000 },
  async (t) => {
    await withP5Database(async ({ pool, database }) => {
      const { DraftService: ClassroomService } =
        await import('../.build/api/apps/api/src/classrooms/drafts.js');
      const teacher = randomUUID(),
        other = randomUUID(),
        unverified = randomUUID();
      for (const [id, verified] of [
        [teacher, true],
        [other, true],
        [unverified, false],
      ])
        await pool.query(
          `INSERT INTO users
      (id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at)
      VALUES($1,now(),$2,$2,'Test','User','fixture-only',CASE WHEN $3 THEN now() ELSE NULL END)`,
          [id, `${id}@example.test`, verified],
        );
      const authenticate = async (tx, request) => {
        if (!request?.actor) throw new Error('missing fixture identity');
        return request.actor;
      };
      const files = new FileStore(
        database,
        { authenticate, authorize: async () => {} },
        100000000n,
      );
      const options = {
        database,
        authenticate,
        files,
        classroomQuotaBytes: 100000000n,
        signingKey: Buffer.alloc(32, 9),
        deliveryKey: Buffer.alloc(32, 8),
        webOrigin: 'http://127.0.0.1:3005',
      };
      let service = new ClassroomService(options),
        draft;
      await t.test(
        'unverified account cannot save/list/read drafts',
        async () => {
          await rejected(
            service.createDraft({ actor: unverified }),
            'FORBIDDEN',
          );
          await rejected(
            service.listDrafts({ actor: unverified }),
            'FORBIDDEN',
          );
        },
      );
      await t.test(
        'draft survives new service instance and belongs only to creator',
        async () => {
          draft = await service.createDraft({ actor: teacher });
          draft = await service.saveDraft({ actor: teacher }, draft.id, {
            revision: draft.revision,
            payload: { name: 'Fotografía' },
          });
          service = new ClassroomService(options);
          assert.equal(
            (await service.getDraft({ actor: teacher }, draft.id)).payload.name,
            'Fotografía',
          );
          assert.equal((await service.listDrafts({ actor: other })).length, 0);
          await rejected(
            service.getDraft({ actor: other }, draft.id),
            'FORBIDDEN',
          );
          await rejected(
            service.saveDraft({ actor: other }, draft.id, {
              revision: draft.revision,
              payload: {},
            }),
            'FORBIDDEN',
          );
        },
      );
      await t.test(
        'stale concurrent saves cannot overwrite acknowledged revision',
        async () => {
          const outcomes = await Promise.allSettled([
            service.saveDraft({ actor: teacher }, draft.id, {
              revision: draft.revision,
              payload: { name: 'A' },
            }),
            service.saveDraft({ actor: teacher }, draft.id, {
              revision: draft.revision,
              payload: { name: 'B' },
            }),
          ]);
          assert.equal(
            outcomes.filter((r) => r.status === 'fulfilled').length,
            1,
          );
          assert.equal(
            outcomes.find((r) => r.status === 'rejected').reason.code,
            'CONFLICT',
          );
          draft = await service.getDraft({ actor: teacher }, draft.id);
        },
      );
      await t.test(
        'incomplete publication changes no classroom or draft publication marker',
        async () => {
          await rejected(
            service.publishDraft({ actor: teacher }, draft.id, {
              revision: draft.revision,
            }),
            'INVALID_INPUT',
          );
          assert.equal(
            (await pool.query('SELECT count(*)::int AS n FROM classrooms'))
              .rows[0].n,
            0,
          );
          assert.equal(
            (
              await pool.query(
                'SELECT published_classroom_id FROM classroom_drafts WHERE id=$1',
                [draft.id],
              )
            ).rows[0].published_classroom_id,
            null,
          );
        },
      );
      await t.test(
        'a client supplied safe-looking file UUID does not publish without actual P4 proof',
        async () => {
          draft = await service.saveDraft({ actor: teacher }, draft.id, {
            revision: draft.revision,
            payload: {
              name: 'A',
              subject: 'B',
              division: 'C',
              academicYear: 2026,
              timezone: 'UTC',
              coverKey: 'explore',
              planFileId: randomUUID(),
              units: [{ name: 'Unit', topics: [{ name: 'Topic' }] }],
            },
          });
          await assert.rejects(
            service.publishDraft({ actor: teacher }, draft.id, {
              revision: draft.revision,
            }),
          );
          assert.equal(
            (await pool.query('SELECT count(*)::int AS n FROM classrooms'))
              .rows[0].n,
            0,
          );
        },
      );
    });
  },
);
