import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';
import { homeFixture } from './foxmind-3d-repository-fixture.test.mjs';
import { purgeRetainedRows, retentionRules } from '../apps/api/src/platform/database/retention.ts';

// S8 (first slice): expired credentials, old read notifications, finished AI work and old daily counters are purged
// in bounded batches; anything still in force is kept.
test('PostgreSQL: retention purges only rows past their period, in bounded batches (S8)', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const query = async (sql, ...values) => (await pool.query(sql, values)).rows;
    const f = await homeFixture(query), user = f.pupil, room = f.rooms.teach.id;
    const old = "now() - interval '200 days'", recent = "now() - interval '5 days'";
    const ids = { keep: [], purge: [] };
    const add = async (bucket, sql, ...values) => { const id = randomUUID(); ids[bucket].push(id); await query(sql, id, ...values); };

    // Sessions and account tokens: 30 days after they stopped working.
    await add('purge', `INSERT INTO sessions(id,updated_at,created_at,user_id,token_hash,expires_at) VALUES($1::uuid,now(),now()-interval '400 days',$2,$1::uuid::text,${old})`, user);
    await add('purge', `INSERT INTO sessions(id,updated_at,user_id,token_hash,expires_at,revoked_at) VALUES($1::uuid,now(),$2,$1::uuid::text,now()+interval '1 day',${old})`, user);
    await add('keep', `INSERT INTO sessions(id,updated_at,user_id,token_hash,expires_at) VALUES($1::uuid,now(),$2,$1::uuid::text,now()+interval '1 day')`, user);
    await add('keep', `INSERT INTO sessions(id,updated_at,created_at,user_id,token_hash,expires_at) VALUES($1::uuid,now(),now()-interval '40 days',$2,$1::uuid::text,${recent})`, user);
    await add('purge', `INSERT INTO account_tokens(id,updated_at,user_id,purpose,token_hash,expires_at,consumed_at)
      VALUES($1::uuid,now(),$2,'PASSWORD_RESET',$1::uuid::text,now()+interval '1 day',${old})`, user);
    await add('keep', `INSERT INTO account_tokens(id,updated_at,user_id,purpose,token_hash,expires_at)
      VALUES($1::uuid,now(),$2,'EMAIL_VERIFICATION',$1::uuid::text,now()+interval '1 day')`, user);
    // Notifications: read ones after 180 days; unread ones stay.
    await add('purge', `INSERT INTO notifications(id,updated_at,recipient_id,classroom_id,event_type,read_at) VALUES($1::uuid,now(),$2,$3,'MEMBERSHIP_JOINED',${old})`, user, room);
    await add('keep', `INSERT INTO notifications(id,updated_at,recipient_id,classroom_id,event_type,read_at) VALUES($1::uuid,now(),$2,$3,'MEMBERSHIP_JOINED',${recent})`, user, room);
    await add('keep', `INSERT INTO notifications(id,updated_at,recipient_id,classroom_id,event_type,created_at) VALUES($1::uuid,now(),$2,$3,'MEMBERSHIP_JOINED',${old})`, user, room);
    // Finished AI work after 90 days; running work stays whatever its age.
    await add('purge', `INSERT INTO study_ai_dispatches(id,owner_id,request_id,state,lease_until,created_at) VALUES($1::uuid,$2,gen_random_uuid(),'DONE',${old},${old})`, user);
    await add('keep', `INSERT INTO study_ai_dispatches(id,owner_id,request_id,state,lease_until,created_at) VALUES($1::uuid,$2,gen_random_uuid(),'RUNNING',now()+interval '1 minute',${old})`, user);
    await add('purge', `INSERT INTO background_jobs(id,updated_at,type,payload,status,completed_at) VALUES($1::uuid,now(),'synthetic','{}','COMPLETED',${old})`);
    await add('keep', `INSERT INTO background_jobs(id,updated_at,type,payload,status) VALUES($1::uuid,now(),'synthetic','{}','PENDING')`);
    // Daily AI counters after 13 months.
    await query(`INSERT INTO ai_usage_daily(day,scope,capability) VALUES(current_date - interval '14 months','global','study-plan-v1'),
      (current_date - interval '11 months','global','study-plan-v1')`);

    const totals = {};
    for (let pass = 0; pass < 5; pass++) {
      const result = await purgeRetainedRows(query, 1);
      for (const [table, count] of Object.entries(result)) totals[table] = (totals[table] ?? 0) + count;
      assert.ok(Object.values(result).every(count => count <= 1), 'each table deletes at most one batch per pass');
    }
    assert.deepEqual(new Set(Object.keys(totals)), new Set(retentionRules.map(rule => rule.table)));
    const present = async id => (await query(`SELECT 1 FROM sessions WHERE id=$1 UNION ALL SELECT 1 FROM account_tokens WHERE id=$1
      UNION ALL SELECT 1 FROM notifications WHERE id=$1 UNION ALL SELECT 1 FROM study_ai_dispatches WHERE id=$1
      UNION ALL SELECT 1 FROM background_jobs WHERE id=$1`, id)).length > 0;
    for (const id of ids.purge) assert.equal(await present(id), false, `purged ${id}`);
    for (const id of ids.keep) assert.equal(await present(id), true, `kept ${id}`);
    const days = (await query(`SELECT count(*)::int AS n FROM ai_usage_daily`))[0].n;
    assert.equal(days, 1, 'only the counter older than 13 months is purged');
    assert.equal(totals.sessions, 2);
  });
});
