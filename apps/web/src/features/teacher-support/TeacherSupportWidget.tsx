'use client';
import { useEffect, useId, useState } from 'react';
import type { TeacherSupportEntry, TeacherSupportList } from '../../../../../src/core/contracts/teacher-support.ts';
import { Cover, initials } from '../../../../shared-ui/academic-cover.tsx';
import { Dialog, Notice } from '../../../../shared-ui/feedback.tsx';
import { FoxmindIcon } from '../../../../shared-ui/FoxmindIcon.tsx';
import { TeacherSupportDialog } from './TeacherSupportDialog.tsx';
import { priorityLabels, priorities, priorityTone, supportReason, SupportPriority } from './SupportPriority.tsx';
import { supportAccessEnded, type TeacherSupportReader } from './model.ts';
import styles from './teacher-support.module.css';

type Classroom = TeacherSupportList['classrooms'][number];
const preview = 3;

export function TeacherSupportWidget({ client }: { client: TeacherSupportReader }) {
  const title = useId(), list = useId();
  const [rooms,setRooms] = useState<Classroom[]>([]);
  const [room,setRoom] = useState<string|null>(null);
  const [picker,setPicker] = useState(false);
  const [picked,setPicked] = useState<TeacherSupportEntry|null>(null);
  const [expanded,setExpanded] = useState(false);
  const [page,setPage] = useState(1);
  const [revision,setRevision] = useState(0);
  const [snapshot,setSnapshot] = useState<TeacherSupportList|null>(null);
  const [loading,setLoading] = useState(true);
  const [failed,setFailed] = useState(false);
  const [denied,setDenied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    setDenied(false);
    void client.list(room,page,controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setRooms(result.classrooms);
      setSnapshot(previous => {
        if (page === 1 || !previous) return result;
        const keys = new Set(previous.items.map(item => `${item.classroomId}:${item.studentId}`));
        return {...result, items: [...previous.items, ...result.items.filter(item => !keys.has(`${item.classroomId}:${item.studentId}`))]};
      });
    }).catch(error => {
      if (controller.signal.aborted) return;
      const unavailable = supportAccessEnded(error);
      setDenied(unavailable);
      setFailed(!unavailable);
      if (unavailable) {
        setSnapshot(null);
        setRooms([]);
      }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  },[client,page,revision,room]);

  function chooseRoom(target: string | null) {
    setPicker(false);
    if (target === room) return;
    setSnapshot(null);
    setLoading(true);
    setPage(1);
    setExpanded(false);
    setRoom(target);
  }
  function revalidate() {
    setSnapshot(null);
    setPage(1);
    setRevision(value => value + 1);
  }

  const rows = snapshot?.items.filter(item => item.priority !== 'insufficient') ?? [];
  const visible = expanded ? rows : rows.slice(0,preview);
  const total = snapshot?.total ?? 0;
  const hasMore = !!snapshot && snapshot.page * snapshot.pageSize < total;
  const roomName = rooms.find(candidate => candidate.id === room)?.name ?? 'Todas mis aulas';

  return <section className={styles.widget} aria-labelledby={title}>
    <header className={styles.heading}>
      <h2 className={styles.title} id={title}><span className={styles.icon}><FoxmindIcon name="progress"/></span>Semáforo de acompañamiento</h2>
      <button type="button" className={`button ${styles.filter}`} aria-label="Filtrar por aula" aria-haspopup="dialog" onClick={() => setPicker(true)}>
        <FoxmindIcon name="filter"/><span>{roomName}</span><FoxmindIcon name="chevron-down"/>
      </button>
    </header>
    {total > 0 && snapshot ? <div className={styles.counts} role="group" aria-label="Prioridad por inscripción">
      {priorities.map(priority => <div key={priority} className={priorityTone(priority)}>
        <i aria-hidden="true"/><span>{priorityLabels[priority]}</span><strong>{snapshot.counts[priority]}</strong>
      </div>)}
    </div> : null}
    <div id={list} aria-busy={loading} className={styles.list}>
      {visible.map(student => <article key={`${student.classroomId}:${student.studentId}`} className={styles.row}>
        <span className={styles.avatar} aria-hidden="true">{initials(student.firstName,student.lastName)}</span>
        <div className={styles.copy}><strong>{student.firstName} {student.lastName}</strong><span className={styles.classroomLabel}>{student.classroomName}</span><p>{supportReason(student)}</p></div>
        <SupportPriority value={student.priority}/>
        <button type="button" className={`button ${styles.button}`} aria-label={`Ver ficha de ${student.firstName} ${student.lastName} en ${student.classroomName}`} onClick={() => setPicked(student)}>
          Ver ficha <FoxmindIcon name="chevron-right"/>
        </button>
      </article>)}
      {loading ? <p role="status" className={styles.empty}>Cargando el seguimiento…</p> : null}
      {!loading && !visible.length && !denied && !failed ? <p role="status" className={styles.empty}>Todavía no hay estudiantes con prioridad asignada para esta selección.</p> : null}
      {denied ? <Notice error>Este seguimiento ya no está disponible. <button type="button" onClick={() => { chooseRoom(null); revalidate(); }}>Actualizar</button></Notice> : null}
      {failed ? <Notice error>No pudimos cargar el seguimiento. <button type="button" onClick={() => setRevision(value => value + 1)}>Reintentar</button></Notice> : null}
    </div>
    {total > preview ? <footer className={styles.footer}>
      <span>{visible.length} de {total} inscripciones</span>
      <button type="button" className="button primary" aria-expanded={expanded} aria-controls={list} onClick={() => setExpanded(value => !value)}>
        {expanded ? 'Mostrar menos' : 'Ver todos'} <FoxmindIcon name={expanded ? 'arrow-left' : 'arrow-right'}/>
      </button>
      {expanded && hasMore ? <button type="button" className="button" disabled={loading || failed} onClick={() => setPage(value => value + 1)}>Cargar más</button> : null}
    </footer> : null}
    {picker ? <SupportPicker rooms={rooms} selected={room} onSelect={chooseRoom} onClose={() => setPicker(false)}/> : null}
    {picked ? <TeacherSupportDialog student={{...picked,division:rooms.find(candidate=>candidate.id===picked.classroomId)?.division}} client={client} onClose={() => setPicked(null)} onRevoked={revalidate}/> : null}
  </section>;
}

function SupportPicker({ rooms, selected, onSelect, onClose }: {
  rooms: Classroom[]; selected: string | null; onSelect: (id: string|null)=>void; onClose: ()=>void;
}) {
  return <Dialog title="Filtrar por aula" onClose={onClose} className={styles.picker}>
    <div className={styles.choices}>
      <button type="button" aria-pressed={selected === null} onClick={() => onSelect(null)}>
        <span className={styles.icon}><FoxmindIcon name="filter"/></span>
        <span><strong>Todas mis aulas</strong><small>{rooms.length} {rooms.length === 1 ? 'aula activa' : 'aulas activas'}</small></span>
        <i aria-hidden="true">{selected === null ? <FoxmindIcon name="check"/> : null}</i>
      </button>
      {rooms.map(room => <button type="button" key={room.id} aria-pressed={selected === room.id} onClick={() => onSelect(room.id)}>
        <span className={styles.cover}><Cover kind={room.coverKey}/></span><span><strong>{room.name}</strong><small>{room.division}</small></span>
        <i aria-hidden="true">{selected === room.id ? <FoxmindIcon name="check"/> : null}</i>
      </button>)}
    </div>
  </Dialog>;
}
