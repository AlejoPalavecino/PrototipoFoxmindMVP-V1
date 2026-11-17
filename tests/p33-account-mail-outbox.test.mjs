import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../.generated/prisma/client.ts';
import * as outboxPart0 from "../.build/p33-outbox/apps/api/src/modules/identity/mail-delivery/infrastructure/outbox/crypto.js";
import * as outboxPart1 from "../.build/p33-outbox/apps/api/src/modules/identity/mail-delivery/infrastructure/outbox/repository.js";
import * as outboxPart2 from "../.build/p33-outbox/apps/api/src/modules/identity/mail-delivery/infrastructure/outbox/worker.js";
const outbox = Object.freeze({loadOutboxKeyring: outboxPart0.loadOutboxKeyring,sealAccountToken: outboxPart0.sealAccountToken,openAccountToken: outboxPart0.openAccountToken,OutboxError: outboxPart0.OutboxError,enqueueAccountMail: outboxPart1.enqueueAccountMail,cancelAccountMailForToken: outboxPart1.cancelAccountMailForToken,ACCOUNT_MAIL_JOB_TYPE: outboxPart1.ACCOUNT_MAIL_JOB_TYPE,runOnce: outboxPart2.runOnce});
import { ACCOUNT_TOKEN_DIGEST_DOMAIN } from "../.build/p33-outbox/apps/api/src/modules/identity/domain/digest-domains.js";

if (!/^foxmind-p33-outbox-[a-f0-9]+$/.test(process.env.P33_OUTBOX_ISOLATED ?? '')) throw new Error('Owned fixture required');
const connectionString = process.env.P33_OUTBOX_DATABASE_URL;
const sql = new pg.Pool({ connectionString, max: 6, connectionTimeoutMillis: 1000, query_timeout: 1500 });
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 6, connectionTimeoutMillis: 1000, query_timeout: 1500 }) });
after(async () => { await db.$disconnect(); await sql.end(); });
const keys = { old: randomBytes(32).toString('base64'), next: randomBytes(32).toString('base64') };
const keyring = (values = keys, active = 'old') => outbox.loadOutboxKeyring({
  AUTH_OUTBOX_KEYS_JSON: JSON.stringify(values), AUTH_OUTBOX_ACTIVE_KEY_ID: active,
});
const digest = (raw, purpose) => createHash('sha256').update(`${ACCOUNT_TOKEN_DIGEST_DOMAIN}\0${purpose}\0${raw}`).digest('hex');
const binding = () => ({ jobId: randomUUID(), tokenId: randomUUID(), userId: randomUUID(), purpose: 'EMAIL_VERIFICATION', expiresAt: new Date(Date.now() + 60000).toISOString() });
// Assertions deliberately expose only booleans/counts/statuses, never raw material.
async function fixture(purpose = 'EMAIL_VERIFICATION', expiresIn = 60000) {
  const rawToken = randomBytes(32).toString('base64url');
  const userId = randomUUID(), tokenId = randomUUID(), jobId = randomUUID();
  const recipient = `Fixture+${randomUUID()}@foxmind.test`;
  const expiresAt = new Date(Date.now() + expiresIn);
  await sql.query(`INSERT INTO users(id, updated_at, email, email_normalized, first_name, last_name, password_hash, account_role)
    VALUES($1, now(), $2, lower($2), 'Fixture', 'Only', 'not-a-real-credential', 'student')`, [userId, recipient]);
  await sql.query(`INSERT INTO account_tokens(id, updated_at, user_id, purpose, token_hash, expires_at)
    VALUES($1, now(), $2, $3, $4, $5)`, [tokenId, userId, purpose, digest(rawToken, purpose), expiresAt]);
  return { jobId, tokenId, userId, purpose, expiresAt: expiresAt.toISOString(), rawToken, recipient };
}
const enqueue = (f, ring = keyring()) => db.$transaction(tx => outbox.enqueueAccountMail(tx, ring, f));
function sender(f, behavior = async () => ({ status: 'accepted' })) {
  const calls = [];
  return {
    calls,
    sendVerification: input => send('EMAIL_VERIFICATION', input),
    sendRecovery: input => send('PASSWORD_RESET', input),
  };
  async function send(purpose, input) {
    calls.push({ matches: input.to === f.recipient && input.token === f.rawToken && purpose === f.purpose });
    return behavior();
  }
}
async function state(id) {
  const r = await sql.query(`SELECT status, attempt_count, payload ? 'secret' AS has_secret,
    claim_token IS NULL AS unclaimed, last_error_code FROM background_jobs WHERE id=$1`, [id]);
  return r.rows[0];
}
const work = (smtp, ring = keyring(), options = {}) => outbox.runOnce(db, ring, smtp, { leaseMs: 1000, retryBaseMs: 20, ...options });

