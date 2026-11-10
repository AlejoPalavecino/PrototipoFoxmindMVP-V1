import { Notice } from '../../../../../shared-ui/feedback.tsx';
export function ResourceNotice({ resource }: { resource: { status: string; error: string; reload: () => Promise<void> } }) {
  if (resource.status === 'loading') return <Notice>Cargando…</Notice>;
  if (resource.status === 'error') return <Notice error>{resource.error} <button onClick={() => void resource.reload()}>Reintentar</button></Notice>;
  return null;
}
