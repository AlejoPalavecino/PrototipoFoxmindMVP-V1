import { useEffect, useRef, useState, type MouseEvent } from 'react';
import type { NavbarLink } from './navbar-types';
import { HomeReferenceIcon as FoxmindIcon } from './HomeReferenceIcon';
import { openDialog } from './dialog-focus';
import { brujulaSearchHref, type BrujulaSearchClient, type BrujulaSearchPage } from '../../src/core/domain/classrooms/brujula-search.ts';

export function NavigationSearch({ links, follow, shortcut = true, search }: { links: NavbarLink[]; follow: (event: MouseEvent<HTMLAnchorElement>, href: string) => void; shortcut?: boolean; search?: BrujulaSearchClient }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!shortcut) return;
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen(true); }
    };
    document.addEventListener('keydown', onShortcut);
    return () => document.removeEventListener('keydown', onShortcut);
  }, [shortcut]);
  return <><button type="button" className="fm-brujula-search" aria-label="Buscar en FoxMind" aria-haspopup="dialog" onClick={() => setOpen(true)}>
    <FoxmindIcon name="search"/><span>Buscar en FoxMind</span><kbd>Ctrl K</kbd>
  </button>{open ? <SearchDialog links={links} follow={follow} search={search} onClose={() => setOpen(false)}/> : null}</>;
}

type Result = BrujulaSearchPage & { query: string; client?: BrujulaSearchClient; loading: boolean; error: boolean };
const emptyResult = (query: string, loading = false, client?: BrujulaSearchClient): Result => ({ query, client, loading, error: false, items: [], nextCursor: null });
const labels = { classroom: 'Aula', topic: 'Tema', material: 'Biblioteca', activity: 'Actividad' };
export function SearchDialog({ links, follow, onClose, search }: { links: NavbarLink[]; follow: (event: MouseEvent<HTMLAnchorElement>, href: string) => void; onClose: () => void; search?: BrujulaSearchClient }) {
  const dialog = useRef<HTMLDialogElement>(null), [query, setQuery] = useState(''), [retry, setRetry] = useState(0);
  const [result, setResult] = useState<Result>(emptyResult(''));
  const pagination = useRef<AbortController | null>(null);
  useEffect(() => openDialog(dialog.current!), []);
  useEffect(() => {
    const controller = new AbortController();
    pagination.current?.abort(); pagination.current = null;
    setResult(emptyResult(query, Boolean(search), search));
    const timer = setTimeout(() => {
      if (search) void search(query, null, controller.signal)
        .then(page => { if (!controller.signal.aborted) setResult({ ...page, query, client: search, loading: false, error: false }); })
        .catch(() => { if (!controller.signal.aborted) setResult({ ...emptyResult(query, false, search), error: true }); });
    }, query ? 180 : 0);
    return () => { clearTimeout(timer); controller.abort(); pagination.current?.abort(); pagination.current = null; };
  }, [query, search, retry]);
  const current = result.query === query && result.client === search ? result : emptyResult(query, Boolean(search), search);
  async function more() {
    if (!search || !current.nextCursor || pagination.current || current.loading) return;
    const controller = new AbortController(); pagination.current = controller;
    setResult(previous => ({ ...previous, loading: true, error: false }));
    try {
      const page = await search(query, current.nextCursor, controller.signal);
      if (!controller.signal.aborted) setResult(previous => ({ ...page, query, client: search, loading: false, error: false, items: [
        ...previous.items, ...page.items.filter(item => !previous.items.some(existing => existing.kind === item.kind && existing.id === item.id)),
      ] }));
    } catch { if (!controller.signal.aborted) setResult(previous => ({ ...previous, loading: false, error: true })); }
    finally { if (pagination.current === controller) pagination.current = null; }
  }
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const destinations = [...links, { href: '/profile', label: 'Mi perfil' }, { href: '/settings', label: 'Configuración' }];
  const navigation = query.trim() || !search ? destinations.filter(link => normalize(link.label).includes(normalize(query.trim()))) : [];
  return <dialog ref={dialog} className="fm-brujula-search-dialog" aria-labelledby="fm-search-title"
    onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); } }}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }}>
    <header><h2 id="fm-search-title">Buscar en FoxMind</h2><button type="button" onClick={onClose} aria-label="Cerrar búsqueda"><FoxmindIcon name="close"/></button></header>
    <label><span className="entry-sr-only">Buscar en mi espacio</span><input autoFocus aria-label="Buscar en mi espacio" maxLength={120} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Aula, tema, material o actividad…"/></label>
    <nav aria-label="Resultados de búsqueda" aria-busy={current.loading}>{current.items.map(item => {
      const href = brujulaSearchHref(item.target);
      return <a key={`${item.kind}:${item.id}`} href={href} onClick={event => { follow(event, href); onClose(); }}><span><strong>{item.title}</strong><br/><small>{labels[item.kind]} · {item.classroomName} · {item.division}</small></span><FoxmindIcon name="arrow-right"/></a>;
    })}{navigation.map(link => <a key={link.href} href={link.href} onClick={event => { follow(event, link.href); onClose(); }}>{link.label}<FoxmindIcon name="arrow-right"/></a>)}</nav>
    {current.loading ? <p role="status">Buscando en tu espacio…</p> : null}
    {current.error ? <p role="alert">No pudimos completar la búsqueda. <button type="button" onClick={() => setRetry(value => value+1)}>Volver a intentar</button></p> : null}
    {!current.loading && !current.error && !current.items.length && !navigation.length ? <p role="status">Sin resultados. Probá con otro nombre, tema o actividad.</p> : null}
    {current.nextCursor ? <button type="button" disabled={current.loading} onClick={() => void more()}>Ver más resultados</button> : null}
  </dialog>;
}
