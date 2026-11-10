import type { Transaction } from './contracts.ts';
const transactionModes = new WeakMap<Transaction, 'read' | 'write'>();
export function registerTransactionMode(tx: Transaction, write: boolean) {
  transactionModes.set(tx, write ? 'write' : 'read');
}
export function isVerifiedRead(tx: Transaction) {
  return transactionModes.get(tx) === 'read';
}
