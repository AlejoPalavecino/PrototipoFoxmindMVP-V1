export type FoxyDestinationHref = (target: { kind: 'material'; classroomId: string; materialId: string } | { kind: 'activity'; classroomId: string; activityId: string }) => string;
import type { FoxyConversation, FoxyCreation } from '../api/foxy-client';
import { useEffect, useRef, type ReactNode } from 'react';
import styles from './foxy-workspace.module.css';

import type { FoxyConversationQuery, FoxyCreationQuery } from '../model/foxy-catalog-controller';
export type { FoxyCatalogState, FoxyConversationQuery, FoxyCreationQuery } from '../model/foxy-catalog-controller';
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
  return <div ref={root} className={styles.collection} onFocusCapture={event => { focused.current = event.target as HTMLElement; }}>{children}</div>;
}
const kinds: Record<FoxyCreation['kind'], string> = { NOTE: 'Apuntes', PLAN: 'Planificaciones', ACTIVITY: 'Actividades', RUBRIC: 'Rúbricas', DIAGRAM: 'Esquemas', IMAGE: 'Imágenes' };
const statuses = { PRIVATE: 'Privado · sin asignar', PREPARING: 'En preparación', DRAFT: 'Borrador de actividad', PUBLISHED: 'Publicado o asignado' };
function contextName(context: FoxyConversation['context'], classrooms: Classroom[]) {
  if (context.kind === 'GENERAL') return 'General';
  const classroomId = context.classroomId;
  return classrooms.find(room => room.id === classroomId)?.name ?? 'Aula de origen no disponible';
}
function ContextFilters({ classrooms, value, onChange }: { classrooms: Classroom[]; value: string; onChange: (value: string) => void }) {
  return <div className={styles.filterChips} role="group" aria-label="Filtrar por contexto">{[{ id: 'ALL', name: 'Todas' }, { id: 'GENERAL', name: 'General' }, ...classrooms].map(room =>
    <button type="button" key={room.id} aria-pressed={value === room.id} onClick={() => onChange(room.id)}>{room.name}</button>)}</div>;
}
function CatalogFeedback({ page, filtered, name, onRefresh }: { page: FoxyCatalogPage<unknown>; filtered: boolean; name: string; onRefresh?: () => void }) {
  return <>{page.loading ? <p role="status">Cargando {name}…</p> : null}
    {page.error ? <div role="alert"><p>{page.error}</p><button type="button" disabled={page.loading} onClick={onRefresh}>Reintentar catálogo</button></div> : null}
    {!page.loading && !page.error && !page.items.length ? <p className={styles.collectionEmpty}>{filtered ? 'No hay resultados con estos filtros. Probá otra búsqueda o elegí Todas.' : name === 'creaciones' ? 'Todavía no tenés creaciones. Elegí una herramienta para preparar tu primer recurso.' : 'Todavía no tenés conversaciones. Empezá un nuevo chat con Foxy.'}</p> : null}</>;
}
export function FoxyConversationPanel({ page, query, classrooms, currentId, disabled, onQuery, onSelect, onMore, onRefresh }: {
  page: FoxyCatalogPage<FoxyConversation>; query: FoxyConversationQuery; classrooms: Classroom[]; currentId?: string; disabled?: boolean;
  onQuery?: (query: FoxyConversationQuery) => void; onSelect: (id: string) => void; onMore?: () => void; onRefresh?: () => void;
}) {
  return <CollectionFrame items={page.items}>
    {onQuery ? <><label className={styles.search}>Buscar conversaciones<input type="search" maxLength={120} value={query.q} onChange={event => onQuery({ ...query, q: event.target.value })} /></label>
      <ContextFilters classrooms={classrooms} value={query.context} onChange={context => onQuery({ ...query, context })} /></> : null}
    <CatalogFeedback page={page} filtered={Boolean(query.q || query.context !== 'ALL')} name="conversaciones" onRefresh={onRefresh} />
    <ul className={styles.collectionList}>{page.items.map(item => <li key={item.id}><button type="button" disabled={disabled} aria-current={currentId === item.id ? 'true' : undefined} onClick={() => onSelect(item.id)}>{item.title}<small>{contextName(item.context, classrooms)}</small></button></li>)}</ul>
    {page.next ? <button type="button" disabled={page.loading || disabled} onClick={onMore}>Más conversaciones</button> : null}
  </CollectionFrame>;
}
export function FoxyCollectionPanel({ page, query, classrooms, onQuery, onMore, onOpen, onRefresh, onNavigate, destinationHref, disabled }: {
  page: FoxyCatalogPage<FoxyCreation>; query: FoxyCreationQuery; classrooms: Classroom[]; onQuery?: (query: FoxyCreationQuery) => void;
  onMore?: () => void; onOpen?: (item: FoxyCreation) => void; onRefresh?: () => void; onNavigate?: (href: string) => void; destinationHref?: FoxyDestinationHref; disabled?: boolean;
}) {
  return <CollectionFrame items={page.items}>
    <label className={styles.search}>Buscar creaciones<input type="search" maxLength={120} value={query.q} onChange={event => onQuery?.({ ...query, q: event.target.value })} /></label>
    <div className={styles.filterChips} role="group" aria-label="Filtrar por tipo">{([['ALL', 'Todos los tipos'], ...Object.entries(kinds)] as [FoxyCreationQuery['type'], string][]).map(([type, label]) => <button type="button" key={type} aria-pressed={query.type === type} onClick={() => onQuery?.({ ...query, type })}>{label}</button>)}</div>
    <ContextFilters classrooms={classrooms} value={query.context} onChange={context => onQuery?.({ ...query, context })} />
    <div className={styles.filterChips} role="group" aria-label="Filtrar por estado">{([['ALL', 'Todos los estados'], ...Object.entries(statuses)] as [FoxyCreationQuery['status'], string][]).map(([status, label]) => <button type="button" key={status} aria-pressed={query.status === status} onClick={() => onQuery?.({ ...query, status })}>{label}</button>)}</div>
    <CatalogFeedback page={page} filtered={Boolean(query.q || query.context !== 'ALL' || query.type !== 'ALL' || query.status !== 'ALL')} name="creaciones" onRefresh={onRefresh} />
    <ul className={styles.collectionList}>{page.items.map(item => <li className={styles.creationItem} key={item.id}>
      <button type="button" disabled={disabled || !onOpen} aria-label={`Abrir ${item.title}`} onClick={() => onOpen?.(item)}><strong>{item.title}</strong><small>{kinds[item.kind]} · {statuses[item.status]}</small></button>
      <p>Origen: {contextName(item.context, classrooms)}</p>
      {item.destinations.length ? <ul aria-label="Destinos efectivos">{item.destinations.map((destination, i) => <li key={i}>{destination.classroomName} · {destination.kind === 'MATERIAL' ? 'Biblioteca' : 'Actividad'} · {destination.state === 'PUBLISHED' ? destination.kind === 'MATERIAL' ? 'Publicado' : 'Asignada' : destination.state === 'DRAFT' ? 'Borrador privado' : 'En preparación'}
        {destination.id && destination.state !== 'PREPARING' && onNavigate && destinationHref ? <button type="button" disabled={disabled} onClick={() => onNavigate(destinationHref(destination.kind === 'MATERIAL' ? { kind: 'material', classroomId: destination.classroomId, materialId: destination.id! } : { kind: 'activity', classroomId: destination.classroomId, activityId: destination.id! }))}>{destination.state === 'DRAFT' ? 'Abrir borrador' : destination.kind === 'MATERIAL' ? 'Abrir en Biblioteca' : 'Ver actividad'}</button> : null}
      </li>)}</ul> : <p>Sin destinos · privado</p>}
    </li>)}</ul>
    {page.next ? <button type="button" disabled={page.loading} onClick={onMore}>Más creaciones</button> : null}
  </CollectionFrame>;
}
