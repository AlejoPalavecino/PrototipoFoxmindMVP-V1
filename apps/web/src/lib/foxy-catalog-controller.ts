import type { FoxyConversation, FoxyConversationCursor, FoxyCreation, FoxyCreationCursor, WebFoxyClient } from './foxy-client.ts';

export type FoxyConversationQuery = { q: string; context: string };
export type FoxyCreationQuery = FoxyConversationQuery & { type: string; status: string };
type Collection<T, C> = { items: T[]; next: C | null; loading: boolean; error: string | null };
export type FoxyCatalogState = {
  conversationQuery: FoxyConversationQuery; creationQuery: FoxyCreationQuery;
  conversations: Collection<FoxyConversation, FoxyConversationCursor>;
  creations: Collection<FoxyCreation, FoxyCreationCursor>;
};
const empty = <T, C>(): Collection<T, C> => ({ items: [], next: null, loading: false, error: null });
export function createFoxyCatalogController(options: {
  client: Pick<WebFoxyClient, 'listConversations' | 'listCreations'>; onChange(state: FoxyCatalogState): void;
}) {
  let disposed = false;
  let state: FoxyCatalogState = { conversationQuery: { q: '', context: 'ALL' }, creationQuery: { q: '', context: 'ALL', type: 'ALL', status: 'ALL' }, conversations: empty(), creations: empty() };
  const channels = { conversations: { epoch: 0, abort: new AbortController() }, creations: { epoch: 0, abort: new AbortController() } };
  const emit = () => { if (!disposed) options.onChange(structuredClone(state)); };
  async function load(key: 'conversations' | 'creations', more = false, resetItems = false) {
    if (disposed || more && (state[key].loading || !state[key].next)) return;
    const channel = channels[key]; channel.abort.abort(); channel.abort = new AbortController();
    const version = ++channel.epoch, signal = channel.abort.signal;
    const loadedCount = resetItems ? 0 : state[key].items.length;
    if (key === 'conversations') state = { ...state, conversations: { ...(resetItems ? empty<FoxyConversation, FoxyConversationCursor>() : state.conversations), loading: true, error: null } };
    else state = { ...state, creations: { ...(resetItems ? empty<FoxyCreation, FoxyCreationCursor>() : state.creations), loading: true, error: null } };
    emit();
    try {
      if (key === 'conversations') {
        const query = { ...state.conversationQuery };
        let page = await options.client.listConversations({ ...query, limit: 20, after: more ? state.conversations.next : null }, signal);
        if (disposed || channel.epoch !== version) return;
        let refreshed = page.items;
        while (!more && page.next && refreshed.length < loadedCount) {
          page = await options.client.listConversations({ ...query, limit: 20, after: page.next }, signal);
          if (disposed || channel.epoch !== version) return;
          refreshed = [...refreshed, ...page.items];
        }
        const items = more ? [...state.conversations.items, ...refreshed] : refreshed;
        state = { ...state, conversations: { items: items.filter((item, i) => items.findIndex(other => other.id === item.id) === i), next: page.next, loading: false, error: null } };
      } else {
        const query = { ...state.creationQuery };
        let page = await options.client.listCreations({ ...query, limit: 20, after: more ? state.creations.next : null }, signal);
        if (disposed || channel.epoch !== version) return;
        let refreshed = page.items;
        while (!more && page.next && refreshed.length < loadedCount) {
          page = await options.client.listCreations({ ...query, limit: 20, after: page.next }, signal);
          if (disposed || channel.epoch !== version) return;
          refreshed = [...refreshed, ...page.items];
        }
        const items = more ? [...state.creations.items, ...refreshed] : refreshed;
        state = { ...state, creations: { items: items.filter((item, i) => items.findIndex(other => other.id === item.id) === i), next: page.next, loading: false, error: null } };
      }
      emit();
    } catch {
      if (disposed || channel.epoch !== version) return;
      state = { ...state, [key]: { ...state[key], loading: false, error: key === 'conversations' ? 'No pudimos cargar las conversaciones. Volvé a intentar.' : 'No pudimos cargar las creaciones. Volvé a intentar.' } };
      emit();
    }
  }
  return {
    getState: () => structuredClone(state),
    refresh: () => Promise.all([load('conversations'), load('creations')]),
    setConversationQuery(query: FoxyConversationQuery) { state = { ...state, conversationQuery: { ...query } }; return load('conversations', false, true); },
    setCreationQuery(query: FoxyCreationQuery) { state = { ...state, creationQuery: { ...query } }; return load('creations', false, true); },
    moreConversations: () => load('conversations', true), moreCreations: () => load('creations', true),
    dispose() { disposed = true; for (const channel of Object.values(channels)) { channel.epoch++; channel.abort.abort(); } },
  };
}
