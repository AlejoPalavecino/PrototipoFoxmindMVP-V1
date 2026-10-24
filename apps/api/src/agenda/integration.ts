// Public composition facade. Importing the application API does not load identity/Prisma infrastructure.
export { createAgendaAuthentication, installAgendaTransport } from './host.ts';
