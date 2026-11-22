import { randomUUID } from 'node:crypto';
import { IdentityRuntime as ApplicationRuntime, type IdentityRuntimePorts } from '../modules/identity/accounts/application/runtime.ts';
import { IdentityMailLifecycle } from './identity-mail-lifecycle.ts';
import { IdentityControlsPurge } from './identity-controls-purge.ts';
import { createIdentityStoreAdapter } from '../modules/identity/accounts/infrastructure/store-adapter.ts';
import type { IdentityStore } from '../modules/identity/accounts/infrastructure/persistence.ts';
import type { IdentityRuntimeConfiguration } from './identity-configuration.ts';
import { enqueueAccountMail, cancelAccountMailForToken } from '../modules/identity/mail-delivery/infrastructure/outbox/repository.ts';
import { generateVerifier, sessionTokenDigest, accountTokenDigest } from '../modules/identity/accounts/infrastructure/security/verifiers.ts';
import type { PasswordService } from '../modules/identity/accounts/infrastructure/security/passwords.ts';
import { validateMailbox } from '../modules/identity/mail-delivery/infrastructure/mail/mailbox.ts';

/** Compatibility constructor and explicit host composition; all account decisions live in application. */
export class IdentityRuntime extends ApplicationRuntime {
  private readonly mail: IdentityMailLifecycle;
  private readonly purge: IdentityControlsPurge;
  constructor(readonly configuration: IdentityRuntimeConfiguration, store: IdentityStore,
    passwords: PasswordService, ports: IdentityRuntimePorts = {}) {
    const adapter = createIdentityStoreAdapter(store);
    super(configuration, adapter.store, passwords, {
      tokens: { randomUUID, generateVerifier, sessionTokenDigest, accountTokenDigest },
      validateMailbox,
      mailOutbox: {
        async enqueue(tx, input) { await enqueueAccountMail(adapter.transactionOf(tx), configuration.outbox, input); },
        async cancel(tx, tokenId) { await cancelAccountMailForToken(adapter.transactionOf(tx), tokenId); },
      },
    }, ports);
    this.mail = new IdentityMailLifecycle(configuration, store);
    this.purge = new IdentityControlsPurge(store, configuration.security);
  }
  onApplicationBootstrap(): void { this.mail.start(); this.purge.start(); }
  stopMail(): Promise<void> { return this.mail.stop(); }
  shutdownMail(): Promise<void> { return this.mail.close(); }
  async onModuleDestroy(): Promise<void> { await this.purge.stop(); await this.shutdownMail(); }
}
export { publicUser, type IdentityRuntimePorts } from '../modules/identity/accounts/application/runtime.ts';
