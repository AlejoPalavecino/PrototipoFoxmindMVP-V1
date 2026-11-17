import { AccountMailService } from '../modules/identity/mail-delivery/infrastructure/mail/account-mail.service.ts';
import { runOnce, type AccountMailSender } from '../modules/identity/mail-delivery/infrastructure/outbox/worker.ts';
import type { IdentityRuntimeConfiguration } from './identity-configuration.ts';
import type { IdentityStore } from '../modules/identity/accounts/infrastructure/persistence.ts';

/** A single bounded, nonoverlapping C invocation. No SMTP or decryption in request transactions. */
export class IdentityMailLifecycle {
  private readonly sender: AccountMailService;
  private timer?: ReturnType<typeof setTimeout>;
  private inFlight?: Promise<void>;
  private readonly sends = new Set<Promise<unknown>>();
  private stopped = false;
  private shutdown?: Promise<void>;
  constructor(private readonly config: IdentityRuntimeConfiguration, private readonly store: IdentityStore) {
    this.sender = new AccountMailService(config.mail);
  }
  start(): void {
    if (!this.stopped && !this.timer && !this.inFlight) this.schedule(0);
  }
  private schedule(delay: number): void {
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.inFlight = this.tick().finally(() => {
        this.inFlight = undefined;
        if (!this.stopped) this.schedule(250);
      });
    }, delay);
    this.timer.unref();
  }
  private async deadline(operation: Promise<{ readonly status: 'accepted' }>) {
    this.sends.add(operation);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([operation, new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          // Terminal for this lifecycle: destroy owned connecting/active sockets
          // BEFORE rejecting, so runOnce cannot retry while SMTP is still live.
          this.stopped = true;
          this.sender.cancelPending();
          reject(new Error('Account mail unavailable.'));
        }, 12000);
      })]);
    } finally {
      if (timer) clearTimeout(timer);
      void operation.then(() => this.sends.delete(operation), () => this.sends.delete(operation));
    }
  }
  private async tick(): Promise<void> {
    const bounded: AccountMailSender = {
      sendVerification: input => this.deadline(this.sender.sendVerification(input)),
      sendRecovery: input => this.deadline(this.sender.sendRecovery(input)),
    };
    try { await runOnce(this.store.database, this.config.outbox, bounded, { leaseMs: 30000 }); }
    catch { /* Fail closed in C. No raw errors, plaintext fallback or unbounded immediate retry. */ }
  }
  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) { clearTimeout(this.timer); this.timer = undefined; }
    await this.inFlight;
    await Promise.allSettled([...this.sends]);
  }
  close(): Promise<void> {
    return this.shutdown ??= (async () => { await this.stop(); await this.sender.close(); })();
  }
}