test('S4 configuration fails closed without keys, active key, canonical 32-byte material or safe key IDs', () => {
  const cases = [{}, { AUTH_OUTBOX_KEYS_JSON: '{}' },
    { AUTH_OUTBOX_KEYS_JSON: JSON.stringify({ old: randomBytes(31).toString('base64') }), AUTH_OUTBOX_ACTIVE_KEY_ID: 'old' },
    { AUTH_OUTBOX_KEYS_JSON: JSON.stringify({ old: keys.old }), AUTH_OUTBOX_ACTIVE_KEY_ID: 'absent' },
    { AUTH_OUTBOX_KEYS_JSON: JSON.stringify({ 'bad id': keys.old }), AUTH_OUTBOX_ACTIVE_KEY_ID: 'bad id' },
    { AUTH_OUTBOX_KEYS_JSON: 'not-json', AUTH_OUTBOX_ACTIVE_KEY_ID: 'old' }];
  for (const env of cases) assert.equal(throwsSanitized(() => outbox.loadOutboxKeyring(env)), true);
});
function throwsSanitized(fn) {
  try { fn(); return false; } catch (error) { return /^OUTBOX_[A-Z_]+$/.test(error.message); }
}

test('S4/S5 AES-GCM randomized round trip; all AAD fields, wrong tag and key rejected', () => {
  const b = binding(), raw = randomBytes(32).toString('base64url'), ring = keyring();
  const one = outbox.sealAccountToken(ring, b, raw), two = outbox.sealAccountToken(ring, b, raw);
  assert.equal(outbox.openAccountToken(ring, b, one) === raw, true);
  assert.equal(one.nonce !== two.nonce && one.ciphertext !== two.ciphertext, true);
  for (const field of ['jobId', 'tokenId', 'userId', 'purpose', 'expiresAt']) {
    const changed = { ...b, [field]: field.endsWith('Id') ? randomUUID() : field === 'purpose' ? 'PASSWORD_RESET' : new Date(Date.now() + 120000).toISOString() };
    assert.equal(throwsSanitized(() => outbox.openAccountToken(ring, changed, one)), true);
  }
  assert.equal(throwsSanitized(() => outbox.openAccountToken(ring, b, { ...one, tag: randomBytes(16).toString('base64url') })), true);
  assert.equal(throwsSanitized(() => outbox.openAccountToken(keyring({ old: randomBytes(32).toString('base64') }), b, one)), true);
  assert.equal(throwsSanitized(() => outbox.sealAccountToken(ring, b, 'not-a-canonical-verifier')), true);
  assert.equal(throwsSanitized(() => outbox.sealAccountToken(ring, null, raw)), true);
  assert.equal(throwsSanitized(() => outbox.sealAccountToken(null, b, raw)), true);
});

test('S4/S5 unavailable public database ports produce sanitized fail-closed errors without SMTP', async () => {
  const broken = {
    $queryRaw: async () => { throw new Error('fixture driver unavailable'); },
    $executeRaw: async () => { throw new Error('fixture driver unavailable'); },
  };
  const f = await fixture(), smtp = sender(f);
  for (const operation of [() => outbox.enqueueAccountMail(broken, keyring(), f),
    () => outbox.cancelAccountMailForToken(broken, f.tokenId), () => outbox.runOnce(broken, keyring(), smtp)]) {
    let code;
    try { await operation(); } catch (error) { code = error.message; }
    assert.equal(code, 'OUTBOX_STORAGE_UNAVAILABLE');
  }
  assert.equal(smtp.calls.length, 0);
});

