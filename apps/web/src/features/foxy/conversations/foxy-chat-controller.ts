import type { CreateFoxyConversation, FoxyPurpose, SendFoxyMessage } from '../../../../../../src/core/domain/foxy/foxy-ai.ts';
import type { FoxySourceKind, FoxySourceCursor } from '../../../../../../src/core/domain/foxy/source-query.ts';
import type { WebFoxyClient, FoxyCapabilities, FoxyConversation, FoxyConversationCursor, FoxyTurn, FoxyCurriculum, FoxySource, FoxyCitation } from '../api/foxy-client.ts';

type SourcePage = { items: FoxySource[]; next: FoxySourceCursor | null };
type State = { curriculum: FoxyCurriculum | null; selection: SendFoxyMessage['selection']; sources: Record<FoxySourceKind, SourcePage>; citations: Record<string, FoxyCitation[]>; capabilities: FoxyCapabilities | null; conversations: FoxyConversation[]; nextConversationCursor: FoxyConversationCursor | null; current: FoxyConversation | null;
  turns: FoxyTurn[]; activeTurn: { id: string; sequence: number; state: FoxyTurn['state'] } | null; nextAfterSequence: number | null; pending: SendFoxyMessage | null; error: string | null; pollError: string | null; busy: boolean };
type Options = { client: WebFoxyClient; onChange: (state: State) => void; uuid?: () => string;
  setTimeout?: typeof globalThis.setTimeout; clearTimeout?: typeof globalThis.clearTimeout };
