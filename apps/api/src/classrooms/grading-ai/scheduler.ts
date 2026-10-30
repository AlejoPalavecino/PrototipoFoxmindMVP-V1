type Options = { idleMs?: number; yieldMs?: number; maxJobsPerCycle?: number; cyclePauseMs?: number; onError?: () => void };

export class SerialJobScheduler {
  private stopped = true;
  private timer?: ReturnType<typeof setTimeout>;
  private active?: Promise<void>;
  private count = 0;
  private readonly runOnce: () => Promise<boolean>;
  private readonly options: Options;
  constructor(runOnce: () => Promise<boolean>, options: Options = {}) { this.runOnce = runOnce; this.options = options; }
  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.schedule(this.options.idleMs ?? 30000);
  }
  private schedule(delay: number): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.active = this.step().finally(() => { this.active = undefined; });
    }, delay);
    this.timer.unref?.();
  }
  private async step(): Promise<void> {
    let worked = false;
    try { worked = await this.runOnce(); }
    catch { try { this.options.onError?.(); } catch {} }
    if (this.stopped) return;
    if (!worked) { this.count = 0; this.schedule(this.options.idleMs ?? 30000); return; }
    this.count++;
    const pause = this.count >= (this.options.maxJobsPerCycle ?? 10);
    if (pause) this.count = 0;
    this.schedule(pause ? (this.options.cyclePauseMs ?? 25) : (this.options.yieldMs ?? 0));
  }
  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    await this.active;
  }
}