test('S5 enqueue joins caller transaction, rolls back atomically and stores no plaintext/recipient', async () => {
  const f = await fixture();
  try { await db.$transaction(async tx => { await outbox.enqueueAccountMail(tx, keyring(), f); throw new Error('fixture rollback'); }); } catch {}
  assert.equal((await sql.query('SELECT count(*)::int AS n FROM background_jobs WHERE id=$1', [f.jobId])).rows[0].n, 0);
  await enqueue(f);
  const result = await sql.query(`SELECT position($2 in payload::text)=0 AND position($3 in payload::text)=0 AS safe
    FROM background_jobs WHERE id=$1`, [f.jobId, f.rawToken, f.recipient]);
  assert.equal(result.rows[0].safe, true);
  await db.$transaction(tx => outbox.cancelAccountMailForToken(tx, f.tokenId));
});

test('S4/S5/S6 digest, purpose, user and expiry mismatch refuse enqueue without job mutation', async () => {
  for (const mutate of [f => ({ ...f, rawToken: randomBytes(32).toString('base64url') }),
    f => ({ ...f, purpose: 'PASSWORD_RESET' }), f => ({ ...f, userId: randomUUID() }),
    f => ({ ...f, expiresAt: new Date(Date.now() + 30000).toISOString() })]) {
    const f = await fixture(); let refused = false;
    try { await enqueue(mutate(f)); } catch (error) { refused = /^OUTBOX_/.test(error.message); }
    assert.equal(refused, true);
    assert.equal((await sql.query('SELECT count(*)::int AS n FROM background_jobs WHERE id=$1', [f.jobId])).rows[0].n, 0);
  }
});

