import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { ClassroomView } from '../../classrooms-ui/ClassroomView';
import { AppNavbar } from '../../shared-ui/index';
import { classroomClient, id } from '../fixtures/classroom-data';

export default function ClassroomFixture() {
  const router = useRouter(), mode = String(router.query.mode ?? 'teacher');
  const api = useMemo(() => classroomClient(mode), [mode]);
  return <div className="p5-app fm3-classrooms classroom-interior-reference" data-qa-fixture="true">
    <AppNavbar displayName="Alex Sintético" logoHref="/mis-aulas" links={[
      { href: '/inicio', label: 'Inicio' }, { href: '/mis-aulas', label: 'Mis aulas', current: true },
      { href: '/agenda', label: 'Agenda' },
    ]} onNavigate={() => {}} />
    <main className="p5-main"><ClassroomView key={mode} id={id} api={api} initialCode={null} onExit={() => {}} /></main>
  </div>;
}
