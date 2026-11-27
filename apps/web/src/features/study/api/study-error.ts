import { readAiMonthlyQuotaRejection } from '../../../../../../src/core/contracts/ai-quota.ts';

const usd = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', currencyDisplay: 'code', maximumFractionDigits: 6 });
const messages: Record<string, string> = {
  AI_INPUT_LIMIT:
    'El material supera el límite para una generación. Organizalo en carpetas más pequeñas o revisá el aula vinculada.',
  TOPICS_REQUIRED: 'Elegí al menos un tema en Temas y fuentes para practicar.',
  REVISION_CONFLICT:
    'La carpeta cambió en otra pestaña. Conservamos tu edición: actualizá la carpeta antes de volver a guardar.',
  CONFLICT: 'La carpeta cambió. Conservamos tu edición; actualizá antes de volver a guardar.',
  AUTH_REQUIRED: 'Tu sesión finalizó. Volvé a iniciar sesión.',
  FORBIDDEN: 'Esta carpeta es privada o tu cuenta no tiene acceso.',
  EMAIL_VERIFICATION_REQUIRED: 'Verificá tu correo para estudiar.',
  QUOTA_EXCEEDED: 'Alcanzaste el espacio disponible. Tus materiales siguen guardados.',
  AI_UNAVAILABLE: 'Foxy no está disponible por ahora. Conservamos tus entradas; volvé a intentar.',
  AI_BUSY: 'Foxy está ocupado con otra solicitud. Esperá un momento y volvé a intentar.',
  AI_TIMEOUT: 'Foxy alcanzó el tiempo máximo para responder. Podés volver a intentar.',
  AI_RATE_LIMITED: 'El proveedor de IA alcanzó una cuota de solicitudes. Esperá antes de volver a intentar.',
  AI_MONTHLY_BUDGET_EXCEEDED: 'El saldo mensual de IA disponible no alcanza para esta generación. Revisá tu cuota en la cabecera.',
  AI_BUDGET_EXCEEDED:
    'Alcanzaste tu cupo diario de IA. Se renueva a la medianoche, hora de Buenos Aires. Podés volver a intentar después.',
  AI_GLOBAL_DAILY_BUDGET_EXCEEDED:
    'FoxMind alcanzó su cupo diario de IA. Se renueva a la medianoche, hora de Buenos Aires. Podés volver a intentar después.',
  AI_FAILED: 'Foxy no pudo terminar. Conservamos tus entradas; volvé a intentar.',
  PENDING:
    'La solicitud sigue en proceso. Esperá y actualizá la carpeta antes de volver a intentar.',
  SOURCES_INSUFFICIENT: 'Faltan fuentes legibles para responder. Agregá material a la carpeta.',
  FILE_NOT_READY: 'El archivo todavía está en validación. Consultá su estado para continuar.',
  CSRF_INVALID: 'La sesión cambió. Volvé a intentar.',
  INVALID_INPUT: 'Revisá los datos ingresados.',
  NOT_FOUND: 'No encontramos la carpeta o el recurso.',
};
export class StudyError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status: number, detail?: unknown) {
    const quota = code === 'AI_MONTHLY_BUDGET_EXCEEDED' ? readAiMonthlyQuotaRejection(detail) : undefined;
    super(
      quota ? `Te quedan ${usd.format(quota.availableMicrousd / 1_000_000)} de IA este mes. Para esta generación hacen falta ${usd.format(quota.requiredMicrousd / 1_000_000)}. Revisá tu cuota en la cabecera.`
        : messages[code] ?? 'No pudimos completar la acción. Conservamos lo que escribiste; volvé a intentar.',
    );
    this.code = code;
    this.status = status;
  }
}
