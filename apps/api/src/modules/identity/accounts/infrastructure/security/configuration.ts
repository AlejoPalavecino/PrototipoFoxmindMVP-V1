import { createHmac, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { IdentitySecurityError } from '../../../domain/security/errors.ts';
import { clientAddress, readClientAddressKey } from '../../../../../platform/http/client-address.ts';
import { parseVerifier } from './verifiers.ts';

import type { Budget, RateRule, RateAction, RateLimits, IdentitySecurityConfiguration as IdentityConfiguration } from '../../application/ports.ts';
export type { Budget, RateRule, RateAction, RateLimits, IdentitySecurityConfiguration as IdentityConfiguration } from '../../application/ports.ts';

const budget = (limit: number, windowSeconds: number): Budget => ({ limit, windowSeconds });
const defaults = {
  registration: { ip: budget(30, 3600), identifier: budget(1, 60) },
  login: { ip: budget(30, 900), identifier: budget(10, 900) },
  'recovery-request': { ip: budget(20, 900), identifier: budget(3, 900), cooldownSeconds: 60 },
  'verification-resend': { ip: budget(60, 3600), identifier: budget(5, 3600), cooldownSeconds: 60 },
  'token-redemption': { ip: budget(30, 900) },
  'password-change': { ip: budget(20, 900), identifier: budget(5, 900) },
  'profile-update': { ip: budget(120, 900), identifier: budget(30, 900) },
  'general-identity': { ip: budget(240, 60), session: budget(120, 60) },
} satisfies Record<string, RateRule>;

function invalid(): never { throw new IdentitySecurityError('IDENTITY_CONFIG_INVALID'); }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}
function positive(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) invalid();
  return value;
}
function readRates(raw: string | undefined): RateLimits {
  const overrides = raw === undefined ? {} : object(JSON.parse(raw));
  if (Object.keys(overrides).some(key => !Object.hasOwn(defaults, key))) invalid();
  const result = {} as Record<RateAction, RateRule>;
  for (const action of Object.keys(defaults) as RateAction[]) {
    const base: RateRule = defaults[action];
    const override = Object.hasOwn(overrides, action) ? object(overrides[action]) : {};
    if (Object.keys(override).some(key => !Object.hasOwn(base, key))) invalid();
    const rule: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(base)) {
      const replacement = Object.hasOwn(override, field) ? override[field] : value;
      if (field === 'cooldownSeconds') {
        rule[field] = positive(replacement);
        if ((rule[field] as number) < 60) invalid();
      } else {
        const supplied = object(replacement);
        if (Object.keys(supplied).some(key => key !== 'limit' && key !== 'windowSeconds')) invalid();
        const original = value as Budget;
        rule[field] = Object.freeze({
          limit: positive(Object.hasOwn(supplied, 'limit') ? supplied.limit : original.limit),
          windowSeconds: positive(Object.hasOwn(supplied, 'windowSeconds') ? supplied.windowSeconds : original.windowSeconds),
        });
      }
    }
    result[action] = Object.freeze(rule) as unknown as RateRule;
  }
  return Object.freeze(result);
}
function readKey(raw: string | undefined): Buffer {
  if (!raw || !/^[A-Za-z0-9_-]+$/.test(raw)) invalid();
  const bytes = Buffer.from(raw, 'base64url');
  if (bytes.length < 32 || bytes.toString('base64url') !== raw || bytes.every(byte => byte === bytes[0])) invalid();
  return bytes;
}
function readProxyCidrs(raw: string | undefined): readonly string[] {
  if (raw === undefined || raw === '') return Object.freeze([]);
  const cidrs = raw.split(',').map(value => value.trim());
  for (const cidr of cidrs) {
    const parts = cidr.split('/');
    const version = isIP(parts[0]);
    if (parts.length !== 2 || !version || !/^(0|[1-9][0-9]*)$/.test(parts[1])
      || Number(parts[1]) > (version === 4 ? 32 : 128)) invalid();
  }
  return Object.freeze(cidrs);
}

/** No process.env/dotenv access. Caller must provide the actual API listen host. */
export function readIdentityConfiguration(
  env: Readonly<Record<string, string | undefined>>, apiHost: string,
): IdentityConfiguration {
  try {
    const origin = env.APP_ORIGIN;
    if (!origin) invalid();
    const url = new URL(origin);
    if (url.origin !== origin || url.username || url.password || url.search || url.hash) invalid();
    if (env.AUTH_LOCAL_HTTP !== undefined && !['true', 'false'].includes(env.AUTH_LOCAL_HTTP)) invalid();
    const localHttp = env.AUTH_LOCAL_HTTP === 'true';
    if (localHttp) {
      if (env.NODE_ENV === 'production' || url.protocol !== 'http:'
        || !['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname)
        || !['127.0.0.1', '::1'].includes(apiHost)) invalid();
    } else if (url.protocol !== 'https:') invalid();
    const csrfKey = readKey(env.AUTH_CSRF_HMAC_KEY);
    const abuseKey = readKey(env.AUTH_ABUSE_HMAC_KEY);
    if (csrfKey.length === abuseKey.length && timingSafeEqual(csrfKey, abuseKey)) invalid();
    const trustedProxyCidrs = readProxyCidrs(env.AUTH_TRUSTED_PROXY_CIDRS);
    const rateLimits = readRates(env.AUTH_RATE_LIMITS_JSON);
    const clientAddressKey = readClientAddressKey(env.FOXMIND_PROXY_CLIENT_KEY);
    const csrfToken = (session: unknown): string => createHmac('sha256', csrfKey)
      .update(`foxmind.csrf.v1\0${parseVerifier(session)}`).digest('base64url');
    return Object.freeze({
      origin, secureCookies: !localHttp, trustedProxyCidrs, rateLimits,
      clientAddress: (request: Parameters<typeof clientAddress>[0]) => clientAddress(request, clientAddressKey),
      assertOrigin(submitted: unknown): void {
        if (submitted !== origin) throw new IdentitySecurityError('ORIGIN_NOT_ALLOWED');
      },
      csrfToken,
      validateCsrf(session: unknown, submitted: unknown): boolean {
        try {
          const expected = Buffer.from(csrfToken(session), 'base64url');
          const actual = Buffer.from(parseVerifier(submitted), 'base64url');
          return timingSafeEqual(expected, actual);
        } catch { return false; }
      },
      abuseDigest(action: RateAction, identifier: string): string {
        if (!Object.hasOwn(defaults, action) || typeof identifier !== 'string' || identifier.length === 0) {
          throw new IdentitySecurityError('VALIDATION_ERROR');
        }
        return createHmac('sha256', abuseKey).update(`foxmind.abuse.v1\0${action}\0${identifier}`).digest('hex');
      },
    });
  } catch { invalid(); }
}
