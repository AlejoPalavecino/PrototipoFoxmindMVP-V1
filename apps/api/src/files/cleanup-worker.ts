export interface IncompleteCleanup { cleanup(limit?: number): Promise<{ deleted: number; failed: number }> }
export class FileCleanupWorker {
  readonly service: IncompleteCleanup;
  readonly intervalMs: number;
  readonly onFailure: () => void;
  private stopped = true;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running: Promise<void> | undefined;
  constructor(service: IncompleteCleanup, intervalMs = 60000,
    onFailure: () => void = () => console.warn('P4 incomplete upload cleanup unavailable')) {
    if (!Number.isSafeInteger(intervalMs) || intervalMs < 1000 || intervalMs > 3600000) throw new Error('Invalid P4 cleanup interval');
    this.service = service; this.intervalMs = intervalMs; this.onFailure = onFailure;
  }
  onModuleInit(): void {
    if (!this.stopped) return;
    this.stopped = false; this.running = this.sweep();
  }
  private report(): void { try { this.onFailure(); } catch { /* Observability must not stop the cleanup lifecycle. */ } }
  private async sweep(): Promise<void> {
    try { if ((await this.service.cleanup(100)).failed > 0) this.report(); }
    catch { this.report(); }
    finally {
      if (!this.stopped) {
        this.timer = setTimeout(() => { this.running = this.sweep(); }, this.intervalMs);
        this.timer.unref?.();
      }
    }
  }
  async onModuleDestroy(): Promise<void> {
    this.stopped = true; clearTimeout(this.timer); await this.running;
  }
}
