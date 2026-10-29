import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Wizard } from '../../classrooms-ui/Wizard';
import { AppNavbar } from '../../shared-ui/index';
import { wizardFixture, type Receipt } from '../fixtures/wizard-data';

export default function Fixture() {
  const router = useRouter(), mode = String(router.query.mode ?? 'prepared');
  const receipts = useMemo<Receipt[]>(() => [], [mode]);
  const fixture = useMemo(() => wizardFixture(mode, entry => receipts.push(entry)), [mode, receipts]);
  const [ready, setReady] = useState(false), [outcome, setOutcome] = useState('');
  useEffect(() => {
    (window as unknown as { wizardFixture: object }).wizardFixture = { synthetic: true, receipts, snapshot: fixture.snapshot };
    setOutcome(''); setReady(true);
  }, [fixture, receipts]);
  return <div className="p5-app fm3-classrooms entry-wizard-reference" data-qa-fixture="wizard-reference">
    <AppNavbar displayName="Alex Sintético" logoHref="/mis-aulas" links={[{ href: '/mis-aulas', label: 'Mis aulas', current: true }]} onNavigate={() => {}} />
    <main className="p5-main">{!ready ? null : outcome ? <section role="status"><h1>{outcome}</h1><p>Resultado de una fixture: no se creó ni modificó un aula real.</p></section>
      : <Wizard key={mode} api={fixture.api} draft={fixture.initial} onExit={() => setOutcome('Salida sintética con borrador guardado')}
        onPublished={() => setOutcome('Publicación sintética completada')} />}</main>
  </div>;
}
