export type FoxyDestinationHref = (target: { kind: 'material'; classroomId: string; materialId: string } | { kind: 'activity'; classroomId: string; activityId: string }) => string;
import type { FoxyConversation, FoxyCreation } from '../api/foxy-client';
import { useEffect, useRef, type ReactNode } from 'react';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import styles from '../workspace/foxy-workspace.module.css';

import type { FoxyConversationQuery, FoxyCreationQuery } from './foxy-catalog-controller';
export type { FoxyCatalogState, FoxyConversationQuery, FoxyCreationQuery } from './foxy-catalog-controller';
export type FoxyCatalogPage<T> = { items: T[]; next: unknown | null; loading: boolean; error: string | null };
type Classroom = { id: string; name: string };
function CollectionFrame({ items, children }: { items: unknown[]; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null), focused = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const element = root.current, previous = focused.current;
    if (element && previous && !previous.isConnected && element.ownerDocument.activeElement === element.ownerDocument.body) {
      element.querySelector<HTMLInputElement>('input[type="search"]')?.focus({ preventScroll: true });
    }
  }, [items]);
  return <div ref={root} className={`${styles.collection} parity-ai-collection`} onFocusCapture={event => { focused.current = event.target as HTMLElement; }}>{children}</div>;
}
const kinds: Record<FoxyCreation['kind'], string> = { NOTE: 'Apuntes', PLAN: 'Planificaciones', ACTIVITY: 'Actividades', RUBRIC: 'Rúbricas', DIAGRAM: 'Esquemas', IMAGE: 'Imágenes' };
function contextName(context: FoxyConversation['context'], classrooms: Classroom[]) {
  if (context.kind === 'GENERAL') return 'General';
  const classroomId = context.classroomId;
  return classrooms.find(room => room.id === classroomId)?.name ?? 'Aula de origen no disponible';
}
function CatalogFeedback({ page, filtered, name, onRefresh }: { page: FoxyCatalogPage<unknown>; filtered: boolean; name: string; onRefresh?: () => void }) {
  return <>{page.loading ? <p role="status">Cargando {name}…</p> : null}
    {page.error ? <div role="alert"><p>{page.error}</p><button type="button" disabled={page.loading} onClick={onRefresh}>Reintentar catálogo</button></div> : null}
    {!page.loading && !page.error && !page.items.length ? <p className={`${styles.collectionEmpty} parity-ai-collectionEmpty`}>{filtered ? 'No hay resultados con estos filtros. Probá otra búsqueda o elegí Todas.' : name === 'creaciones' ? 'Todavía no tenés creaciones. Elegí una herramienta para preparar tu primer recurso.' : 'Todavía no tenés conversaciones. Empezá un nuevo chat con Foxy.'}</p> : null}</>;
}
export function FoxyConversationPanel({ page, query, classrooms, currentId, disabled, onQuery, onSelect, onMore, onRefresh, onRename, onNew }: {
  page: FoxyCatalogPage<FoxyConversation>; query: FoxyConversationQuery; classrooms: Classroom[]; currentId?: string; disabled?: boolean;
  onQuery?: (query: FoxyConversationQuery) => void; onSelect: (id: string) => void; onMore?: () => void; onRefresh?: () => void;
  onRename?:(item:FoxyConversation)=>void;onNew?:()=>void;
}) {
  return <CollectionFrame items={page.items}>
    <header className="parity-foxy-sectionHead"><h2>Conversaciones</h2>{onNew&&<button data-foxy-thread type="button" disabled={disabled} onClick={onNew}><FoxmindIcon name="plus"/>Nueva</button>}</header>
    {onQuery&&<label className="parity-foxy-search"><FoxmindIcon name="search"/><input autoFocus aria-label="Buscar conversaciones" type="search" placeholder="Buscar conversación" maxLength={120} value={query.q} onChange={event=>onQuery({...query,q:event.target.value,context:'ALL'})}/></label>}
    <CatalogFeedback page={page} filtered={Boolean(query.q)} name="conversaciones" onRefresh={onRefresh}/>
    <ul className="parity-foxy-historyList">{page.items.map(item=><li key={item.id} className={currentId===item.id?'active':undefined}>
      <button data-foxy-thread type="button" disabled={disabled} aria-current={currentId===item.id?'true':undefined} onClick={()=>onSelect(item.id)}><FoxmindIcon name="chat"/><span><strong>{item.title}</strong><small>{item.context.kind==='GENERAL'?'Ideas generales':contextName(item.context,classrooms)}</small></span></button>
      {onRename&&<button data-foxy-rename type="button" disabled={disabled} aria-label={`Renombrar ${item.title}`} onClick={()=>onRename(item)}><FoxmindIcon name="edit"/></button>}
    </li>)}</ul>
    {!!page.next&&<button type="button" disabled={page.loading||disabled} onClick={onMore}>Más conversaciones</button>}
    <p className="parity-foxy-privacy"><FoxmindIcon name="lock"/>Este espacio es privado.</p>
  </CollectionFrame>;
}
export function FoxyCollectionPanel({ page, query, onQuery, onMore, onOpen, onRefresh, onTools, disabled }: {
  page: FoxyCatalogPage<FoxyCreation>; query: FoxyCreationQuery; classrooms: Classroom[]; onQuery?: (query: FoxyCreationQuery) => void;
  onMore?: () => void; onOpen?: (item: FoxyCreation) => void; onRefresh?: () => void; onTools?:()=>void; onNavigate?: (href: string) => void; destinationHref?: FoxyDestinationHref; disabled?: boolean;
}) {
  return <CollectionFrame items={page.items}>
    <header className="parity-foxy-sectionHead"><h2>Mis creaciones</h2></header>
    <label className="parity-foxy-search"><FoxmindIcon name="search"/><input autoFocus aria-label="Buscar creaciones" type="search" placeholder="Buscar creación" maxLength={120} value={query.q} onChange={event=>onQuery?.({...query,q:event.target.value,context:'ALL',status:'ALL'})}/></label>
    <div className="parity-foxy-filterRow" aria-label="Filtrar creaciones">{([['ALL','Todas'],['NOTE','Apuntes'],['PLAN','Clases']] as const).map(([type,label])=><button key={type} type="button" aria-pressed={query.type===type} onClick={()=>onQuery?.({...query,type,context:'ALL',status:'ALL'})}>{label}</button>)}</div>
    {page.loading&&<p role="status">Cargando creaciones…</p>}{page.error&&<p role="alert">{page.error} <button type="button" onClick={onRefresh}>Reintentar catálogo</button></p>}
    <ul className="parity-foxy-creationList">{page.items.map(item=><li key={item.id}><button type="button" disabled={disabled||!onOpen} aria-label={`Abrir ${item.title}`} onClick={()=>onOpen?.(item)}><span className="parity-foxy-toolIcon sky"><FoxmindIcon name={item.kind==='PLAN'?'calendar':item.kind==='DIAGRAM'||item.kind==='IMAGE'?'layers':'book'}/></span><span><strong>{item.title}</strong><small>{kinds[item.kind]} · {item.destinations.length?'Con vínculos':'Privada'}</small></span><FoxmindIcon name="chevron-right"/></button></li>)}</ul>
    {!page.items.length&&!page.loading&&!page.error&&<div className="parity-foxy-libraryEmpty"><FoxmindIcon name="folder"/><h3>{query.q||query.type!=='ALL'?'No hay coincidencias':'Tus ideas tienen lugar'}</h3><p>{query.q||query.type!=='ALL'?'Probá otro nombre o volvé a Todas.':'Elegí una herramienta. La propuesta va a quedar acá para retomarla.'}</p>{onTools&&<button type="button" onClick={onTools}><FoxmindIcon name="spark"/>Ver herramientas</button>}</div>}
    {!!page.next&&<button type="button" disabled={page.loading} onClick={onMore}>Más creaciones</button>}
  </CollectionFrame>;
}
