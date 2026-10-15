import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { ACCOUNT_TOKEN_DIGEST_DOMAIN } from '../identity-protocol.ts';

export type AccountMailPurpose = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';
export type OutboxErrorCode = 'OUTBOX_CONFIG_INVALID' | 'OUTBOX_ENVELOPE_INVALID' |
  'OUTBOX_KEY_UNAVAILABLE' | 'OUTBOX_TOKEN_INVALID' | 'OUTBOX_STORAGE_UNAVAILABLE';

/** Deliberately excludes causes, rejected values and driver/crypto error text. */
export class OutboxError extends Error {
  constructor(readonly code: OutboxErrorCode) { super(code); this.name = 'OutboxError'; }
}
export interface OutboxKeyring { readonly activeKeyId: string }
interface KeyMaterial { readonly keys: ReadonlyMap<string, Buffer> }
const keyMaterial = new WeakMap<OutboxKeyring, KeyMaterial>();
const keyIdPattern = /^[A-Za-z0-9_-]{1,64}$/;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

/** No process.env access or defaults. Values are canonical standard base64. */
export function loadOutboxKeyring(env: Readonly<Record<string, string | undefined>>): OutboxKeyring {
  try {
    const activeKeyId = env.AUTH_OUTBOX_ACTIVE_KEY_ID;
    const parsed: unknown = JSON.parse(env.AUTH_OUTBOX_KEYS_JSON ?? '');
    if (!activeKeyId || !keyIdPattern.test(activeKeyId) || !isObject(parsed)) throw new Error();
    const entries = Object.entries(parsed);
    if (entries.length === 0 || entries.length > 32) throw new Error();
    const keys = new Map<string, Buffer>();
    for (const [id, value] of entries) {
      if (!keyIdPattern.test(id) || typeof value !== 'string') throw new Error();
      const decoded = Buffer.from(value, 'base64');
      if (decoded.length !== 32 || decoded.toString('base64') !== value) throw new Error();
      keys.set(id, decoded);
    }
    if (!keys.has(activeKeyId)) throw new Error();
    const ring = Object.freeze({ activeKeyId });
    keyMaterial.set(ring, { keys });
    return ring;
  } catch { throw new OutboxError('OUTBOX_CONFIG_INVALID'); }
}

export interface AccountMailBinding {
  readonly jobId: string;
  readonly tokenId: string;
  readonly userId: string;
  readonly purpose: AccountMailPurpose;
  readonly expiresAt: string;
}
export interface AccountTokenEnvelope {
  readonly v: 1;
  readonly keyId: string;
  readonly nonce: string;
  readonly ciphertext: string;
  readonly tag: string;
}
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function isUuid(value: unknown): value is string { return typeof value === 'string' && uuidPattern.test(value); }
export function validBinding(value: unknown): value is AccountMailBinding {
  return isObject(value) && isUuid(value.jobId) && isUuid(value.tokenId) && isUuid(value.userId) &&
    (value.purpose === 'EMAIL_VERIFICATION' || value.purpose === 'PASSWORD_RESET') &&
    typeof value.expiresAt === 'string' && Number.isFinite(Date.parse(value.expiresAt)) &&
    new Date(value.expiresAt).toISOString() === value.expiresAt;
}
function aad(binding: AccountMailBinding): Buffer {
  if (!validBinding(binding)) throw new OutboxError('OUTBOX_ENVELOPE_INVALID');
  // Versioned ordered array: no key-order ambiguity or delimiter collisions.
  return Buffer.from(JSON.stringify(['foxmind.account-mail.v1', binding.jobId, binding.tokenId,
    binding.userId, binding.purpose, binding.expiresAt]), 'utf8');
}
function decode(value: unknown, bytes: number): Buffer {
  if (typeof value !== 'string' || value.length > 128) throw new OutboxError('OUTBOX_ENVELOPE_INVALID');
  const decoded = Buffer.from(value, 'base64url');
  if (decoded.length !== bytes || decoded.toString('base64url') !== value) throw new OutboxError('OUTBOX_ENVELOPE_INVALID');
  return decoded;
}
export function validRawToken(rawToken: unknown): rawToken is string {
  return typeof rawToken === 'string' && /^[A-Za-z0-9_-]{43}$/.test(rawToken) &&
    Buffer.from(rawToken, 'base64url').toString('base64url') === rawToken;
}
export function accountTokenDigest(rawToken: string, purpose: AccountMailPurpose): string {
  if (!validRawToken(rawToken)) throw new OutboxError('OUTBOX_TOKEN_INVALID');
  return createHash('sha256').update(`${ACCOUNT_TOKEN_DIGEST_DOMAIN}\0${purpose}\0${rawToken}`).digest('hex');
}
function key(ring: OutboxKeyring, id: string): Buffer {
  const material = keyMaterial.get(ring);
  if (!material) throw new OutboxError('OUTBOX_CONFIG_INVALID');
  const found = material.keys.get(id);
  if (!found) throw new OutboxError('OUTBOX_KEY_UNAVAILABLE');
  return found;
}
export function sealAccountToken(ring: OutboxKeyring, binding: AccountMailBinding, rawToken: string): AccountTokenEnvelope {
  if (!keyMaterial.has(ring)) throw new OutboxError('OUTBOX_CONFIG_INVALID');
  if (!validBinding(binding)) throw new OutboxError('OUTBOX_ENVELOPE_INVALID');
  if (!validRawToken(rawToken)) throw new OutboxError('OUTBOX_TOKEN_INVALID');
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(ring, ring.activeKeyId), nonce);
  cipher.setAAD(aad(binding));
  const plaintext = Buffer.from(rawToken, 'ascii');
  try {
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return { v: 1, keyId: ring.activeKeyId, nonce: nonce.toString('base64url'),
      ciphertext: ciphertext.toString('base64url'), tag: cipher.getAuthTag().toString('base64url') };
  } finally { plaintext.fill(0); }
}
/** Intended for the worker; never call in controllers or serialize its output. */
export function openAccountToken(ring: OutboxKeyring, binding: AccountMailBinding, envelope: AccountTokenEnvelope): string {
  try {
    if (!isObject(envelope) || envelope.v !== 1 || typeof envelope.keyId !== 'string' ||
        !keyIdPattern.test(envelope.keyId) || Object.keys(envelope).sort().join(',') !== 'ciphertext,keyId,nonce,tag,v') {
      throw new OutboxError('OUTBOX_ENVELOPE_INVALID');
    }
    const nonce = decode(envelope.nonce, 12), tag = decode(envelope.tag, 16), ciphertext = decode(envelope.ciphertext, 43);
    const decipher = createDecipheriv('aes-256-gcm', key(ring, envelope.keyId), nonce);
    decipher.setAAD(aad(binding));
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    try {
      const rawToken = plaintext.toString('ascii');
      if (!validRawToken(rawToken)) throw new OutboxError('OUTBOX_ENVELOPE_INVALID');
      return rawToken;
    } finally { plaintext.fill(0); }
  } catch (error) {
    if (error instanceof OutboxError) throw error;
    throw new OutboxError('OUTBOX_ENVELOPE_INVALID');
  }
}
