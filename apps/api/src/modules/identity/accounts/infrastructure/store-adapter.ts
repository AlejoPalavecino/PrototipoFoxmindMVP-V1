import type { IdentityStorePort, IdentityTransactionPort } from '../application/ports.ts';
import type { IdentityStore, IdentityTransaction } from './persistence.ts';

/** Retains the exact caller-owned transaction while exposing only identity operations to use cases. */
export function createIdentityStoreAdapter(store: IdentityStore) {
  const transactions = new WeakMap<IdentityTransactionPort, IdentityTransaction>();
  function transactionOf(port: IdentityTransactionPort): IdentityTransaction {
    const tx = transactions.get(port);
    if (!tx) throw new Error('Identity transaction unavailable.');
    return tx;
  }
  const application: IdentityStorePort = {
    transaction: run => store.transaction(tx => {
      const port: IdentityTransactionPort = { user: tx.user, session: tx.session, accountToken: tx.accountToken };
      transactions.set(port, tx);
      return run(port);
    }),
    now: tx => store.now(transactionOf(tx)),
    canonicalEmail: email => store.canonicalEmail(email),
    findUser: canonical => store.findUser(canonical),
    lockUsers: (tx, ids) => store.lockUsers(transactionOf(tx), ids),
    authenticate: verifier => store.authenticate(verifier),
    activeInTransaction: (tx, context) => store.activeInTransaction(transactionOf(tx), context),
    admit: (config, buckets) => store.admit(config, buckets),
    insertRegistration: (tx, input) => store.insertRegistration(transactionOf(tx), input),
    consumeToken: (tx, snapshot, digest, purpose) => store.consumeToken(transactionOf(tx), snapshot, digest, purpose),
    recoveryMarker: (tx, id, action, key) => store.recoveryMarker(transactionOf(tx), id, action, key),
    acceptRecovery: (tx, now, action, key) => store.acceptRecovery(transactionOf(tx), now, action, key),
  };
  return { store: application, transactionOf };
}
