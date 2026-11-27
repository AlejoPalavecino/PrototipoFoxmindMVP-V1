import { ClassroomError } from './policy.ts';

export interface ClassroomRuntimeConfiguration {
  readonly classroomQuotaBytes: bigint;
  readonly signingKey: Buffer;
  readonly deliveryKey: Buffer;
  /** Keys retired by a rotation of CLASSROOMS_DELIVERY_KEY; only used to read envelopes sealed before it. */
  readonly previousDeliveryKeys: readonly Buffer[];
  /** HMAC key of classroom codes (S7). Required in production; derived from the signing key elsewhere. */
  readonly codeDigestKey?: Buffer;
  readonly webOrigin: string;
}
function invalid(): never { throw new ClassroomError('SERVICE_UNAVAILABLE'); }
function key(raw: string | undefined): Buffer {
  if (!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw)) return invalid();
  const value = Buffer.from(raw, 'base64url');
  if (value.length !== 32 || value.toString('base64url') !== raw || value.every(byte => byte === value[0])) return invalid();
  return value;
}

const maximumPreviousKeys = 3;
/** Optional comma-separated list of retired delivery keys: valid, distinct and different from the active keys. */
function previousKeys(raw: string | undefined, active: Buffer[]): readonly Buffer[] {
  if (raw === undefined) return Object.freeze([]);
  const keys = raw.split(',').map(key);
  if (keys.length > maximumPreviousKeys) return invalid();
  const seen = [...active];
  for (const value of keys) {
    if (seen.some(other => other.equals(value))) return invalid();
    seen.push(value);
  }
  return Object.freeze(keys);
}

/** Disabled by absence. No implicit production quota, generated restart keys or independent origin. */
export function readClassroomsConfiguration(env: Readonly<Record<string, string | undefined>>,
  webOrigin: string): ClassroomRuntimeConfiguration | undefined {
  if (env.CLASSROOMS_ENABLED === undefined) return undefined;
  if (env.CLASSROOMS_ENABLED !== '1') return invalid();
  const quota = env.CLASSROOMS_QUOTA_BYTES;
  if (!quota || !/^[1-9][0-9]{0,18}$/.test(quota) || BigInt(quota) > 9223372036854775807n) return invalid();
  try {
    const origin = new URL(webOrigin);
    if (origin.origin !== webOrigin || origin.username || origin.password ||
      !(origin.protocol === 'https:' || (origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname)))) return invalid();
  } catch { return invalid(); }
  const signingKey = key(env.CLASSROOMS_SIGNING_KEY), deliveryKey = key(env.CLASSROOMS_DELIVERY_KEY);
  if (signingKey.equals(deliveryKey)) return invalid();
  const rawDigestKey = env.CLASSROOMS_CODE_DIGEST_KEY;
  if (rawDigestKey === undefined && env.NODE_ENV === 'production') return invalid();
  const codeDigestKey = rawDigestKey === undefined ? undefined : key(rawDigestKey);
  if (codeDigestKey && (codeDigestKey.equals(signingKey) || codeDigestKey.equals(deliveryKey))) return invalid();
  const previousDeliveryKeys = previousKeys(env.CLASSROOMS_DELIVERY_PREVIOUS_KEYS,
    [signingKey, deliveryKey, ...(codeDigestKey ? [codeDigestKey] : [])]);
  return Object.freeze({ classroomQuotaBytes: BigInt(quota), signingKey, deliveryKey, previousDeliveryKeys,
    ...(codeDigestKey ? { codeDigestKey } : {}), webOrigin });
}
