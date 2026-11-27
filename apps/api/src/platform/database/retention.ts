/**
 * Data retention, first slice of S8 (decided 2026-11-26). Each rule removes rows that no longer do anything:
 * nothing references these tables by foreign key, and rows still in force (live sessions, unread notifications,
 * running work) never match. Conversations, academic history and account deletion are outside this slice.
 * See docs/engineering/data-model.md#retención-y-códigos-de-aula.
 */
export interface RetentionRule { readonly table: string; readonly expired: string }

export const retentionRules: readonly RetentionRule[] = Object.freeze([
  // Credentials: 30 days after they stopped working (expired, revoked, consumed or invalidated).
  { table: 'sessions', expired: `least(coalesce(revoked_at,'infinity'),expires_at) < clock_timestamp() - interval '30 days'` },
  { table: 'account_tokens', expired: `least(coalesce(consumed_at,'infinity'),coalesce(invalidated_at,'infinity'),expires_at)
    < clock_timestamp() - interval '30 days'` },
  // Read notifications after 180 days; unread ones stay.
  { table: 'notifications', expired: `read_at < clock_timestamp() - interval '180 days'` },
  // Finished AI work and its idempotency records after 90 days. Monthly reservations keep the billing trail.
  { table: 'study_ai_dispatches', expired: `state IN ('DONE','FAILED') AND created_at < clock_timestamp() - interval '90 days'` },
  { table: 'background_jobs', expired: `status IN ('COMPLETED','FAILED')
    AND coalesce(completed_at,updated_at) < clock_timestamp() - interval '90 days'` },
  ...['foxy_conversation_requests', 'foxy_resource_requests', 'foxy_publication_confirm_requests',
    'foxy_publication_command_requests', 'foxy_private_asset_commands']
    .map(table => ({ table, expired: `created_at < clock_timestamp() - interval '90 days'` })),
  // Daily AI counters after 13 months, like the monthly billing trail.
  { table: 'ai_usage_daily', expired: `day < (clock_timestamp() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date - interval '13 months'` },
]);

type Query = (sql: string, ...values: unknown[]) => Promise<unknown[]>;

/** Deletes at most `limit` rows per table, skipping rows another transaction holds. Returns the count per table. */
export async function purgeRetainedRows(query: Query, limit: number): Promise<Record<string, number>> {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('INVALID_RETENTION_LIMIT');
  const result: Record<string, number> = {};
  for (const rule of retentionRules) {
    const rows = await query(`DELETE FROM ${rule.table} WHERE ctid IN (SELECT ctid FROM ${rule.table}
      WHERE ${rule.expired} LIMIT $1::int FOR UPDATE SKIP LOCKED) RETURNING 1`, limit);
    result[rule.table] = rows.length;
  }
  return result;
}
