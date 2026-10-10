import type { Classroom } from '../model/Classroom';
import type { joinClassroomByCode } from './classroomMembership';

export type ClassroomJoinResult = ReturnType<typeof joinClassroomByCode>;
type ConfirmedJoin = Exclude<ClassroomJoinResult, { status: 'rejected' }>;
export type ClassroomJoinOperation = (code: string, enrolled: Classroom[]) => ClassroomJoinResult | PromiseLike<ClassroomJoinResult>;
type JoinOutcome = { status: 'confirmed'; result: ConfirmedJoin } | { status: 'ignored' | 'stale' } | { status: 'error'; message: string };
type JoinCallbacks = {
  onConfirmed?: (result: ConfirmedJoin) => void;
  onError?: (message: string) => void;
  onPendingChange?: (pending: boolean) => void;
};
const failureMessage = 'No se pudo confirmar la inscripción. Tu código se conserva. Revisa tus aulas antes de reintentar.';

function isConfirmedJoin(value: unknown): value is ConfirmedJoin {
  if (!value || typeof value !== 'object' || !('status' in value) || !('classroom' in value)) return false;
  if (value.status !== 'duplicate' && value.status !== 'catalogue' && value.status !== 'generic') return false;
  const classroom = value.classroom;
  return !!classroom && typeof classroom === 'object'
    && ['id', 'subject', 'course'].every(key => key in classroom
      && typeof (classroom as Record<string, unknown>)[key] === 'string'
      && !!(classroom as Record<string, string>)[key].trim());
}

// UI boundary only: the domain still joins synchronously, including generic codes.
export function createClassroomJoinState() {
  let pending = false, revision = 0;
  return {
    get pending() { return pending; },
    edit() {
      if (pending) return false;
      revision++;
      return true;
    },
    invalidate() { revision++; },
    async join(code: string, enrolled: Classroom[], operation?: ClassroomJoinOperation, callbacks: JoinCallbacks = {}): Promise<JoinOutcome> {
      if (pending) return { status: 'ignored' };
      const fail = (message: string): JoinOutcome => {
        callbacks.onError?.(message);
        return { status: 'error', message };
      };
      if (!code.trim()) return fail('Ingresa un código de invitación para unirte al aula.');
      if (typeof operation !== 'function') return fail('La inscripción no está disponible. Tu código se conserva.');
      const attemptRevision = revision;
      pending = true; // Protect repeated events before React renders disabled controls.
      try {
        callbacks.onPendingChange?.(true);
        const value = operation(code, enrolled);
        // Preserve synchronous completion; no simulated transport or timer.
        const result = value && typeof (value as PromiseLike<ClassroomJoinResult>).then === 'function' ? await value : value;
        if (attemptRevision !== revision) return { status: 'stale' };
        if (!isConfirmedJoin(result)) return fail(failureMessage);
        callbacks.onConfirmed?.(result);
        return { status: 'confirmed', result };
      } catch {
        if (attemptRevision !== revision) return { status: 'stale' };
        return fail(failureMessage);
      } finally {
        pending = false;
        if (attemptRevision === revision) callbacks.onPendingChange?.(false);
      }
    },
  };
}
