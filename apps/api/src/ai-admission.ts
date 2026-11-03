import type { SqlTransaction } from '../../../src/core/domain/sql.ts';

export async function lockAiAdmission(tx: SqlTransaction): Promise<void> {
  await tx.query('SELECT 1 FROM pg_advisory_xact_lock(78123002)');
}

const queues = [
  ['classroom_curriculum_extractions', 'generation'],
  ['activity_ai_generations', 'generation'],
  ['student_ai_reports', 'standard'],
  ['grading_ai_jobs', 'standard'],
  ['foxy_turns', 'foxy-text'],
  ['foxy_visual_jobs', 'foxy-visual'],
] as const;

type OwnerPolicy = 'active' | 'generation' | 'generation-priority';

function runningOwners(policy: OwnerPolicy): string {
  return queues.filter(([, kind]) => policy !== 'generation-priority' || kind !== 'standard')
    .map(([table, kind]) => {
      // Foxy text keeps its slot until explicit recovery. The paired generation workers also
      // exclude owners with any RUNNING generation row, even if recovery skipped a locked row.
      const requiresLiveLease = kind !== 'foxy-text' && !(kind === 'generation' && policy !== 'active');
      return `SELECT owner_id FROM ${table} WHERE state='RUNNING'${requiresLiveLease ? ' AND lease_until>clock_timestamp()' : ''}`;
    }).join('\n      UNION ALL ');
}

export const activeAiOwnersSql = runningOwners('active');

/** The alias and policy are fixed by the claim query, never by a request. */
export function noAiWorkForOwner(alias: 'a' | 'j' | 'q' | 't', policy: OwnerPolicy = 'active'): string {
  const owners = policy === 'active' ? activeAiOwnersSql : runningOwners(policy);
  return `NOT EXISTS (SELECT 1 FROM (${owners}) active_ai WHERE active_ai.owner_id=${alias}.owner_id)`;
}
