import type { CreateFoxyConversation, FoxyPurpose, SendFoxyMessage } from '../../../../src/core/domain/index.ts';
import type { WebFoxyClient, FoxyCapabilities, FoxyConversation, FoxyConversationCursor, FoxyTurn } from './foxy-client.ts';

type State = { capabilities: FoxyCapabilities | null; conversations: FoxyConversation[]; nextConversationCursor: FoxyConversationCursor | null; current: FoxyConversation | null;
  turns: FoxyTurn[]; activeTurn: { id: string; sequence: number; state: FoxyTurn['state'] } | null; nextAfterSequence: number | null; pending: SendFoxyMessage | null; error: string | null; busy: boolean };
type Options = { client: WebFoxyClient; onChange: (state: State) => void; uuid?: () => string;
  setTimeout?: typeof globalThis.setTimeout; clearTimeout?: typeof globalThis.clearTimeout };
export function createFoxyChatController(options: Options) {
  let state: State = { capabilities: null, conversations: [], nextConversationCursor: null, current: null, turns: [], activeTurn: null, nextAfterSequence: null, pending: null, error: null, busy: false };
  let epoch = 0, disposed = false, abort = new AbortController(), timer: ReturnType<typeof setTimeout> | undefined, polling = false;
  const schedule = options.setTimeout ?? globalThis.setTimeout, clear = options.clearTimeout ?? globalThis.clearTimeout;
  const update = (patch: Partial<State>) => { if (!disposed) { state = { ...state, ...patch }; options.onChange(state); } };
  const valid = (version: number) => !disposed && version === epoch && !abort.signal.aborted;
  function reset(): number { epoch++; abort.abort(); abort = new AbortController(); if (timer !== undefined) clear(timer); timer = undefined; polling = false; return epoch; }
  function mergeTurns(older: FoxyTurn[], newer: FoxyTurn[]): FoxyTurn[] {
    const merged: FoxyTurn[] = [];
    for (const turn of [...newer, ...older]) {
      if (!merged.some(item => item.id === turn.id || item.sequence === turn.sequence)) merged.push(turn);
    }
    return merged.sort((a, b) => a.sequence - b.sequence);
  }
  function add(turn: FoxyTurn) { update({ turns: mergeTurns(state.turns, [turn]) }); }
  function poll(conversationId: string, turnId: string, version: number): void {
    if (!valid(version)) return;
    if (timer !== undefined || polling) return;
    timer = schedule(async () => {
      timer = undefined; polling = true;
      try {
        const turn = await options.client.getTurn(conversationId, turnId, abort.signal);
        if (!valid(version)) return;
        add(turn);
        const active = state.turns.find(item => item.state === 'QUEUED' || item.state === 'RUNNING');
        update({ activeTurn: active ? { id: active.id, sequence: active.sequence, state: active.state } : null });
        polling = false;
        if (active) poll(conversationId, active.id, version);
      } catch { if (valid(version)) { polling = false; update({ error: 'No pudimos actualizar la respuesta.' }); } }
    }, 2000);
  }
  async function select(id: string) {
    if (disposed) return;
    const version = reset(), current = state.conversations.find(item => item.id === id);
    update({ current: current ?? null, turns: [], activeTurn: null, nextAfterSequence: null, pending: null, error: null, busy: true });
    if (!current) { update({ busy: false, error: 'No encontramos la conversación.' }); return; }
    try {
      const page = await options.client.listTurns(id, { afterSequence: 0, limit: 50 }, abort.signal);
      if (!valid(version)) return;
      update({ turns: page.items, nextAfterSequence: page.nextAfterSequence, busy: false });
      const active = page.items.find(turn => turn.state === 'QUEUED' || turn.state === 'RUNNING');
      if (active) { update({ activeTurn: { id: active.id, sequence: active.sequence, state: active.state } }); poll(id, active.id, version); }
    } catch { if (valid(version)) update({ busy: false, error: 'No pudimos cargar la conversación.' }); }
  }
  async function dispatch(intent: SendFoxyMessage) {
    const current = state.current; if (disposed || !current || state.busy) return;
    const version = epoch; update({ busy: true, error: null, pending: intent });
    try {
      const receipt = await options.client.sendMessage(current.id, intent, abort.signal);
      if (!valid(version)) return 'uncertain' as const;
      const revised = { ...current, revision: receipt.conversationRevision };
      update({ current: revised, conversations: state.conversations.map(item => item.id === revised.id ? revised : item), pending: null, busy: false, activeTurn: receipt.turn.state === 'QUEUED' || receipt.turn.state === 'RUNNING' ? receipt.turn : null });
      if (receipt.turn.state === 'QUEUED' || receipt.turn.state === 'RUNNING') poll(current.id, receipt.turn.id, version);
      else {
        try { const turn = await options.client.getTurn(current.id, receipt.turn.id, abort.signal); if (valid(version)) add(turn); }
        catch { if (valid(version)) update({ error: 'No pudimos actualizar la respuesta.' }); }
      }
      return 'accepted' as const;
    } catch (error) {
      if (!valid(version)) return 'uncertain' as const;
      if ((error as { code?: string }).code === 'INVALID_INPUT') {
        update({ busy: false, pending: null, error: 'Revisá el mensaje antes de enviarlo.' }); return 'invalid' as const;
      }
      update({ busy: false, error: 'No pudimos confirmar el envío. Podés reintentar.' }); return 'uncertain' as const;
    }
  }
  return {
    getState: () => state,
    async init() {
      if (disposed) return;
      const version = reset(); update({ capabilities: null, conversations: [], nextConversationCursor: null, current: null, turns: [], activeTurn: null, nextAfterSequence: null, pending: null, busy: true, error: null });
      try {
        const [capabilities, page] = await Promise.all([options.client.capabilities(abort.signal), options.client.listConversations({ limit: 50, after: null }, abort.signal)]);
        if (valid(version)) update({ capabilities, conversations: page.items, nextConversationCursor: page.next, busy: false });
      } catch { if (valid(version)) update({ busy: false, error: 'No pudimos cargar Foxy AI.' }); }
    },
    async loadMoreConversations() {
      if (disposed || !state.nextConversationCursor || state.busy) return;
      const version = epoch, after = state.nextConversationCursor; update({ busy: true, error: null });
      try {
        const page = await options.client.listConversations({ limit: 50, after }, abort.signal);
        if (valid(version)) {
          const existing = new Set(state.conversations.map(item => item.id));
          update({ conversations: [...state.conversations, ...page.items.filter(item => !existing.has(item.id))],
            nextConversationCursor: page.next, busy: false });
        }
      } catch { if (valid(version)) update({ busy: false, error: 'No pudimos cargar más conversaciones.' }); }
    },
    async create(input: CreateFoxyConversation) {
      if (disposed || state.busy) return;
      const version = epoch; update({ busy: true, error: null });
      try {
        const result = await options.client.createConversation(input, abort.signal);
        if (!valid(version)) return;
        update({ conversations: [result.conversation, ...state.conversations.filter(item => item.id !== result.conversation.id)], busy: false });
        await select(result.conversation.id);
      } catch { if (valid(version)) update({ busy: false, error: 'No pudimos crear la conversación.' }); }
    },
    select,
    async send(purpose: FoxyPurpose, text: string, selection: SendFoxyMessage['selection']) {
      if (disposed || !state.current || state.pending || state.busy || state.activeTurn) return;
      return dispatch({ requestId: (options.uuid ?? (() => crypto.randomUUID()))(), revision: state.current.revision,
        purpose, text, selection: structuredClone(selection) });
    },
    async retry() { if (!disposed && state.pending) await dispatch(state.pending); },
    async loadMore() {
      if (disposed || !state.current || state.nextAfterSequence === null || state.busy) return;
      const version = epoch, id = state.current.id, afterSequence = state.nextAfterSequence; update({ busy: true, error: null });
      try {
        const page = await options.client.listTurns(id, { afterSequence, limit: 50 }, abort.signal);
        if (valid(version)) {
          update({ turns: mergeTurns(page.items, state.turns), nextAfterSequence: page.nextAfterSequence, busy: false });
          const active = state.turns.find(turn => turn.state === 'QUEUED' || turn.state === 'RUNNING');
          if (active && !state.activeTurn) { update({ activeTurn: { id: active.id, sequence: active.sequence, state: active.state } }); poll(id, active.id, version); }
        }
      } catch { if (valid(version)) update({ busy: false, error: 'No pudimos cargar más mensajes.' }); }
    },
    dispose() { if (disposed) return; disposed = true; epoch++; abort.abort(); if (timer !== undefined) clear(timer); timer = undefined; },
  };
}
