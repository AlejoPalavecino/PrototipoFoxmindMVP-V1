import type { AttemptSessionData, ClassroomClient } from './api.ts';

/** Explicit opening shares the existing TP start policy; consultation never starts a quiz. */
export async function openActivitySession(api: ClassroomClient, classroomId: string, activityId: string,
  signal?: AbortSignal): Promise<AttemptSessionData> {
  const base = `/${classroomId}/activities/${activityId}`;
  const session = await api.call<AttemptSessionData>(`${base}/session`, 'GET', undefined, signal);
  if (signal?.aborted) throw signal.reason;
  if (session.activity.type !== 'ASSIGNMENT' || !session.canStart) return session;
  if (!api.attempt) throw new Error('El flujo de intentos no está disponible.');
  return api.attempt<AttemptSessionData>(`${base}/start`, {});
}
