import type { Submission, SubmissionDelivery } from '../model/Submission';
import { validateSubmissionDelivery } from './submissionAttachments';

export const deliverSubmission = (
  submissions: Submission[],
  studentId: number,
  delivery: SubmissionDelivery,
): Submission[] => {
  validateSubmissionDelivery(delivery);
  // Own the ordered list while retaining the actual File objects in session memory.
  const attachments = [...(delivery.attachments ?? [])];
  const attachedFile = delivery.attachments === undefined ? delivery.attachedFile : attachments[0];
  return submissions.map(sub => {
    if (sub.studentId !== studentId) return sub;
    return {
      ...sub,
      status: 'submitted',
      date: 'Hoy (Reciente)',
      content: delivery.text || 'Entrega adjunta por la estudiante en formato digital para corrección docente.',
      attachments,
      attachedFile,
    };
  });
};
