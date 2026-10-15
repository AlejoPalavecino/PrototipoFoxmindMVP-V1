import { Algorithm, Version, hash, parseOptions, verify } from '@node-rs/argon2';
import { randomBytes } from 'node:crypto';
import { IdentitySecurityError } from './errors.ts';
import { validatePassword } from './inputs.ts';

const options = Object.freeze({
  algorithm: Algorithm.Argon2id, version: Version.V0x13,
  memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32,
});
export interface PasswordService {
  hash(raw: unknown): Promise<string>;
  verify(raw: unknown, encoded: string): Promise<boolean>;
  dummyCheck(raw: unknown): Promise<false>;
}

/** Create once during startup; reuse the same instance for all credential paths. */
export async function createPasswordService(capacity = 2): Promise<PasswordService> {
  if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 8) {
    throw new IdentitySecurityError('IDENTITY_CONFIG_INVALID');
  }
  let active = 0;
  async function run<T>(operation: () => Promise<T>): Promise<T> {
    if (active >= capacity) throw new IdentitySecurityError('PASSWORD_CAPACITY_EXCEEDED');
    active++;
    try { return await operation(); }
    catch { throw new IdentitySecurityError('PASSWORD_OPERATION_FAILED'); }
    finally { active--; }
  }
  // Native library generates a fresh random salt for every hash (no supplied salt).
  const dummyHash = await run(() => hash(randomBytes(32), options));
  function checkEncoding(encoded: string): void {
    if (typeof encoded !== 'string' || encoded.length > 512) throw new Error();
    const parsed = parseOptions(encoded);
    // Refuse corrupt/unbounded PHC parameters before native work. No legacy hashes exist.
    if (parsed.algorithm !== options.algorithm || parsed.version !== options.version
      || parsed.memoryCost !== options.memoryCost || parsed.timeCost !== options.timeCost
      || parsed.parallelism !== options.parallelism || parsed.outputLen !== options.outputLen
      || parsed.saltLen !== 16) throw new Error();
  }
  return Object.freeze({
    async hash(raw: unknown): Promise<string> {
      const password = validatePassword(raw);
      return run(() => hash(password, options));
    },
    async verify(raw: unknown, encoded: string): Promise<boolean> {
      const password = validatePassword(raw);
      return run(() => { checkEncoding(encoded); return verify(encoded, password, options); });
    },
    async dummyCheck(raw: unknown): Promise<false> {
      const password = validatePassword(raw);
      await run(() => verify(dummyHash, password, options));
      return false;
    },
  });
}
