import { readIdentityConfiguration, type IdentityConfiguration } from './security/configuration.ts';
import { loadOutboxKeyring, type OutboxKeyring } from './outbox/crypto.ts';
import { readMailConfiguration, type MailConfiguration } from './mail/configuration.ts';

export interface IdentityRuntimeConfiguration {
  readonly security: IdentityConfiguration;
  readonly outbox: OutboxKeyring;
  readonly mail: MailConfiguration;
}
export function readIdentityRuntimeConfiguration(env: Readonly<Record<string, string | undefined>>): IdentityRuntimeConfiguration {
  const security = readIdentityConfiguration(env, '127.0.0.1');
  // Proxy-chain parsing is not implemented in D1. Reject opt-in rather than imply trust.
  if (security.trustedProxyCidrs.length) throw new Error('Identity configuration unavailable.');
  return Object.freeze({ security, outbox: loadOutboxKeyring(env), mail: readMailConfiguration(env) });
}
