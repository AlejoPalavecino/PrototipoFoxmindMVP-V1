// Public browser transport contract; importing it does not load UI or server adapters.
export { AccountError, createAccountClient, validateAccountFields } from './api/account-client.ts';
export type { AccountSession, AccountUser } from './api/account-client.ts';
