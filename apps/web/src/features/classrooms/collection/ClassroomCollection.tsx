import { useEffect, useRef, useState } from 'react';
import type { Classroom, Draft } from '../../../../../../src/core/contracts/classrooms.ts';
import { PendingClassroomCard } from './PendingClassroomCard.tsx';
import { ClassroomCard } from './ClassroomCollectionCard.tsx';
import { ClassroomCollectionFilters } from './ClassroomCollectionFilters.tsx';
import { filterClassroomCards, type ClassroomFilterOptions } from './collection-filter.ts';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import experience from '../styles/classroom-experience.module.css';

interface Props {
  accountRole: 'teacher' | 'student';
  initialState?: 'active' | 'pending';
  teach: Classroom[];
  study: Classroom[];
  search: string;
  onEnter: (id: string) => void;
  onSearch?: (search: string) => void;
  onCreate?: () => void;
  onJoin?: () => void;
  drafts?: Draft[];
  busy?: boolean;
  onContinue?: (id: string) => void;
  onDelete?: (draft: Draft) => void;
}

export function ClassroomCollection({ initialState = 'active', accountRole, teach, study, search, onEnter, onSearch, onCreate, onJoin, drafts = [], busy = false, onContinue, onDelete }: Props) {
  const [options, setOptions] = useState<ClassroomFilterOptions>({ state: accountRole === 'teacher' ? initialState : 'active' });
  const toggleRef = useRef<HTMLButtonElement>(null);
  const all = filterClassroomCards(teach, study, 'all', '');
  const visible = filterClassroomCards(teach, study, 'all', search, options);
  const narrowed = Boolean(search.trim());
  const pending = accountRole === 'teacher' ? drafts.filter(item => !item.publishedClassroomId) : [];
  const isPending = options.state === 'pending' && accountRole === 'teacher';
  const previousCount = useRef(pending.length);
  useEffect(() => {
    if (isPending && pending.length < previousCount.current) toggleRef.current?.focus();
    previousCount.current = pending.length;
  }, [pending.length, isPending]);
  const query = search.normalize('NFKC').toLowerCase().trim();
  const visibleDrafts = pending.filter(({ payload: p }) =>
    `${p.name || 'Aula sin nombre'} ${p.subject ?? ''} ${p.division ?? ''}`.normalize('NFKC').toLowerCase().includes(query) &&
    (!options.academicYear || String(p.academicYear) === options.academicYear) && (!options.division || p.division === options.division));
  const latestDraft = pending[0];
  const empty = isPending ? !visibleDrafts.length : !visible.length;
  const emptyKind = narrowed ? 'search' : isPending ? 'drafts' : options.state;
  const emptyCopy = emptyKind === 'search' ? ['No encontramos esa aula', 'Probá con el nombre, la materia o el grupo.']
    : emptyKind === 'drafts' ? ['Las próximas ideas tienen lugar acá', 'Guardá un aula como borrador y retomá la creación cuando quieras.']
    : emptyKind === 'archived' ? ['Todavía no hay aulas archivadas', 'Las aulas que archives van a seguir disponibles para consultar.']
    : accountRole === 'teacher' ? ['Tu primera aula empieza con una idea', 'Dale un nombre, prepará el plan e invitá a tu grupo.']
    : ['Tu próximo descubrimiento empieza acá', 'Aceptá una invitación o ingresá el código que te compartió tu docente.'];
  return <section className={`fm3-classroom-collection collection-workspace cl-catalog ${experience.catalog}`} aria-label="Tus aulas">
    {latestDraft && !isPending ? <aside className="draft-nudge"><FoxmindIcon name="edit"/><div><b>Una idea te espera: {latestDraft.payload.name || 'tu próxima aula'}</b><p>{latestDraft.payload.wizardStep === undefined ? '' : `Paso ${latestDraft.payload.wizardStep + 1} de 4 · `}Tu borrador sigue donde lo dejaste.</p></div><button type="button" className="button" disabled={busy} onClick={()=>onContinue?.(latestDraft.id)}><FoxmindIcon name="arrow-right"/>Retomar creación</button></aside> : null}
    <ClassroomCollectionFilters all={all} search={search} onSearch={onSearch} pendingCount={accountRole === 'teacher' ? pending.length : undefined}
      options={options} onOptions={setOptions} pendingTabRef={toggleRef} />
    <div className={`${isPending?'draft-grid':'class-grid'} cl-courses`}>
      {isPending ? visibleDrafts.map(item => <PendingClassroomCard key={item.id} draft={item} busy={busy}
        onContinue={id => onContinue?.(id)} onDelete={item => onDelete?.(item)} />)
        : visible.map(room => <ClassroomCard key={room.id} room={room} onEnter={onEnter} />)}
    </div>
    {empty ? <div className="collection-empty"><img src="/foxmind/classroom-world.webp" alt=""/><h3>{emptyCopy[0]}</h3><p>{emptyCopy[1]}</p>
     {emptyKind==='search'?<button type="button" className="button" onClick={()=>onSearch?.('')}>Limpiar búsqueda</button>
      :emptyKind==='archived'?<button type="button" className="button" onClick={()=>setOptions({state:'active'})}>Ver aulas activas</button>
      :<button type="button" className="button primary" disabled={busy} onClick={accountRole==='teacher'?onCreate:onJoin}><FoxmindIcon name="plus"/>{accountRole==='teacher'?'Crear aula':'Unirme con código'}</button>}
    </div> : null}
    <p className="fm3-collection-count sr-only" role="status">Mostrando {isPending ? visibleDrafts.length : visible.length} de {isPending ? pending.length : all.length} aulas{isPending ? ' pendientes' : ''}</p>
  </section>;
}
