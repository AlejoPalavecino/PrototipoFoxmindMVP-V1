const messages: Record<string, string> = {
  AI_UNAVAILABLE: 'La extracción automática no está disponible. Podés cargar las unidades y los temas manualmente.',
  AI_INPUT_LIMIT: 'El plan es demasiado extenso para analizarlo automáticamente. Podés completar las unidades manualmente.',
  NO_STRUCTURE: 'No encontramos unidades y temas claros en este plan. Agregalos manualmente o elegí otro archivo.',
  INVALID_AI_OUTPUT: 'No pudimos obtener una propuesta válida. Revisá el plan o continuá manualmente.',
  AI_RATE_LIMITED: 'Hay muchas solicitudes en este momento. Podés volver a intentar más tarde o continuar manualmente.',
  AI_BUDGET_EXCEEDED: 'La extracción automática alcanzó su límite de uso. Podés continuar manualmente.',
  AI_TIMEOUT: 'El análisis tardó más de lo esperado. Podés volver a intentar o continuar manualmente.',
  PROVIDER_OUTCOME_UNKNOWN: 'No pudimos confirmar el resultado del análisis. Volver a intentar puede consumir otro análisis.',
  FILE_NOT_READY: 'El archivo aún no está aprobado. Esperá su aprobación o elegí otro plan.',
  CONFLICT: 'El borrador cambió. Guardá y volvé a abrirlo para consultar la versión actual antes de aplicar la propuesta.',
  REPLACEMENT_CONFIRMATION_REQUIRED: 'Confirmá el reemplazo de las unidades actuales antes de usar la propuesta.',
  INVALID_INPUT: 'Revisá los nombres de las unidades y sus temas antes de usar la propuesta.',
};
export function extractionMessage(error: unknown): string {
  const code = typeof error === 'string' ? error : (error as { code?: string } | null)?.code;
  return (code && messages[code]) || 'No pudimos completar el análisis. Tus unidades siguen disponibles y podés continuar manualmente.';
}
