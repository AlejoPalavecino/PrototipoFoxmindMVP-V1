import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { ClassroomsApp } from '../src/application/academic-Classrooms.tsx';
import { collectionFixture, type Receipt } from '../fixtures/collection-data';

export default function Fixture() {
  const router = useRouter(), mode = String(router.query.mode ?? 'populated');
  const accountRole = router.query.role === 'student' ? 'student' : 'teacher';
  const [ready, setReady] = useState(false);
  const receipts = useMemo<Receipt[]>(() => [], [mode]);
  const api = useMemo(() => {
    const client = collectionFixture(mode, receipt => receipts.push(receipt));
    return { ...client, call: async <T,>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> => {
      const result = await client.call<T>(path, method, body, signal);
      if (method === 'GET' && path === '') return { ...(result as object), ...(accountRole === 'teacher' ? { study: [] } : { teach: [] }) } as T;
      if (method === 'GET' && ((accountRole === 'student' && path === '/drafts') || (accountRole === 'teacher' && path === '/invitations'))) return [] as T;
      return result;
    }};
  }, [mode, receipts, accountRole]);
  useEffect(() => {
    (window as unknown as { collectionFixture: object }).collectionFixture = { synthetic: true, receipts };
    setReady(true);
  }, [receipts]);
  return ready ? <div data-qa-fixture="classrooms-reference"><ClassroomsApp key={`${mode}:${accountRole}`} accountRole={accountRole} api={api} displayName="Alex Sintético"
    requestedInvitation={router.query.selected ? '11111111-1111-4111-8111-000000000030' : undefined}
    onNavigate={page => void router.push(`/mis-aulas?navigation=${page}`)} /></div> : null;
}
