import type { IdentityUserRecord as User, AuthenticatedContext, SessionQuery } from '../../sessions/public.ts';
export type { SessionQuery } from '../../sessions/public.ts';
import { IDENTITY_POLICY, sessionIsActive } from './security/sessions.ts';
import { sessionTokenDigest } from './security/verifiers.ts';


/** Implemented by either a Prisma transaction or the caller-owned private-file transaction. */

type SessionRow = User & {
  session_id: string;
  session_expires_at: Date;
  session_last_seen_at: Date;
  session_revoked_at: Date | null;
};

/** Read-only and repeatable. Call again after the user lock and after external I/O. */
export async function authenticateSession(tx: SessionQuery, verifier: string): Promise<AuthenticatedContext | null> {
  const [row] = await tx.query<SessionRow>(`SELECT u.*,s.id AS session_id,s.expires_at AS session_expires_at,
    s.last_seen_at AS session_last_seen_at,s.revoked_at AS session_revoked_at
    FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1`, sessionTokenDigest(verifier));
  if (!row || row.session_revoked_at) return null;
  // Read the database clock after locating the session; a prior lock wait must never extend its lifetime.
  const [{ now }] = await tx.query<{ now: Date }>('SELECT clock_timestamp() AS now');
  const { session_id, session_expires_at, session_last_seen_at, session_revoked_at: _revoked, ...user } = row;
  if (!sessionIsActive({ absoluteExpiresAt: session_expires_at.getTime(),
    idleExpiresAt: Math.min(session_expires_at.getTime(), session_last_seen_at.getTime() + IDENTITY_POLICY.sessionIdleSeconds * 1000),
  }, now.getTime())) return null;
  return { sessionId: session_id, user, verifier, absoluteExpiresAt: session_expires_at };
}
