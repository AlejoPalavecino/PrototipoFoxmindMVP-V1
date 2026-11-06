import type { AttemptSessionData, ClassroomClient } from './api.ts';

/** Only an explicit response action invokes this port; read-only consultation uses GET session. */
export async function openActivitySession(api: ClassroomClient, classroomId: string, activityId: string,
  signal?: AbortSignal): Promise<AttemptSessionData> {
  const base = `/${classroomId}/activities/${activityId}`;
  const session = await api.call<AttemptSessionData>(`${base}/session`, 'GET', undefined, signal);
  if (signal?.aborted) throw signal.reason;
  if (!session.canStart) return session;
  if (!api.attempt) throw new Error('El flujo de intentos no está disponible.');
  const next=await api.attempt<AttemptSessionData>(`${base}/start`, {},undefined,signal);
  signal?.throwIfAborted();return next;
}
