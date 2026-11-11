import type { Unit } from './curriculum.ts';

export interface Payload {
  name?: string;
  subject?: string;
  division?: string;
  academicYear?: number;
  timezone?: string;
  coverKey?: string;
  planFileId?: string;
  units?: Unit[];
}

export interface Draft {
  id: string;
  revision: string;
  payload: Payload;
  publishedClassroomId: string | null;
}

export interface Classroom {
  planProgress?: { taught: number; total: number };
  studentCount?: number;
  id: string;
  name: string;
  subject: string;
  division: string;
  academicYear: number;
  timezone: string;
  coverKey: string;
  archived: boolean;
  teacher: string;
  role: 'teacher' | 'student';
  revision: string;
}

export interface Detail extends Classroom {
  accessCode?:string|null;
  aiGradingEnabled?: boolean;
  aiGradingAvailable?: boolean;
  units: Unit[];
  plans: { id: string; fileId: string; version: number }[];
}

export interface Invitation {
  id: string;
  name: string;
  teacher: string;
  expiresAt: string;
  recipient?: string;
  acceptedAt?: string;
  revokedAt?: string;
  issuedAt?: string;
  deliveryStatus?: string;
  deliveryError?: string | null;
}

export interface Member {
  email?: string;
  studentId?: string;
  enrollmentId?: string;
  firstName: string;
  lastName: string;
  periods?: {
    joinedAt: string;
    endedAt: string | null;
    endReason: string | null;
  }[];
}

export type InvitationBatchRecipient =
  | { email: string; status: 'pending' | 'already_member' }
  | { email: string; status: 'created' | 'already_invited'; invitationId: string }
  | { email: string; status: 'failed'; code: 'CONFLICT' | 'ENROLLMENT_UNAVAILABLE' };

export interface InvitationBatchReceipt {
  requestId: string;
  recipients: InvitationBatchRecipient[];
}
