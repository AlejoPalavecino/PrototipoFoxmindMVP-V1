import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { ClassroomCodePreview } from '../../../../../../src/core/contracts/classrooms.ts';

export interface EnrollmentOperations {
  previewCode(code: string): Promise<ClassroomCodePreview>;
  confirmCode(confirmation: string): Promise<{ id: string }>;
  respondInvitation(id: string, decision: 'accept' | 'decline'): Promise<unknown>;
}
export function createEnrollmentOperations(transport: Pick<ClassroomClient, 'call'>): EnrollmentOperations {
  return {
    previewCode: code => transport.call('/codes/preview', 'POST', {
      code: /^\d{6}$/.test(code.replace(/\s/g, '')) ? code.replace(/\s/g, '') : code.trim(),
    }),
    confirmCode: confirmation => transport.call('/codes/confirm', 'POST', { confirmation }),
    respondInvitation: (id, decision) => transport.call(`/invitations/${id}/${decision}`, 'POST', {}),
  };
}
