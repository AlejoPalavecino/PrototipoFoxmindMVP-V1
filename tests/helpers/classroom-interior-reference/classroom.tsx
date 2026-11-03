import surface from '../../classrooms-ui/classrooms-surface.module.css';
import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { ClassroomView } from '../../classrooms-ui/ClassroomView';
import { AppNavbar } from '../../shared-ui/index';
import { classroomClient, id } from '../fixtures/classroom-data';
import { literatureClient } from '../fixtures/literature-data';

export default function ClassroomFixture() {
  const router = useRouter(), mode = String(router.query.mode ?? 'teacher');
  const api = useMemo(() => mode === 'literature' ? literatureClient() : classroomClient(mode), [mode]);
  return <div className={`p5-app fm3-classrooms classroom-interior-reference ${surface.scope}`} data-qa-fixture="true">
    <AppNavbar displayName="Alex Sintético" logoHref="/mis-aulas" links={[
      { href: '/inicio', label: 'Inicio' }, { href: '/mis-aulas', label: 'Mis aulas', current: true },
      { href: '/agenda', label: 'Agenda' },
    ]} onNavigate={() => {}} />
    <main className="p5-main"><ClassroomView key={mode} id={id} api={api} initialCode={mode === 'literature' ? 'LIT-DM26' : null} onExit={() => {}} /></main>
  </div>;
}
