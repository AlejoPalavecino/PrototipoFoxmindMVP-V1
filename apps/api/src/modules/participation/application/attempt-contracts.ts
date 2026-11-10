export interface Obligation {
  id: string; is_expected: boolean; eligibility_reason: string; eligible_at: Date | null;
  first_submission_deadline_at: Date | null;
}
export interface AttemptRow {
  id: string; activity_id: string; student_activity_id: string; attempt_number: number;
  status: 'DRAFT' | 'SUBMITTED'; opened_at: Date; submitted_at: Date | null;
  individual_deadline_at: Date | null; applied_deadline_at: Date | null; submitted_late: boolean | null;
  editor_token_hash: string | null; editor_epoch: bigint; revision: bigint;
  practical_response: string;
}
