import type { ActivityGenerationView, ActivityProposal, StartActivityGeneration } from '../../src/core/domain/index.ts';
import type { ClassroomClient } from './api.ts';

export type GenerationView = Omit<ActivityGenerationView, 'createdAt'> & {
  type?: StartActivityGeneration['type']; unitId?: string; topicIds?: string[]; createdAt: string;
  missingInformation?: string[]; sourceReport?: { sourceId: string; status: string; pageCount: number | null; warnings: string[] }[];
};
export interface GenerationSource {
  sourceId: string; fileId: string; title: string; kind: 'plan' | 'material'; extension: string;
  sizeBytes: number; unitId: string | null; topicId: string | null; available: boolean;
  reason: 'UNSUPPORTED_FORMAT' | 'AI_INPUT_LIMIT' | 'FILE_NOT_READY' | null;
}
export const generationWarnings: Record<string, string> = {
  DOCX_IMAGES_OMITTED: 'Word: se lee el texto; las imágenes no se interpretan.',
  INSUFFICIENT_CONTENT: 'Las fuentes no aportan suficiente información. Añade contenido o aclara el contexto.',
  PARTIAL_CONTENT: 'Parte del contenido no se pudo interpretar. Revisa el alcance antes de utilizarlo.',
};
export const generationStates: Record<string, string> = {
  QUEUED: 'En cola', RUNNING: 'Generando', READY: 'Lista para revisar', FAILED: 'No se pudo generar',
  STALE: 'Fuentes o programa modificados', APPLIED: 'Borrador creado',
};
export const generationErrors: Record<string, string> = {
  SOURCE_UNAVAILABLE: 'Una fuente dejó de estar disponible. Revisa la selección.',
  FILE_NOT_READY: 'Un archivo todavía no está aprobado para su lectura.',
  AI_INPUT_LIMIT: 'Las fuentes superan los límites de lectura. Reduce la selección.',
  INSUFFICIENT_CONTENT: generationWarnings.INSUFFICIENT_CONTENT,
  INVALID_AI_OUTPUT: 'La respuesta no cumple el formato. Puedes solicitar una generación nueva.',
  AI_UNAVAILABLE: 'La generación con IA no está disponible. Puedes crear la actividad manualmente.',
  AI_RATE_LIMITED: 'Se alcanzó el límite de solicitudes. Espera antes de generar otra propuesta.',
  AI_BUDGET_EXCEEDED: 'Se alcanzó el presupuesto de IA disponible.',
  AI_TIMEOUT: 'La generación superó el tiempo disponible.',
  PROVIDER_OUTCOME_UNKNOWN: 'No se pudo confirmar el resultado del proveedor. Puede haber consumo aunque no haya una propuesta.',
};
export function generationClient(api: ClassroomClient, roomId: string) {
  const base = `/${roomId}/activity-generations`;
  return {
    sources: (signal?: AbortSignal) => api.call<{ revision: string; sources: GenerationSource[] }>(`${base}/sources`, 'GET', undefined, signal),
    list: (signal?: AbortSignal) => api.call<{ jobs: GenerationView[] }>(base, 'GET', undefined, signal),
    get: (id: string, signal?: AbortSignal) => api.call<GenerationView>(`${base}/${id}`, 'GET', undefined, signal),
    start: (input: StartActivityGeneration) => api.call<GenerationView>(base, 'POST', input),
    regenerate: (id: string, input: StartActivityGeneration, acknowledgePossibleCharge: boolean) =>
      api.call<GenerationView>(`${base}/${id}/regenerate`, 'POST', { ...input, acknowledgePossibleCharge }),
    apply: (id: string, revision: string, requestId: string, proposal: ActivityProposal) =>
      api.call<{ generationId: string; activityId: string; revision: string }>(`${base}/${id}/apply`, 'POST', { revision, requestId, proposal }),
  };
}