export function createFoxyChatController(options: Options) {
  const emptyContext = () => ({ curriculum: null, selection: { topicIds: [], sourceIds: [] }, pollError: null,
    sources: { PLAN: { items: [], next: null }, MATERIAL: { items: [], next: null }, ACTIVITY: { items: [], next: null } }, citations: {} });
  let state: State = { ...emptyContext(), capabilities: null, conversations: [], nextConversationCursor: null, current: null, turns: [], activeTurn: null, nextAfterSequence: null, pending: null, error: null, busy: false };
  const loadingSources = new Set<FoxySourceKind>();
  let pendingContext: CreateFoxyConversation | null = null;
  let epoch = 0, disposed = false, cancelling = false, abort = new AbortController(), timer: ReturnType<typeof setTimeout> | undefined, polling = false;
  const schedule = options.setTimeout ?? globalThis.setTimeout, clear = options.clearTimeout ?? globalThis.clearTimeout;
  let pollAttempts = 0;
  const update = (patch: Partial<State>) => { if (!disposed) { state = { ...state, ...patch }; options.onChange(state); } };
  const valid = (version: number) => !disposed && version === epoch && !abort.signal.aborted;
  function stopTimer() { if (timer !== undefined) clear(timer); timer = undefined; }
  function reset(): number { loadingSources.clear(); epoch++; abort.abort(); abort = new AbortController(); stopTimer(); polling = false; pollAttempts = 0; cancelling = false; return epoch; }
  function mergeTurns(older: FoxyTurn[], newer: FoxyTurn[]): FoxyTurn[] {
    const merged: FoxyTurn[] = [];
    for (const turn of [...newer, ...older]) {
      if (!merged.some(item => item.id === turn.id || item.sequence === turn.sequence)) merged.push(turn);
    }
    return merged.sort((a, b) => a.sequence - b.sequence);
  }
  function add(turn: FoxyTurn) { update({ turns: mergeTurns(state.turns, [turn]) }); }
  function poll(conversationId: string, turnId: string, version: number, delay = 2000): void {
    if (!valid(version)) return;
    if (timer !== undefined || polling) return;
    timer = schedule(async () => {
      timer = undefined; polling = true;
      try {
        const turn = await options.client.getTurn(conversationId, turnId, abort.signal);
        if (!valid(version)) return;
        if (cancelling || state.turns.some(item => item.id === turn.id && item.state === 'CANCELLED')) { polling = false; return; }
        add(turn);
        const active = state.turns.find(item => item.state === 'QUEUED' || item.state === 'RUNNING');
        pollAttempts = 0;
        update({ activeTurn: active ? { id: active.id, sequence: active.sequence, state: active.state } : null, pollError: null });
        polling = false;
        if (active) poll(conversationId, active.id, version);
      } catch (error) {
        if (!valid(version)) return;
        polling = false;
        if (cancelling || state.activeTurn?.id !== turnId) return;
        const failure = error as { status?: number; code?: string };
        const rateLimited = failure?.status === 429 || failure?.code === 'RATE_LIMITED';
        const transient = rateLimited || failure?.status === undefined || failure.status >= 500;
        const attempt = ++pollAttempts;
        update({ pollError: rateLimited ? 'Hay muchas consultas en este momento. Volvé a consultar el estado en unos segundos.' : 'No pudimos actualizar la respuesta. Podés volver a consultar el estado.' });
        if (transient && attempt <= 3) poll(conversationId, turnId, version, (rateLimited ? 15000 : 4000) * 2 ** (attempt - 1));
      }
    }, delay);
  }
  async function select(id: string) {
    if (disposed) return;
    const version = reset(); let current = state.conversations.find(item => item.id === id);
    update({ ...emptyContext(), current: current ?? null, turns: [], activeTurn: null, nextAfterSequence: null, pending: null, error: null, busy: true });
    try {
      if (!current) {
        current = await options.client.getConversation(id, abort.signal);
        if (!valid(version)) return;
        if (current.id !== id) throw new Error('Conversation mismatch');
        update({ current, conversations: [current, ...state.conversations] });
      }
      const curriculum = current.context.kind === 'CLASSROOM' ? options.client.curriculum(id, abort.signal) : Promise.resolve(null);
      const [page, context] = await Promise.all([options.client.listTurns(id, { afterSequence: 0, limit: 50 }, abort.signal), curriculum]);
      if (!valid(version)) return;
      update({ curriculum: context, turns: page.items, nextAfterSequence: page.nextAfterSequence, busy: false });
      const active = page.items.find(turn => turn.state === 'QUEUED' || turn.state === 'RUNNING');
      if (active) { update({ activeTurn: { id: active.id, sequence: active.sequence, state: active.state } }); poll(id, active.id, version); }
      return true;
    } catch { if (valid(version)) update({ busy: false, error: 'No pudimos cargar la conversación.' }); }
  }
  async function dispatch(intent: SendFoxyMessage) {
    const current = state.current; if (disposed || !current || state.busy) return;
    const version = epoch; pollAttempts = 0; update({ busy: true, error: null, pollError: null, pending: intent });
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
      if ((error as { code?: string }).code === 'AI_INPUT_LIMIT') {
        update({ busy: false, pending: null, error: 'El contexto supera el límite. Elegí menos temas o fuentes y volvé a enviar.' }); return 'invalid' as const;
      }
      if ((error as { code?: string }).code === 'INVALID_INPUT') {
        update({ busy: false, pending: null, error: 'Revisá el mensaje antes de enviarlo.' }); return 'invalid' as const;
      }
      if ((error as { code?: string }).code === 'AI_BUDGET_EXCEEDED') {
        update({ busy: false, pending: null, error: 'Se agotó el cupo de IA. Podés volver a intentar cuando se renueve.' }); return 'invalid' as const;
      }
      update({ busy: false, error: 'No pudimos confirmar el envío. Podés reintentar.' }); return 'uncertain' as const;
    }
  }
  return {
    getState: () => state,
    refreshActiveTurn() {
      if (disposed || !state.current || !state.activeTurn || polling || cancelling) return;
      stopTimer(); pollAttempts = 0;
      poll(state.current.id, state.activeTurn.id, epoch, 0);
    },
    async cancel() {
      const current = state.current, active = state.activeTurn, version = epoch;
      if (!current || !active || cancelling || state.busy) return;
      cancelling = true; update({ busy: true, error: null });
      try {
        const turn = await options.client.cancelTurn(current.id, active.id, abort.signal);
        if (!valid(version)) return;
        stopTimer(); pollAttempts = 0;
        add(turn); update({ activeTurn: null, busy: false, pollError: null });
      } catch {
        if (valid(version)) {
          update({ busy: false, error: 'No pudimos detener la solicitud. Volvé a intentar.' });
          poll(current.id, active.id, version);
        }
      } finally { if (valid(version)) cancelling = false; }
    },
    async init() {
      if (disposed) return;
      const version = reset(); update({ ...emptyContext(), capabilities: null, conversations: [], nextConversationCursor: null, current: null, turns: [], activeTurn: null, nextAfterSequence: null, pending: null, busy: true, error: null });
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
        if (input.carryAttachments) {
          // Keep the source selected until the committed destination is completely readable.
          // The caller retains the request ID if this read fails after creation succeeded.
          const current = result.conversation;
          const [page, curriculum] = await Promise.all([
            options.client.listTurns(current.id, { afterSequence: 0, limit: 50 }, abort.signal),
            current.context.kind === 'CLASSROOM' ? options.client.curriculum(current.id, abort.signal) : Promise.resolve(null),
          ]);
          if (!valid(version)) return;
          const nextVersion = reset(), active = page.items.find(turn => turn.state === 'QUEUED' || turn.state === 'RUNNING');
          update({ ...emptyContext(), current, curriculum, turns: page.items, pending: null,
            nextAfterSequence: page.nextAfterSequence, activeTurn: active ? { id: active.id, sequence: active.sequence, state: active.state } : null,
            conversations: [current, ...state.conversations.filter(item => item.id !== current.id)], busy: false, error: null });
          if (active) poll(current.id, active.id, nextVersion);
          return current.id;
        }
        update({ conversations: [result.conversation, ...state.conversations.filter(item => item.id !== result.conversation.id)], busy: false });
        return await select(result.conversation.id) ? result.conversation.id : undefined;
      } catch { if (valid(version)) update({ busy: false, error: 'No pudimos crear la conversación.' }); }
    },
    select,
    async prepareContext(classroomId: string) {
      if (disposed || state.busy || state.pending || state.activeTurn) return false;
      const version = epoch; update({ busy: true, error: null });
      try {
        if (pendingContext?.context.kind !== 'CLASSROOM' || pendingContext.context.classroomId !== classroomId) pendingContext = { requestId: (options.uuid ?? (() => crypto.randomUUID()))(), title: 'Nueva conversación', context: { kind: 'CLASSROOM', classroomId } };
        const result = await options.client.createConversation(pendingContext, abort.signal);
        if (!valid(version)) return false;
        pendingContext = null;
        update({ conversations: [result.conversation, ...state.conversations.filter(item => item.id !== result.conversation.id)], busy: false });
        return await select(result.conversation.id) === true;
      } catch (error) {
        if (valid(version)) {
          if (['INVALID_INPUT', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT'].includes((error as { code?: string }).code ?? '')) pendingContext = null;
          update({ busy: false, error: 'No pudimos preparar el contexto. Volvé a elegir el aula.' });
        }
        return false;
      }
    },
    async rename(title: string) {
      const current = state.current;
      if (disposed || !current || state.busy || state.pending || state.activeTurn) return false;
      if (!title.trim() || [...title].length > 120 || /[\u0000-\u001f\u007f-\u009f]/u.test(title)) { update({ error: 'Escribí un título de entre 1 y 120 caracteres.' }); return false; }
      const version = epoch; update({ busy: true, error: null });
      try {
        const revised = await options.client.renameConversation(current.id, { revision: current.revision, title }, abort.signal);
        if (!valid(version)) return false;
        if (revised.id !== current.id) throw new Error('Conversation mismatch');
        update({ current: revised, conversations: state.conversations.map(item => item.id === revised.id ? revised : item), busy: false }); return true;
      } catch (error) {
        if (!valid(version)) return false;
        if ((error as { code?: string }).code === 'CONFLICT') {
          try {
            const revised = await options.client.getConversation(current.id, abort.signal);
            if (valid(version) && revised.id === current.id) update({ current: revised, conversations: state.conversations.map(item => item.id === revised.id ? revised : item) });
          } catch { /* Keep the last known revision; another explicit retry remains safe. */ }
          if (valid(version)) update({ busy: false, error: 'La conversación cambió en otra sesión. Conservamos tu título para que puedas revisarlo y volver a guardar.' });
        } else update({ busy: false, error: 'No pudimos guardar el título. Conservamos lo que escribiste; volvé a intentar.' });
        return false;
      }
    },
    adoptVisualRevision(id: string, expected: string, revision: string) {
      if (disposed || !state.current || state.current.id !== id || state.current.revision !== expected || !/^(0|[1-9][0-9]*)$/u.test(revision)) return;
      const revised = { ...state.current, revision }; update({ current: revised, conversations: state.conversations.map(item => item.id === id ? revised : item) });
    },
    async send(purpose: FoxyPurpose, text: string, selection: SendFoxyMessage['selection']) {
      if (disposed || !state.current || state.pending || state.busy || state.activeTurn
        || (state.current.context.kind === 'CLASSROOM' && !state.curriculum?.canGenerate)) return;
      return dispatch({ requestId: (options.uuid ?? (() => crypto.randomUUID()))(), revision: state.current.revision,
        purpose, text, selection: state.current.context.kind === 'GENERAL' ? { topicIds: [], sourceIds: [] } : structuredClone(selection) });
    },
    async retry() { if (!disposed && state.pending) await dispatch(state.pending); },
    setFullClassroom(enabled: boolean) {
      if (!state.curriculum || state.current?.context.kind !== 'CLASSROOM') return;
      update({ selection: enabled ? { mode: 'ALL_CLASSROOM', topicIds: [], sourceIds: [] } : { topicIds: [], sourceIds: [] } });
    },
    selectTopic(id: string) {
      if (disposed || !state.curriculum || !state.curriculum.units.some(unit => unit.topics.some(topic => topic.id === id))) return;
      const selected = state.selection.topicIds, exists = selected.includes(id);
      if (!exists && selected.length >= 100) return;
      update({ selection: { sourceIds: state.selection.sourceIds, topicIds: exists ? selected.filter(item => item !== id) : [...selected, id] } });
    },
    selectSource(id: string) {
      if (disposed || !state.curriculum) return;
      const all = Object.values(state.sources).flatMap(page => page.items), source = all.find(item => item.sourceId === id);
      if (!source?.available) return;
      const selected = state.selection.sourceIds, exists = selected.includes(id);
      if (!exists && (selected.length >= 20 || all.filter(item => selected.includes(item.sourceId)).reduce((sum, item) => sum + item.documentCount, 0) + source.documentCount > 6)) return;
      update({ selection: { topicIds: state.selection.topicIds, sourceIds: exists ? selected.filter(item => item !== id) : [...selected, id] } });
    },
    async loadSources(kind: FoxySourceKind) {
      if (disposed || !state.current || state.current.context.kind !== 'CLASSROOM' || loadingSources.has(kind)) return;
      const version = epoch, id = state.current.id, before = state.sources[kind];
      if (before.items.length && before.next === null) return;
      loadingSources.add(kind);
      try {
        const page = await options.client.sources(id, { kind, limit: 50, after: before.next }, abort.signal);
        if (valid(version)) {
          const known = new Set(before.items.map(item => item.sourceId));
          update({ sources: { ...state.sources, [kind]: { items: [...before.items, ...page.items.filter(item => !known.has(item.sourceId))], next: page.next } },
            ...(state.error === 'No pudimos cargar las fuentes del aula.' ? { error: null } : {}) });
        }
      } catch { if (valid(version)) update({ error: 'No pudimos cargar las fuentes del aula.' }); }
      finally { if (valid(version)) loadingSources.delete(kind); }
    },
    async loadCitations(turnId: string) {
      if (disposed || !state.current) return;
      const version = epoch, id = state.current.id;
      try {
        const citations = await options.client.citations(id, turnId, abort.signal);
        if (valid(version)) update({ citations: { ...state.citations, [turnId]: citations.map(item => ({ ...item,
          href: item.availability === 'AVAILABLE' ? options.client.citationUrl(id, turnId, item.id, 'preview') : null })) } });
      } catch { if (valid(version)) update({ error: 'No pudimos cargar las citas.' }); }
    },
    async resolveToolSelection(topicIds: string[], baseSelection?:SendFoxyMessage['selection']): Promise<SendFoxyMessage['selection'] | undefined> {
      const current=state.current, version=epoch;
      if(disposed||!current)return;
      if(current.context.kind==='GENERAL')return {topicIds:[],sourceIds:[]};
      const available=state.curriculum?.units.flatMap(unit=>unit.topics.map(topic=>topic.id))??[];
      if(!state.curriculum?.canGenerate||new Set(topicIds).size!==topicIds.length||topicIds.some(id=>!available.includes(id)))return;
      const selected=structuredClone(baseSelection??state.selection);
      if(selected.mode!=='ALL_CLASSROOM')return {topicIds:[...topicIds],sourceIds:selected.sourceIds};
      if(topicIds.length===available.length)return selected;
      if(topicIds.length>100)return;
      const sourceIds:string[]=[];
      try {
        for(const kind of ['PLAN','MATERIAL','ACTIVITY'] as const){
          let after:FoxySourceCursor|null=null;
          let pages=0;
          do{
            if(++pages>4)return;
            const page=await options.client.sources(current.id,{kind,limit:50,after},abort.signal);
            if(!valid(version)||state.current?.id!==current.id)return;
            for(const source of page.items)if(source.available&&!sourceIds.includes(source.sourceId))sourceIds.push(source.sourceId);
            if(sourceIds.length>20||sourceIds.filter(id=>!id.startsWith('activity:')).length>6)return;
            if(page.next&&JSON.stringify(page.next)===JSON.stringify(after))return;
            after=page.next;
          }while(after);
        }
        return {topicIds:[...topicIds],sourceIds};
      }catch{return;}
    },
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
