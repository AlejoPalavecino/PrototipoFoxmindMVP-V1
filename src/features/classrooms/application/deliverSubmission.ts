import type { Submission, SubmissionDelivery } from '../model/Submission';

// The UI owns blank-delivery validation; this preserves the existing mapping and defaults.
export const deliverSubmission = (
  submissions: Submission[],
  studentId: number,
  delivery: SubmissionDelivery,
): Submission[] => submissions.map(sub => {
  if (sub.studentId !== studentId) return sub;
  return {
    ...sub,
    status: 'submitted',
    date: 'Hoy (Reciente)',
    content: delivery.text || 'Entrega adjunta por la estudiante en formato digital para corrección docente.',
    attachedFile: delivery.attachedFile || {
      name: 'Ensayo_Vanguardias_Sofia.pdf',
      size: '1.4 MB',
      type: 'PDF',
    },
  };
});
