import type { SendMessageParams } from './messageSending';

export interface MessageSendState { pending: boolean; error: string | null }
interface SendOptions {
  operation?: () => void | Promise<void>;
  onState: (state: MessageSendState) => void;
  onConfirmed: () => void;
  isCurrent?: () => boolean;
  // Lifetime validity is independent of the conversation visit: a live new
  // conversation still needs pending released, but an unmounted instance does not.
  isLive?: () => boolean;
}
interface LocalMessageStore {
  getConversationById: (id: string) => { type: string; participants: { id: string }[] } | undefined;
  sendMessage?: (params: SendMessageParams) => void | Promise<void>;
}

// Acquire the gate before publishing state or invoking any reentrant callback.
// Confirmation is local callback completion, not server delivery.
export async function runMessageSend(gate: { current: boolean }, options: SendOptions): Promise<boolean> {
  if (gate.current) return false;
  gate.current = true;
  let error: string | null = null;
  const isLive = () => !options.isLive || options.isLive();
  try {
    if (isLive()) options.onState({ pending: true, error: null });
    if (typeof options.operation !== 'function') throw new Error('Acción de envío no disponible.');
    await options.operation();
    if (isLive() && (!options.isCurrent || options.isCurrent())) options.onConfirmed();
    return true;
  } catch {
    error = 'No se pudo completar el envío. Conservamos tu borrador; puedes reintentar. Revisa el historial antes de hacerlo.';
    return false;
  } finally {
    gate.current = false;
    if (isLive()) options.onState({ pending: false, error });
  }
}

export function sendLocalMessage(store: LocalMessageStore, params: SendMessageParams): void | Promise<void> {
  const conversation = store.getConversationById(params.conversationId);
  // The synchronous store deliberately returns void even for a missing target.
  // Validate here so that this no-op can never be treated as UI confirmation.
  if (!conversation || typeof store.sendMessage !== 'function') throw new Error('Envío no disponible.');
  if (conversation.type === 'direct' && !conversation.participants.some(p => p.id === params.senderId)) {
    throw new Error('No perteneces a esta conversación.');
  }
  if (!params.text.trim() && !params.attachment) throw new Error('El mensaje está vacío.');
  return store.sendMessage(params);
}