test('S5/S6 concurrent claims send once, SMTP runs outside transaction, owned-type filter preserves unrelated job', async () => {
  const f = await fixture(); await enqueue(f);
  const unrelated = randomUUID();
  await sql.query(`INSERT INTO background_jobs(id,updated_at,type,payload) VALUES($1,now(),'UNRELATED', '{"marker":true}')`, [unrelated]);
  let release, entered;
  const enteredPromise = new Promise(resolve => { entered = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  let smtpEntered = false;
  const smtp = sender(f, async () => { smtpEntered = true; entered(); await gate; return { status: 'accepted' }; });
  const startedAt = Date.now();
  const first = work(smtp);
  try {
    await Promise.race([enteredPromise, first.then(result => {
      throw new Error(`phase=first elapsedMs=${Date.now() - startedAt} status=${result.status} entered=${smtpEntered}`);
    })]);
    const second = await work(smtp);
    assert.equal(second.status, 'idle');
    // This would time out if SMTP held a transaction/user-row lock.
    await sql.query('UPDATE users SET updated_at=updated_at WHERE id=$1', [f.userId]);
    release();
    assert.equal((await first).status, 'accepted');
    assert.equal(smtp.calls.length === 1 && smtp.calls[0].matches, true);
    assert.equal((await state(f.jobId)).status === 'COMPLETED' && !(await state(f.jobId)).has_secret, true);
  } finally { release(); await Promise.allSettled([first]); }
  const other = await sql.query(`SELECT status='PENDING' AND attempt_count=0 AND payload='{"marker":true}'::jsonb AS intact FROM background_jobs WHERE id=$1`, [unrelated]);
  assert.equal(other.rows[0].intact, true);
  const simultaneous = await fixture(); await enqueue(simultaneous);
  const simultaneousSender = sender(simultaneous);
  const outcomes = await Promise.all([work(simultaneousSender), work(simultaneousSender)]);
  assert.equal(outcomes.filter(value => value.status === 'accepted').length, 1);
  assert.equal(outcomes.filter(value => value.status === 'idle').length, 1);
  assert.equal(simultaneousSender.calls.length === 1 && simultaneousSender.calls[0].matches, true);
});

test('S5 recovery selects the matching public sender method and retains delivery spelling', async () => {
  const f = await fixture('PASSWORD_RESET'); await enqueue(f); const smtp = sender(f);
  assert.equal((await work(smtp)).status, 'accepted');
  assert.equal(smtp.calls.length === 1 && smtp.calls[0].matches, true);
  const unchanged = await sql.query(`SELECT u.email_verified_at IS NULL AND t.consumed_at IS NULL
    AND t.invalidated_at IS NULL AS intact FROM users u JOIN account_tokens t ON t.user_id=u.id WHERE t.id=$1`, [f.tokenId]);
  assert.equal(unchanged.rows[0].intact, true);
});

test('S5 expired, consumed and invalidated tokens discard encrypted work without SMTP', async () => {
  for (const column of ['expires_at', 'consumed_at', 'invalidated_at']) {
    const f = await fixture(); await enqueue(f);
    await sql.query(`UPDATE account_tokens SET ${column}=now() WHERE id=$1`, [f.tokenId]);
    const smtp = sender(f);
    assert.equal((await work(smtp)).status, 'discarded');
    assert.equal(smtp.calls.length, 0);
    assert.equal((await state(f.jobId)).has_secret, false);
  }
});

test('S5 cancellation wipes pending/running work and stale owner cannot restore it', async () => {
  const f = await fixture(); await enqueue(f);
  let release, entered;
  const gate = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { entered = resolve; });
  let smtpEntered = false;
  const smtp = sender(f, async () => { smtpEntered = true; entered(); await gate; return { status: 'accepted' }; });
  const startedAt = Date.now();
  const pending = work(smtp);
  try {
    await Promise.race([started, pending.then(result => {
      throw new Error(`phase=cancellation elapsedMs=${Date.now() - startedAt} status=${result.status} entered=${smtpEntered}`);
    })]);
    await db.$transaction(tx => outbox.cancelAccountMailForToken(tx, f.tokenId));
    release();
    assert.equal((await pending).status, 'lease-lost');
    assert.equal((await state(f.jobId)).status === 'FAILED' && !(await state(f.jobId)).has_secret, true);
  } finally { release(); await Promise.allSettled([pending]); }
});

test('S5 key rotation keeps old pending envelopes; missing key retains valid work for recovery', async () => {
  const f = await fixture(); await enqueue(f);
  const smtp = sender(f);
  assert.equal((await work(smtp, keyring({ next: keys.next }, 'next'))).status, 'key-unavailable');
  const retained = await state(f.jobId);
  assert.equal(retained.status === 'PENDING' && retained.has_secret && retained.attempt_count === 0, true);
  assert.equal(smtp.calls.length, 0);
  await setTimeout(30);
  assert.equal((await work(smtp, keyring(keys, 'next'))).status, 'accepted');
  assert.equal(smtp.calls.length === 1 && smtp.calls[0].matches, true);
});

test('S5 SMTP transient failure retries with bounded backoff; success clears encrypted work', async () => {
  const f = await fixture(); await enqueue(f); let n = 0;
  const smtp = sender(f, async () => { if (++n === 1) throw new Error('fixture SMTP unavailable'); return { status: 'accepted' }; });
  assert.equal((await work(smtp)).status, 'retry');
  assert.equal((await state(f.jobId)).status === 'PENDING' && (await state(f.jobId)).has_secret, true);
  assert.equal((await work(smtp)).status, 'idle');
  await setTimeout(30);
  assert.equal((await work(smtp)).status, 'accepted');
  assert.equal((await state(f.jobId)).attempt_count, 2);
  assert.equal((await state(f.jobId)).has_secret, false);
});

test('S5 attempt bound and token expiry cancel failed mail without plaintext or endless retries', async () => {
  const f = await fixture(); await enqueue(f);
  const smtp = sender(f, async () => { throw new Error('fixture failure'); });
  for (let n = 0; n < 5; n++) {
    const result = await work(smtp);
    assert.equal(result.status, n === 4 ? 'discarded' : 'retry');
    if (n < 4) await setTimeout(20 * 2 ** n + 15);
  }
  assert.equal(smtp.calls.length, 5);
  assert.equal((await state(f.jobId)).has_secret, false);
  const expiring = await fixture('PASSWORD_RESET', 150); await enqueue(expiring);
  const failure = sender(expiring, async () => { throw new Error('fixture failure'); });
  assert.equal((await work(failure, keyring(), { retryBaseMs: 1000 })).status, 'discarded');
  assert.equal((await state(expiring.jobId)).has_secret, false);
});

test('S5 lease takeover fences old completion/retry; expired worker cannot clear new owner ciphertext', async () => {
  for (const oldAccepted of [false, true]) {
    const f = await fixture(); await enqueue(f);
    let releaseOld, releaseNew, enterOld, enterNew;
    const oldStarted = new Promise(resolve => { enterOld = resolve; });
    const newStarted = new Promise(resolve => { enterNew = resolve; });
    const oldGate = new Promise(resolve => { releaseOld = resolve; });
    const newGate = new Promise(resolve => { releaseNew = resolve; });
    let oldEntered = false, newEntered = false;
    const oldSmtp = sender(f, async () => {
      oldEntered = true; enterOld(); await oldGate;
      if (!oldAccepted) throw new Error('fixture old failure');
      return { status: 'accepted' };
    });
    const newSmtp = sender(f, async () => { newEntered = true; enterNew(); await newGate; return { status: 'accepted' }; });
    const startedAt = Date.now();
    const readLease = async () => (await sql.query(`SELECT status,claim_token,payload ? 'secret' AS has_secret,
      md5(payload::text) AS payload_hash,claimed_until > clock_timestamp() AS live
      FROM background_jobs WHERE id=$1::uuid AND type=$2`, [f.jobId, outbox.ACCOUNT_MAIL_JOB_TYPE])).rows[0];
    const oldRun = work(oldSmtp, keyring(), { leaseMs: 1000 });
    let newRun;
    try {
      await Promise.race([oldStarted, oldRun.then(result => {
        throw new Error(`phase=old oldAccepted=${oldAccepted} elapsedMs=${Date.now() - startedAt} status=${result.status} entered=${oldEntered}`);
      })]);
      const old = await readLease();
      assert.ok(old && old.status === 'RUNNING' && old.has_secret && old.live && old.claim_token !== null);
      const expired = await sql.query(`UPDATE background_jobs SET claimed_until=clock_timestamp()-interval '1 millisecond'
        WHERE id=$1::uuid AND type=$2 AND status='RUNNING' AND claim_token=$3::uuid AND claimed_until > clock_timestamp()
        RETURNING claimed_until <= clock_timestamp() AS expired`, [f.jobId, outbox.ACCOUNT_MAIL_JOB_TYPE, old.claim_token]);
      assert.equal(expired.rowCount, 1); assert.equal(expired.rows[0].expired, true);
      newRun = work(newSmtp, keyring(), { leaseMs: 1000 });
      await Promise.race([newStarted, newRun.then(result => {
        throw new Error(`phase=new oldAccepted=${oldAccepted} elapsedMs=${Date.now() - startedAt} status=${result.status} entered=${newEntered}`);
      })]);
      const current = await readLease();
      assert.ok(current && current.status === 'RUNNING' && current.has_secret && current.live && current.claim_token !== null);
      assert.equal(current.claim_token !== old.claim_token, true); assert.equal(current.payload_hash === old.payload_hash, true);
      releaseOld();
      assert.equal((await oldRun).status, 'lease-lost');
      const held = await readLease();
      assert.ok(held && held.status === 'RUNNING' && held.has_secret && held.claim_token === current.claim_token && held.payload_hash === current.payload_hash);
      releaseNew();
      assert.equal((await newRun).status, 'accepted');
      const completed = await state(f.jobId);
      assert.equal(completed.status === 'COMPLETED' && !completed.has_secret, true);
    } finally {
      releaseOld(); releaseNew();
      await Promise.allSettled([oldRun, ...(newRun ? [newRun] : [])]);
    }
  }
});

test('S4/S5 worker rejects tampered digest/AAD envelope and never submits mismatched secrets', async () => {
  for (const mode of ['digest', 'aad', 'tag']) {
    const f = await fixture(); await enqueue(f);
    if (mode === 'digest') await sql.query('UPDATE account_tokens SET token_hash=$2 WHERE id=$1', [f.tokenId, digest(randomBytes(32).toString('base64url'), f.purpose)]);
    if (mode === 'aad') await sql.query(`UPDATE background_jobs SET payload=jsonb_set(payload,'{userId}',to_jsonb($2::text)) WHERE id=$1`, [f.jobId, randomUUID()]);
    if (mode === 'tag') await sql.query(`UPDATE background_jobs SET payload=jsonb_set(payload,'{secret,tag}',to_jsonb($2::text)) WHERE id=$1`, [f.jobId, randomBytes(16).toString('base64url')]);
    const smtp = sender(f);
    assert.equal((await work(smtp)).status, 'discarded');
    assert.equal(smtp.calls.length, 0);
    assert.equal((await state(f.jobId)).has_secret, false);
  }
});
