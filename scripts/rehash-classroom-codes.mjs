// Recalculates the digest of live classroom codes from unkeyed SHA-256 to HMAC (S7 of the 2026-11-26 audit).
// Reads MIGRATION_DATABASE_URL (or DATABASE_URL) and the CLASSROOMS_* keys from the environment of whoever runs it.
// Without --apply it only reports what would change and rolls back. Requires `npm run api:build` first.
import pg from 'pg';
import { rehashClassroomCodes } from '../.build/api/apps/api/src/modules/classrooms/memberships/infrastructure/code-digest-migration.js';
import { decryptDelivery } from '../.build/api/apps/api/src/modules/classrooms/invitations/infrastructure/delivery-envelope.js';

function key(name, required) {
  const raw = process.env[name];
  if (raw === undefined && !required) return undefined;
  const value = Buffer.from(raw ?? '', 'base64url');
  if (!/^[A-Za-z0-9_-]{43}$/u.test(raw ?? '') || value.length !== 32) throw new Error(`${name} must be a 32-byte base64url key`);
  return value;
}

const apply = process.argv.includes('--apply');
const url = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!url) throw new Error('Set MIGRATION_DATABASE_URL or DATABASE_URL');
const keys = { signingKey: key('CLASSROOMS_SIGNING_KEY', true), deliveryKey: key('CLASSROOMS_DELIVERY_KEY', true),
  codeDigestKey: key('CLASSROOMS_CODE_DIGEST_KEY', process.env.NODE_ENV === 'production') };
const client = new pg.Client({ connectionString: url, application_name: 'foxmind-rehash-classroom-codes' });
await client.connect();
try {
  await client.query('BEGIN');
  const result = await rehashClassroomCodes({ query: async (sql, ...values) => (await client.query(sql, values)).rows }, keys, decryptDelivery);
  await client.query(apply ? 'COMMIT' : 'ROLLBACK');
  console.log(JSON.stringify({ ...result, applied: apply }));
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  throw error;
} finally { await client.end(); }
