import type { AcademicDeadline, AgendaPage, AgendaRange, AgendaTarget, EventPayload, PrivateEvent } from '../../src/core/domain/index.ts';

export interface AgendaClient {
  list(range: AgendaRange, cursor?: string | null, signal?: AbortSignal): Promise<AgendaPage>;
  upcoming(limit?: number, signal?: AbortSignal): Promise<{ serverTime: string; items: AcademicDeadline[] }>;
  get(id: string): Promise<PrivateEvent>;
  put(id: string, event: EventPayload): Promise<PrivateEvent>;
  replace(id: string, revision: string, event: EventPayload): Promise<PrivateEvent>;
  remove(id: string, revision: string): Promise<void>;
  open(target: AgendaTarget, signal?: AbortSignal): Promise<AgendaTarget>;
}

const messages: Record<string, string> = {
  INVALID_INPUT: 'Revisá las fechas, la zona y los campos del evento. Las horas deben existir y no ser ambiguas.',
  CONFLICT: 'Este evento cambió en otra pestaña. Recargá la versión guardada antes de volver a guardar.',
  FORBIDDEN: 'Este contenido ya no está disponible para tu cuenta.',
  AUTH_REQUIRED: 'Tu sesión finalizó. Iniciá sesión para continuar.',
  EMAIL_VERIFICATION_REQUIRED: 'Verificá tu correo para continuar.',
  CSRF_INVALID: 'La sesión cambió. Volvé a intentar la acción.',
  SERVICE_UNAVAILABLE: 'No pudimos confirmar la respuesta del servidor. Conservamos tus cambios.',
};

export class AgendaClientError extends Error {
  constructor(readonly code: string, readonly status = 0, readonly details?: unknown) {
    super(messages[code] ?? 'No se pudo completar la acción. Volvé a intentar.');
  }
}
