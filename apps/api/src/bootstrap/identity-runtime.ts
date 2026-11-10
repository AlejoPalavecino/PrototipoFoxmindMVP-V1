import { randomUUID } from 'node:crypto';
import { IdentityRuntime as ApplicationRuntime, type IdentityRuntimePorts } from '../modules/identity/application/runtime.ts';
import { IdentityMailLifecycle } from '../modules/identity/infrastructure/mail-lifecycle.ts';
import { createIdentityStoreAdapter } from '../modules/identity/infrastructure/store-adapter.ts';
import type { IdentityStore } from '../modules/identity/infrastructure/persistence.ts';
import type { IdentityRuntimeConfiguration } from '../modules/identity/infrastructure/configuration.ts';
import { enqueueAccountMail, cancelAccountMailForToken } from '../modules/identity/infrastructure/outbox/repository.ts';
import { generateVerifier, sessionTokenDigest, accountTokenDigest } from '../modules/identity/infrastructure/security/verifiers.ts';
import type { PasswordService } from '../modules/identity/infrastructure/security/passwords.ts';
import { validateMailbox } from '../modules/identity/infrastructure/mail/mailbox.ts';

/** Compatibility constructor and explicit host composition; all account decisions live in application. */
export class IdentityRuntime extends ApplicationRuntime {
  constructor(readonly configuration: IdentityRuntimeConfiguration, store: IdentityStore,
    passwords: PasswordService, ports: IdentityRuntimePorts = {}) {
    const adapter = createIdentityStoreAdapter(store);
    super(configuration, adapter.store, passwords, {
      tokens: { randomUUID, generateVerifier, sessionTokenDigest, accountTokenDigest },
      validateMailbox,
      mail: new IdentityMailLifecycle(configuration, store),
      mailOutbox: {
        async enqueue(tx, input) { await enqueueAccountMail(adapter.transactionOf(tx), configuration.outbox, input); },
        async cancel(tx, tokenId) { await cancelAccountMailForToken(adapter.transactionOf(tx), tokenId); },
      },
    }, ports);
  }
}
export { publicUser, type IdentityRuntimePorts } from '../modules/identity/application/runtime.ts';
