import surface from '../../classrooms-ui/classrooms-surface.module.css';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Wizard } from '../../classrooms-ui/Wizard';
import { Plan } from '../../classrooms-ui/Plan';
import { ClassroomCollection } from '../../classrooms-ui/ClassroomCollection';
import type { Detail } from '../../classrooms-ui/api';
import { AppNavbar } from '../../shared-ui/index';
import { wizardFixture, type Receipt } from '../fixtures/wizard-data';

export default function Fixture() {
  const router = useRouter(), mode = String(router.query.mode ?? 'prepared');
  const receipts = useMemo<Receipt[]>(() => [], [mode]);
  const fixture = useMemo(() => wizardFixture(mode, entry => receipts.push(entry)), [mode, receipts]);
  const [ready, setReady] = useState(false), [outcome, setOutcome] = useState('');
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    (window as unknown as { wizardFixture: object }).wizardFixture = { synthetic: true, receipts, snapshot: fixture.snapshot };
    setOutcome(''); setOpened(false); setReady(true);
  }, [fixture, receipts]);
  const saved = fixture.snapshot(), payload = saved.payload;
  const room: Detail = { id: saved.publishedClassroomId ?? 'fixture-classroom', name: payload.name ?? '', subject: payload.subject ?? '',
    division: payload.division ?? '', academicYear: payload.academicYear ?? 2026, timezone: payload.timezone ?? 'UTC', coverKey: payload.coverKey ?? 'general',
    archived: false, teacher: 'Alex Sintético', role: 'teacher', revision: saved.revision, plans: [],
    units: (payload.units ?? []).map((unit, i) => ({ ...unit, id: `unit-${i}`, topics: unit.topics.map((topic, j) => ({ ...topic, id: `topic-${i}-${j}`, status: 'PENDING' })) })) };
  return <div className={`p5-app fm3-classrooms entry-wizard-reference ${surface.scope}`} data-qa-fixture="wizard-reference">
    <AppNavbar displayName="Alex Sintético" logoHref="/mis-aulas" links={[{ href: '/mis-aulas', label: 'Mis aulas', current: true }]} onNavigate={() => {}} />
    <main className="p5-main">{!ready ? null : outcome ? <><section role="status"><h1>{outcome}</h1><p>Resultado de una fixture: no se creó ni modificó un aula real.</p></section>
      {saved.publishedClassroomId ? opened ? <Plan api={fixture.api} room={room} reload={async () => {}} />
        : <ClassroomCollection accountRole="teacher" teach={[room]} study={[]} search="" onSearch={() => {}} onEnter={() => setOpened(true)} /> : null}</>
      : <Wizard key={mode} api={fixture.api} draft={fixture.initial} onExit={() => setOutcome('Salida sintética con borrador guardado')}
        onPublished={() => setOutcome('Publicación sintética completada')} />}</main>
  </div>;
}
