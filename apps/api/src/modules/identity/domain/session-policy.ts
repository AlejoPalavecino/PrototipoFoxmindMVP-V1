import { IdentitySecurityError } from './security/errors.ts';

export const IDENTITY_POLICY = Object.freeze({
  sessionIdleSeconds: 1800,
  sessionAbsoluteSeconds: 43200,
  verificationTtlSeconds: 3600,
  recoveryTtlSeconds: 900,
  resendMinimumSeconds: 60,
  bodyLimitBytes: 16384,
});
export interface SessionWindow {
  readonly idleExpiresAt: number;
  readonly absoluteExpiresAt: number;
}
const timestamp = (value: number): boolean => Number.isSafeInteger(value) && value >= 0;

/** All timestamps are server UTC epoch milliseconds. No persistence or authentication grant. */
export function newSessionWindow(now: number): SessionWindow {
  if (!timestamp(now) || !timestamp(now + 43200000)) throw new IdentitySecurityError('SESSION_INVALID');
  return Object.freeze({ idleExpiresAt: now + 1800000, absoluteExpiresAt: now + 43200000 });
}
export function sessionIsActive(state: SessionWindow, now: number): boolean {
  return timestamp(now) && timestamp(state.idleExpiresAt) && timestamp(state.absoluteExpiresAt)
    && state.idleExpiresAt <= state.absoluteExpiresAt
    && now < state.idleExpiresAt && now < state.absoluteExpiresAt;
}
/** Reads/rotation pass activity=false. Only authorized user activity may renew idle. */
export function refreshSessionWindow(state: SessionWindow, now: number, activity: boolean): SessionWindow {
  if (!sessionIsActive(state, now)) throw new IdentitySecurityError('SESSION_INVALID');
  return Object.freeze({
    idleExpiresAt: activity ? Math.min(now + 1800000, state.absoluteExpiresAt) : state.idleExpiresAt,
    absoluteExpiresAt: state.absoluteExpiresAt,
  });
}
