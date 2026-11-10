import type { Transaction } from '../application/contracts.ts';
import type { MembershipsRepository } from '../application/memberships-repository.ts';
export function createMembershipsRepository(): MembershipsRepository { return {
async readEnrollments01<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>('SELECT id FROM enrollments WHERE classroom_id=$1::uuid AND student_id=$2::uuid FOR UPDATE', ...values); },
async insertEnrollments02<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`INSERT INTO enrollments(id,updated_at,classroom_id,student_id)
        VALUES($1::uuid,clock_timestamp(),$2::uuid,$3::uuid) RETURNING id`, ...values); },
async readMembershipPeriods03<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>('SELECT id FROM membership_periods WHERE enrollment_id=$1::uuid AND ended_at IS NULL', ...values); },
async insertMembershipPeriods04<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`INSERT INTO membership_periods(id,updated_at,joined_at,enrollment_id,classroom_id,entry_method,invitation_id)
      VALUES($1::uuid,clock_timestamp(),clock_timestamp(),$2::uuid,$3::uuid,$4::"EntryMethod",$5::uuid) RETURNING id`, ...values); },
async insertBackgroundJobs05<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`INSERT INTO background_jobs(id,updated_at,type,payload,deduplication_key)
      VALUES($1::uuid,clock_timestamp(),'p5.membership',$2::jsonb,$3) RETURNING id`, ...values); },
async updateClassrooms06<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`UPDATE classrooms SET archived_at=CASE WHEN $2 THEN COALESCE(archived_at,clock_timestamp()) ELSE NULL END,
        revision=revision+1,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, ...values); },
async readEnrollments07<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`SELECT e.id,u.first_name AS "firstName",u.last_name AS "lastName"
        FROM enrollments e JOIN users u ON u.id=e.student_id WHERE e.classroom_id=$1::uuid AND e.student_id=$2::uuid`, ...values); },
async readAttempts08<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`SELECT a.id,a.activity_id AS "activityId",activity.title,a.submitted_at AS "submittedAt",a.attempt_number AS number,
        g.final_grade::text AS grade,g.is_published AS published FROM attempts a
        JOIN student_activities sa ON sa.id=a.student_activity_id JOIN activities activity ON activity.id=a.activity_id
        LEFT JOIN attempt_grades g ON g.attempt_id=a.id WHERE sa.enrollment_id=$1::uuid AND sa.classroom_id=$2::uuid
        AND a.status='SUBMITTED' ORDER BY a.submitted_at DESC,a.id`, ...values); }
}; }
