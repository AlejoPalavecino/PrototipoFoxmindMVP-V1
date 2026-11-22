import type { IdentityStore } from '../modules/identity/accounts/infrastructure/persistence.ts';

const DAY_SECONDS = 86400;
const BATCH = 1000;
const MAX_BATCHES = 5;

/** Periodic, nonoverlapping, bounded retention for account_action_controls. Never blocks requests or shutdown. */
export class IdentityControlsPurge {
  private timer?: ReturnType<typeof setInterval>;
  private inFlight?: Promise<void>;
  private stopped = false;
  constructor(private readonly store: Pick<IdentityStore, 'purgeExpiredControls'>,
    private readonly security: { readonly rateLimits?: unknown },
    private readonly options: { readonly intervalMs?: number } = {}) {}
  /** Rows are kept for 24 h after the longest configured window or cooldown could have ended. */
  retentionSeconds(): number {
    let longest = 0;
    for (const rule of Object.values((this.security.rateLimits ?? {}) as Record<string, Record<string, unknown>>)) {
      for (const value of Object.values(rule)) {
        if (typeof value === 'number') longest = Math.max(longest, value);
        else if (value && typeof value === 'object') longest = Math.max(longest, Number((value as { windowSeconds?: number }).windowSeconds) || 0);
      }
    }
    return DAY_SECONDS + longest;
  }
  start(): void {
    if (this.stopped || this.timer) return;
    this.timer = setInterval(() => {
      if (this.inFlight) return;
      this.inFlight = this.run().finally(() => { this.inFlight = undefined; });
    }, this.options.intervalMs ?? 600000);
    this.timer.unref();
  }
  private async run(): Promise<void> {
    try {
      const retention = this.retentionSeconds();
      for (let batch = 0; batch < MAX_BATCHES && !this.stopped; batch++) {
        if (await this.store.purgeExpiredControls(retention, BATCH) < BATCH) return;
      }
    } catch { /* Retention is best effort; never surface driver errors or crash the host. */ }
  }
  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) { clearInterval(this.timer); this.timer = undefined; }
    await this.inFlight;
  }
}
