import type { SubmissionDelivery } from '../model/Submission';
import { validateSubmissionDelivery } from './submissionAttachments';

type DeliveryStatus = 'draft' | 'pending' | 'submitted';
type DeliveryResult = { status: 'submitted' | 'ignored' } | { status: 'error'; message: string };
export type SubmissionDeliveryCallback = (delivery: SubmissionDelivery) => void | Promise<void>;

// The synchronous gate protects against repeated events before React can render disabled controls.
export function createSubmissionDeliveryState() {
  let status: DeliveryStatus = 'draft';
  let generation = 0;
  let live = true;
  const captureLifetime = () => {
    const capturedGeneration = generation;
    return () => live && generation === capturedGeneration;
  };
  return {
    get status() { return status; },
    activate() { generation++; live = true; },
    invalidate() { generation++; live = false; },
    captureLifetime,
    edit() {
      if (status === 'pending') return false;
      status = 'draft';
      return true;
    },
    async deliver(
      draft: SubmissionDelivery,
      callback?: SubmissionDeliveryCallback,
      onPendingChange: (pending: boolean) => void = () => {},
    ): Promise<DeliveryResult> {
      const isCurrent = captureLifetime();
      if (!isCurrent() || status !== 'draft') return { status: 'ignored' };
      try {
        validateSubmissionDelivery(draft);
      } catch (error) {
        return { status: 'error', message: (error as Error).message };
      }
      if (!callback) return { status: 'error', message: 'La entrega no está disponible. Tu borrador se conserva.' };
      status = 'pending';
      onPendingChange(true);
      try {
        await callback(draft);
        status = 'submitted';
        return { status: isCurrent() ? 'submitted' : 'ignored' };
      } catch {
        status = 'draft';
        return isCurrent()
          ? { status: 'error', message: 'No se pudo confirmar la entrega. Tu borrador se conserva; vuelve a intentarlo.' }
          : { status: 'ignored' };
      } finally {
        if (isCurrent()) onPendingChange(false);
      }
    },
  };
}
