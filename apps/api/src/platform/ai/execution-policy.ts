import type { AiConfiguration } from './configuration.ts';
import type { SqlDatabase } from '../../../../../src/core/contracts/sql.ts';
import type { AiExecutionSnapshot, AiExecutionTask } from '../../../../../src/core/contracts/ai-execution.ts';
import { configuredExecutionProfiles, defaultExecutionSnapshot, parseExecutionSnapshot } from './execution-snapshot.ts';
import { aiTasks, executionFailure } from './text-profiles.ts';

/** Runs before workers start. No provider calls and no credentials in persisted policy. */
export async function initializeAiExecutionPolicy(database: SqlDatabase, configuration: AiConfiguration): Promise<void> {
  const baseline = Object.fromEntries(aiTasks.map(task => [task, defaultExecutionSnapshot(configuration, task)]));
  const active = configuredExecutionProfiles(configuration);
  const stored = await database.$transaction(async raw => {
    const query = <T>(sql: string, ...values: unknown[]) => raw.$queryRawUnsafe<T[]>(sql, ...values);
    await query('SELECT 1 FROM pg_advisory_xact_lock(78123003)');
    const [existing] = await query<{ baseline_profiles: Record<AiExecutionTask, AiExecutionSnapshot> }>('SELECT baseline_profiles FROM ai_execution_policy WHERE singleton FOR UPDATE');
    const profiles = existing?.baseline_profiles ?? baseline;
    for (const task of aiTasks) parseExecutionSnapshot(profiles[task], task);
    const [pending] = await query<{ pending: boolean }>('SELECT foxmind_ai_legacy_pending() AS pending');
    // Missing historical metadata cannot be inferred from a newly edited .env.
    // Drain those jobs with the existing deployment before the first V2 start.
    if (pending?.pending && !existing) throw executionFailure('AI_LEGACY_PENDING');
    if (pending?.pending) {
      const canonical = (p: unknown) => JSON.stringify(Object.entries(p as object).sort(([a], [b]) => a.localeCompare(b)));
      if (aiTasks.some(task => canonical(profiles[task]) !== canonical(active[task]))) throw executionFailure('AI_LEGACY_PENDING');
    }
    await query(`INSERT INTO ai_execution_policy(singleton,baseline_profiles,active_profiles) VALUES(true,$1::jsonb,$2::jsonb)
      ON CONFLICT(singleton) DO UPDATE SET active_profiles=EXCLUDED.active_profiles,updated_at=clock_timestamp() RETURNING singleton`, JSON.stringify(profiles), JSON.stringify(active));
    return profiles;
  }, { maxWait: 2000, timeout: 6000 });
  configuration.legacyExecutionProfiles ??= {};
  Object.assign(configuration.legacyExecutionProfiles, stored);
}
