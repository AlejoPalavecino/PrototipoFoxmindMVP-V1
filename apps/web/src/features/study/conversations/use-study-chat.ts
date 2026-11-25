import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { StudyRun, StudyAction, StudyCommandData } from '../model/study-commands.ts';
import { startStudyConversation } from '../model/study-discovery.ts';
import { startChatTiming, trackChatTiming } from '../../../shared/chat-timing.ts';
type Options = {
  run: StudyRun;
  currentId?: string;
  text: string;
  setText: Dispatch<SetStateAction<string>>;
  selected: string[];
  busy: boolean;
  active: boolean;
  blocked: boolean;
  onConversation: (id: string) => void;
  cancelGeneration?: (requestId: string) => Promise<'CANCELLED' | 'ALREADY_FINISHED'>;
  /** Reads Foxy's partial answer for a running chat request; null when none is available yet. */
  readPreview?: (requestId: string, signal: AbortSignal) => Promise<string | null>;
};
export function useStudyChat({
  run,
  currentId,
  text,
  setText: Text,
  selected,
  busy,
  active,
  blocked,
  onConversation: selectConversation,
  cancelGeneration,
  readPreview,
}: Options) {
  const [pending, Pending] = useState<string | null>(null);
  const [operation, Operation] = useState('');
  const [notice, NoticeText] = useState('');
  const sending = useRef(false);
  const pendingIntents = useRef(new Map<string, string>()),
    inFlight = useRef<string | undefined>(undefined);
  const [cancelling, setCancelling] = useState(false);
  const [partial, Partial] = useState<string | null>(null);
  const previewStop = useRef<(() => void) | null>(null);
  // Leaving the folder must not keep polling a preview whose request is still in flight.
  useEffect(() => () => { previewStop.current?.(); }, []);
  // Poll the private partial answer while a chat request is in flight; stop as soon as it ends.
  function followPreview(requestId: string) {
    if (!readPreview) return () => {};
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const markdown = await readPreview(requestId, controller.signal);
        if (!controller.signal.aborted && markdown) Partial(markdown);
      } catch { /* The final answer still arrives through the command. */ }
      if (!controller.signal.aborted) timer = setTimeout(tick, 500);
    };
    timer = setTimeout(tick, 400);
    const stop = () => { controller.abort(); if (timer) clearTimeout(timer); if (previewStop.current === stop) previewStop.current = null; Partial(null); };
    previewStop.current = stop;
    return stop;
  }
  async function command<A extends StudyAction>(
    action: A,
    data: StudyCommandData[A] = {} as StudyCommandData[A],
  ) {
    NoticeText('');
    Operation(action);
    const key = JSON.stringify({ action, data });
    const requestId = ['CHAT', 'GENERATE'].includes(action)
      ? (pendingIntents.current.get(key) ?? crypto.randomUUID())
      : undefined;
    if (requestId) pendingIntents.current.set(key, requestId);
    inFlight.current = requestId;
    const stopPreview = action === 'CHAT' && requestId ? followPreview(requestId) : () => {};
    try {
      const response = await run(action, data, requestId);
      pendingIntents.current.delete(key);
      if (response?.result?.status === 'CANCELLED') {
        NoticeText('Detuviste la solicitud. Podés retomarla cuando quieras.');
        return false;
      }
      NoticeText(
        action === 'GENERATE'
          ? 'Tu creación está lista. Abrila desde Creaciones.'
          : action === 'CHAT'
            ? 'Respuesta recibida.'
            : 'Cambios guardados.',
      );
      return response || false;
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        !['SERVICE_UNAVAILABLE', 'PENDING'].includes(String(error.code))
      )
        pendingIntents.current.delete(key);
      return false;
    } finally {
      stopPreview();
      inFlight.current = undefined;
      Operation('');
    }
  }
  async function stop() {
    if (!inFlight.current || !cancelGeneration || cancelling) return;
    setCancelling(true);
    try {
      const outcome = await cancelGeneration(inFlight.current);
      if (outcome === 'CANCELLED') Pending(null);
      NoticeText(outcome === 'CANCELLED' ? 'Solicitud detenida.' : 'La solicitud ya terminó.');
    } catch {
      NoticeText('No pudimos detener la solicitud. Volvé a intentar.');
    } finally {
      setCancelling(false);
    }
  }
  async function send() {
    if (!text.trim() || busy || !active || sending.current || blocked) return;
    const started = startChatTiming();
    const submitted = text;
    sending.current = true;
    Pending(submitted);
    let id = currentId;
    try {
      if (!id) {
        id = await startStudyConversation(
          () => run('NEW_CONVERSATION', { title: submitted.slice(0, 80) }),
          selectConversation,
        );
      }
      if (!id) return;
      const response = await command('CHAT', { conversationId: id, message: submitted, topicIds: selected });
      if (response) {
        const answer = response.result?.conversation?.turns?.at(-1);
        if (answer?.id && answer.role === 'assistant' && answer.text?.trim()) {
          trackChatTiming('study', answer.id, started);
        }
        Text((value) => (value === submitted ? '' : value));
      }
    } catch {
      /* parent retains error */
    } finally {
      Pending(null);
      sending.current = false;
    }
  }

  return {
    pending,
    partial,
    operation,
    notice,
    setNotice: NoticeText,
    command,
    stop,
    cancelling,
    canStop: !!inFlight.current,
    send,
  };
}
