import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto';

/**
 * Authenticated encryption binds each envelope to its record and purpose.
 * Format v2: `v2.<key id>.<base64(iv || tag || ciphertext)>`; the version and key id are also bound as AAD.
 * Envelopes sealed before v2 are bare base64 (base64 never contains '.') and are read with every known key.
 */
const VERSION = 'v2';

/** Public, non-secret identifier of a delivery key, so a rotated key ring can pick the sealing key. */
export function deliveryKeyId(key: Buffer): string {
  return createHash('sha256').update('foxmind.delivery-key-id.v1\0').update(key).digest().subarray(0, 8).toString('base64url');
}

function seal(key: Buffer, value: unknown, aad: string): string {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv); cipher.setAAD(Buffer.from(aad));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}
function open(key: Buffer, value: string, aad: string) {
  const bytes = Buffer.from(value, 'base64'), decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
  decipher.setAAD(Buffer.from(aad)); decipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString());
}

export function encryptDelivery(key: Buffer, value: unknown, aad: string) {
  const id = deliveryKeyId(key);
  return `${VERSION}.${id}.${seal(key, value, `${VERSION}:${id}:${aad}`)}`;
}

/** Reads with the current key or, after a rotation, with one of the previous keys that stay configured for reading only. */
export function decryptDelivery(key: Buffer, value: string, aad: string, previous: readonly Buffer[] = []) {
  const keys = [key, ...previous];
  const parts = value.split('.');
  if (parts.length === 3) {
    const [version, id, body] = parts;
    const match = version === VERSION ? keys.find(candidate => deliveryKeyId(candidate) === id) : undefined;
    if (!match) throw new Error('Unknown delivery envelope version or key');
    return open(match, body!, `${VERSION}:${id}:${aad}`);
  }
  if (parts.length !== 1) throw new Error('Malformed delivery envelope');
  let failure: unknown;
  for (const candidate of keys) {
    try { return open(candidate, value, aad); } catch (error) { failure = error; }
  }
  throw failure;
}
