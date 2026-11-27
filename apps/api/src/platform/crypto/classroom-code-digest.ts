import { createHash, createHmac, hkdfSync } from 'node:crypto';

/** Keys that identify a classroom code digest (S7). Outside production the code key may be derived. */
export interface ClassroomCodeKeys { readonly signingKey?: Buffer; readonly codeDigestKey?: Buffer }
const derivationLabel = 'foxmind-classroom-code-digest-v1';
const unavailable = (): never => { throw Object.assign(new Error('SERVICE_UNAVAILABLE'), { code: 'SERVICE_UNAVAILABLE' }); };

export function classroomCodeDigestKey(keys: ClassroomCodeKeys): Buffer {
  if (Buffer.isBuffer(keys.codeDigestKey) && keys.codeDigestKey.length === 32) return keys.codeDigestKey;
  // Development and test environments without CLASSROOMS_CODE_DIGEST_KEY; production configuration requires it.
  if (Buffer.isBuffer(keys.signingKey) && keys.signingKey.length === 32)
    return Buffer.from(hkdfSync('sha256', keys.signingKey, Buffer.alloc(0), derivationLabel, 32));
  return unavailable();
}

/** Current HMAC digest first, then the unkeyed SHA-256 that only codes written before S7 still carry. */
export function classroomCodeDigests(keys: ClassroomCodeKeys, code: string): [current: string, legacy: string] {
  return [`h1:${createHmac('sha256', classroomCodeDigestKey(keys)).update(code).digest('hex')}`,
    createHash('sha256').update(code).digest('hex')];
}
