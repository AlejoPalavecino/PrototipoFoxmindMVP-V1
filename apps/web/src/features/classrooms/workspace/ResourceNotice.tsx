import { Notice } from '../../../../../shared-ui/feedback.tsx';
import { AsyncFeedback } from '../../../../../shared-ui/AsyncFeedback.tsx';

export function ClassroomLoading({ title = 'Estamos abriendo tu aula', compact = false }: { title?: string; compact?: boolean }) {
  return <div className={compact ? 'classroom-loading classroom-loading--compact' : 'classroom-loading'}>
    <AsyncFeedback title={title} compact={compact} showDelay />
  </div>;
}

export function ResourceNotice({ resource, loadingTitle }: { resource: { status: string; error: string; reload: () => Promise<void> }; loadingTitle?: string }) {
  if (resource.status === 'idle' || resource.status === 'loading') return <ClassroomLoading title={loadingTitle} compact />;
  if (resource.status === 'error') return <Notice error>{resource.error} <button type="button" onClick={() => void resource.reload()}>Reintentar</button></Notice>;
  return null;
}
