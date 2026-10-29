import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { ClassroomsApp } from '../../classrooms-ui/Classrooms';
import { collectionFixture, type Receipt } from '../fixtures/collection-data';

export default function Fixture() {
  const router = useRouter(), mode = String(router.query.mode ?? 'populated');
  const [ready, setReady] = useState(false);
  const receipts = useMemo<Receipt[]>(() => [], [mode]);
  const api = useMemo(() => collectionFixture(mode, receipt => receipts.push(receipt)), [mode, receipts]);
  useEffect(() => {
    (window as unknown as { collectionFixture: object }).collectionFixture = { synthetic: true, receipts };
    setReady(true);
  }, [receipts]);
  return ready ? <div data-qa-fixture="classrooms-reference"><ClassroomsApp key={mode} api={api} displayName="Alex Sintético"
    requestedInvitation={router.query.selected ? '11111111-1111-4111-8111-000000000030' : undefined}
    onNavigate={page => void router.push(`/mis-aulas?navigation=${page}`)} /></div> : null;
}
