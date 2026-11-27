import type { IncomingMessage, ServerResponse } from 'node:http';
import type { SqlTransaction } from '../../../../src/core/contracts/sql.ts';
import { authenticateSession } from '../modules/identity/accounts/infrastructure/session-query.ts';
import { clearSessionCookie } from '../modules/identity/accounts/presentation/session-cookies.ts';
import { readSessionCookie } from '../modules/identity/accounts/presentation/transport.ts';
import {
  IdentityHttpError, publicIdentityError, type AuthenticatedContext, type IdentityRuntime, type IdentitySecurityConfiguration,
} from '../modules/identity/public.ts';

/**
 * One request admission for every HTTP host (D2): session cookie, authentication, clearing an
 * invalid cookie, client address, general budget, required session and verification, role, and
 * origin plus CSRF on writes. Hosts keep only their own error wrapping and extra budgets.
 */

type Role = 'teacher' | 'student';
export interface AdmissionOptions {
  /** The handler's own write classification; any method other than GET or HEAD also counts as a write. */
  readonly write?: boolean;
  /** `anonymous` lets the service authorize itself (study uploads); otherwise a verified session is required. */
  readonly session?: 'verified' | 'anonymous';
  readonly role?: Role;
  /** Host-specific error for a wrong role; defaults to `FORBIDDEN`. */
  readonly forbidden?: () => never;
}

const SAFE_METHODS = new Set(['GET', 'HEAD']);
export const isWrite = (request: IncomingMessage, write = false) => write || !SAFE_METHODS.has(request.method ?? 'GET');
const forbid = (): never => { throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' }); };

/** Origin and CSRF bound to the session, required on every write. */
export function assertWriteGuard(security: IdentitySecurityConfiguration, request: IncomingMessage, verifier: string, write: boolean): void {
  if (!isWrite(request, write)) return;
  try { security.assertOrigin(request.headers.origin); }
  catch (error) { throw publicIdentityError(error); }
  if (!security.validateCsrf(verifier, request.headers['x-csrf-token'])) throw new IdentityHttpError('CSRF_INVALID');
}

/**
 * Every rejected admission carries Retry-After when the budget sets one, whatever host maps the error.
 * Closing the socket of a still-arriving body stays with the hosts that receive large bodies (files,
 * classrooms): destroying it here would cut small JSON writes relayed by the web proxy mid-flight.
 */
function rejectAdmission(response: ServerResponse, error: unknown): never {
  const retryAfter = (error as { retryAfter?: number } | null)?.retryAfter;
  if (retryAfter && !response.headersSent && typeof response.setHeader === 'function') response.setHeader('Retry-After', String(retryAfter));
  throw error;
}

/** Cookie, authentication, invalid-cookie clearing and client address, without charging any budget. */
export async function identifyRequest(runtime: IdentityRuntime, request: IncomingMessage, response: ServerResponse) {
  const security = runtime.configuration.security;
  const cookie = readSessionCookie(request.headers.cookie);
  const context = cookie.verifier ? await runtime.authenticateVerifier(cookie.verifier) : null;
  if (cookie.present && !context && !response.headersSent) response.setHeader('Set-Cookie', clearSessionCookie(security));
  const ip = security.clientAddress(request);
  if (!ip) throw new IdentityHttpError('SERVICE_UNAVAILABLE');
  return { context, ip, security };
}

function checkContext(context: AuthenticatedContext | null, options: AdmissionOptions): AuthenticatedContext | null {
  // Anonymous admission only charges the budget; the service authorizes inside its transaction.
  if (options.session === 'anonymous') return context;
  if (!context) throw new IdentityHttpError('AUTH_REQUIRED');
  if (!context.user.email_verified_at) throw new IdentityHttpError('EMAIL_VERIFICATION_REQUIRED');
  if (options.role && context.user.account_role !== options.role) (options.forbidden ?? forbid)();
  return context;
}

/** Full ingress admission. Returns the authenticated context, or null only for `session: 'anonymous'`. */
export async function admitRequest(runtime: IdentityRuntime, request: IncomingMessage, response: ServerResponse,
  options: AdmissionOptions = {}): Promise<AuthenticatedContext | null> {
  try {
    const { context, ip, security } = await identifyRequest(runtime, request, response);
    await runtime.generalAdmission(ip, context);
    const admitted = checkContext(context, options);
    if (admitted && options.session !== 'anonymous') assertWriteGuard(security, request, admitted.verifier, options.write ?? false);
    return admitted;
  } catch (error) { return rejectAdmission(response, error); }
}

/** The same checks repeated inside the caller's transaction, under its locks; charges no budget. */
export async function authenticateInTransaction(security: IdentitySecurityConfiguration, tx: SqlTransaction, input: unknown,
  write: boolean, options: Omit<AdmissionOptions, 'write' | 'session'> = {}): Promise<string> {
  const request = input as IncomingMessage, cookie = readSessionCookie(request.headers.cookie);
  const context = checkContext(cookie.verifier ? await authenticateSession(tx, cookie.verifier) : null, options)!;
  assertWriteGuard(security, request, context.verifier, write);
  return context.user.id;
}
